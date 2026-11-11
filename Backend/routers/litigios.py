import unicodedata
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import database
import models
import schemas
from security import get_current_user, require_admin

router = APIRouter(prefix="/litigios", tags=["5. Litigios"])


def _valor(dato, defecto: str = "") -> str:
    """Devuelve el texto de un Enum (o de un str). Evita que los f-strings impriman 'MateriaLitigio.laboral'."""
    if dato is None:
        return defecto
    return dato.value if hasattr(dato, "value") else str(dato)


def _sin_acentos(texto: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn")


@router.post("", response_model=schemas.LitigioResponse)
def crear_litigio(
    litigio: schemas.LitigioCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    # 🛡️ Validación RBAC: Bloquear a visores
    if current_user.rol == models.RolUsuario.viewer:
        raise HTTPException(status_code=403, detail="Acceso denegado. Los usuarios de solo lectura no pueden crear litigios.")

    datos_litigio = litigio.model_dump()

    if datos_litigio["monto_contingencia"] < 0:
        raise HTTPException(status_code=400, detail="El monto de contingencia no puede ser negativo.")

    existente = db.query(models.Litigio).filter(models.Litigio.expediente == datos_litigio["expediente"]).first()
    if existente:
        raise HTTPException(status_code=400, detail="Ya existe un litigio con ese número de expediente.")

    # Si no se indica responsable, se asigna al usuario que registra el litigio
    if datos_litigio.get("usuario_responsable_id") is None:
        datos_litigio["usuario_responsable_id"] = current_user.id

    nuevo_litigio = models.Litigio(**datos_litigio)
    db.add(nuevo_litigio)
    try:
        db.commit()
        db.refresh(nuevo_litigio)
        return nuevo_litigio
    except Exception as e:
        db.rollback()
        print(f"Error interno al crear litigio: {e}")
        raise HTTPException(status_code=400, detail="Error al crear el litigio. Verifica que el cliente exista.")

@router.get("", response_model=List[schemas.LitigioResponse])
def obtener_litigios(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    return db.query(models.Litigio).all()

@router.put("/{litigio_id}/fase")
def actualizar_fase_litigio(
    litigio_id: int,
    datos: schemas.LitigioFaseUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    # 🛡️ Validación RBAC: Bloquear a visores en edición
    if current_user.rol == models.RolUsuario.viewer:
        raise HTTPException(status_code=403, detail="Acceso denegado. Los usuarios de solo lectura no pueden actualizar fases.")

    litigio = db.query(models.Litigio).filter(models.Litigio.id == litigio_id).first()
    if not litigio:
        raise HTTPException(status_code=404, detail="Litigio no encontrado")

    fase_anterior = litigio.fase_procesal
    litigio.fase_procesal = datos.fase_procesal

    nuevo_historial = models.HistorialLitigio(
        litigio_id=litigio.id,
        fase_anterior=fase_anterior,
        fase_nueva=datos.fase_procesal,
        comentarios=datos.comentarios,
        usuario_modificador_id=current_user.id
    )
    db.add(nuevo_historial)
    db.commit()
    db.refresh(litigio)
    return litigio

@router.get("/{litigio_id}/historial")
def obtener_historial_litigio(
    litigio_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    if not db.query(models.Litigio.id).filter(models.Litigio.id == litigio_id).first():
        raise HTTPException(status_code=404, detail="Litigio no encontrado")
    return db.query(models.HistorialLitigio).filter(models.HistorialLitigio.litigio_id == litigio_id).all()

@router.delete("/{litigio_id}")
def eliminar_litigio(
    litigio_id: int,
    db: Session = Depends(database.get_db),
    current_admin: models.Usuario = Depends(require_admin),
):
    litigio = db.query(models.Litigio).filter(models.Litigio.id == litigio_id).first()
    if not litigio:
        raise HTTPException(status_code=404, detail="Litigio no encontrado")
    db.delete(litigio)
    db.commit()
    return {"mensaje": "Litigio eliminado correctamente"}

# Endpoint del motor de reglas
@router.get("/{litigio_id}/analizar")
def analizar_litigio(
    litigio_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    litigio = db.query(models.Litigio).filter(models.Litigio.id == litigio_id).first()
    if not litigio:
        raise HTTPException(status_code=404, detail="Litigio no encontrado")

    # Lógica de reglas simple
    monto = litigio.monto_contingencia or 0
    analisis = f"Análisis de reglas para expediente {litigio.expediente}:\n"
    if monto > 100000:
        analisis += "- Riesgo Económico ALTO.\n"
    if "sentencia" in (litigio.fase_procesal or "").lower():
        analisis += "- Fase crítica alcanzada."
    else:
        analisis += "- En fase de desahogo."

    return {"analisis": analisis}

# Endpoint de Chat Interactivo (Motor de Reglas y Recomendaciones)
@router.post("/{litigio_id}/chat")
def chat_litigio(
    litigio_id: int,
    consulta: schemas.ChatConsulta,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    litigio = db.query(models.Litigio).filter(models.Litigio.id == litigio_id).first()
    if not litigio:
        raise HTTPException(status_code=404, detail="Litigio no encontrado")

    # Se comparan las palabras clave sin acentos ("¿Qué sigue?" == "que sigue")
    texto = _sin_acentos(consulta.texto).lower().strip()

    materia = _valor(litigio.materia)
    probabilidad = _valor(litigio.probabilidad_exito)
    monto = litigio.monto_contingencia or 0
    fase_procesal = litigio.fase_procesal or ""

    # 1. SALUDO
    if any(palabra in texto for palabra in ["hola", "buenos dias", "buenas tardes", "saludos", "que tal"]):
        return {
            "respuesta": (
                f"👋 ¡Hola, {current_user.nombre}! Soy el Asistente Experto de PluriOne.\n\n"
                f"Estoy listo para analizar el expediente **{litigio.expediente}** ({materia}). "
                "¿En qué puedo apoyarte hoy? Puedes pedirme una *recomendación*, preguntarme sobre el *tiempo* estimado, el *riesgo* o pedir *ayuda* para ver qué puedo hacer."
            )
        }

    # 2. AYUDA / QUÉ PUEDES RESPONDER
    elif any(palabra in texto for palabra in ["ayuda", "que puedes", "que haces", "funciones", "como funcionas", "que responder"]):
        return {
            "respuesta": (
                "🤖 Como sistema experto, analizo los datos de este expediente para darte diagnósticos y estrategias. Puedes preguntarme:\n\n"
                "🔹 **'Dame una recomendación'** - Sugerencias estratégicas del caso.\n"
                "🔹 **'¿Cuál es el riesgo?'** - Análisis del impacto financiero y probabilidad.\n"
                "🔹 **'¿Cuánto tiempo se llevará?'** - Estimación de plazos según la fase.\n"
                "🔹 **'¿Qué sigue?'** - Próximos pasos procesales para la fase actual.\n"
                "🔹 **'Resumen'** - Estado actual del juicio."
            )
        }

    # 3. RECOMENDACIÓN / CONSEJO / QUÉ HAGO
    elif any(palabra in texto for palabra in ["recomen", "consejo", "que hago", "estrategia", "sugerencia"]):
        recomendaciones = []
        prob = probabilidad.lower()
        fase = fase_procesal.lower()

        if "baja" in prob:
            recomendaciones.append("🚨 **Alerta de viabilidad**: La probabilidad de éxito es BAJA. Se sugiere evaluar urgentemente una estrategia de negociación o un convenio fuera de juicio para mitigar pérdidas.")
        elif "media" in prob:
            recomendaciones.append("⚠️ **Estrategia equilibrada**: El caso tiene un panorama incierto. Conviene robustecer el desahogo de pruebas y preparar alternativas de conciliación.")
        elif "alta" in prob:
            recomendaciones.append("✅ **Estrategia sólida**: La probabilidad de éxito es ALTA. Mantengan el rigor procesal para consolidar la resolución favorable.")
        else:
            recomendaciones.append("ℹ️ **Probabilidad no asignada**: Aún no se ha evaluado la probabilidad de éxito de este caso. Conviene definirla para afinar la estrategia.")

        if monto >= 1000000:
            recomendaciones.append(f"💸 **Impacto Financiero Crítico**: Al superar el millón de pesos (${monto:,.2f}), se recomienda crear una provisión contable de contingencia para este caso.")

        if "demanda" in fase:
            recomendaciones.append("📂 **Acción en fase inicial**: Aseguren que el traslado y emplazamiento se hayan realizado con estricto apego a la ley para evitar vicios en el procedimiento.")
        elif "pruebas" in fase or "probatoria" in fase or "desahogo" in fase:
            recomendaciones.append("🔎 **Acción en fase de pruebas**: Prioricen la preparación de peritajes y testimoniales clave. No dejen pasar los plazos de objeción.")
        elif "sentencia" in fase or "alegatos" in fase:
            recomendaciones.append("⚖️ **Acción en fase resolutiva**: Se han cerrado las etapas de debate. Monitoreen el juzgado diariamente para reaccionar de inmediato a la notificación de la sentencia y preparar posibles recursos (amparo/apelación).")

        if materia.lower() == "laboral":
            recomendaciones.append("👥 **Nota laboral**: Recuerda que en esta materia la carga de la prueba suele ser del patrón. Aseguren tener expedientes de personal completos.")
        elif materia.lower() == "mercantil":
            recomendaciones.append("💼 **Nota mercantil**: Evalúen si es viable solicitar medidas cautelares o embargos preventivos para garantizar el pago del adeudo.")

        respuesta_final = "💡 **Análisis Recomendado** para este caso:\n\n" + "\n\n".join(recomendaciones)
        return {"respuesta": respuesta_final}

    # 4. RIESGO / DINERO / MONTO / PEOR ESCENARIO
    elif any(palabra in texto for palabra in ["riesgo", "monto", "dinero", "perder", "contingencia", "cuanto es", "peor escenario"]):
        impacto = "Crítico" if monto >= 1000000 else "Moderado" if monto >= 100000 else "Bajo"
        return {
            "respuesta": (
                f"💰 **Análisis de Riesgo Financiero:**\n\n"
                f"• **Monto en Contingencia:** ${monto:,.2f} MXN\n"
                f"• **Probabilidad de Éxito:** {probabilidad or 'No asignada'}\n"
                f"• **Nivel de Impacto:** **{impacto}**\n\n"
                "Para proteger las finanzas corporativas, se aconseja " +
                ("la autorización de reservas financieras de contingencia de inmediato." if impacto == "Crítico" else "dar seguimiento preventivo sin congelar flujos.")
            )
        }

    # 5. QUÉ SIGUE / PROCESO (va antes que "tiempo": "fase siguiente" contiene la palabra "fase")
    elif any(palabra in texto for palabra in ["que sigue", "siguiente paso", "proximos pasos", "que pasa", "fase siguiente"]):
        fase = fase_procesal.lower()
        if "demanda" in fase:
            sig = "Emplazamiento y Contestación de la Demanda."
        elif "pruebas" in fase or "probatoria" in fase or "desahogo" in fase:
            sig = "Etapa de Alegatos finales y conclusiones."
        elif "sentencia" in fase:
            sig = "Ejecución de sentencia, o bien, impugnaciones (Apelación / Amparo)."
        else:
            sig = "Revisión de acuerdos previos y preparación del siguiente recurso legal."

        return {
            "respuesta": (
                f"⏭️ **Próximos Pasos Procesales:**\n\n"
                f"El caso está en **{fase_procesal}**.\n"
                f"• El siguiente paso natural es: **{sig}**\n"
                f"• Asegúrate de validar que no haya promociones pendientes de acordar en el juzgado."
            )
        }

    # 6. TIEMPO / PLAZOS / CUANDO / CUÁNTO
    elif any(palabra in texto for palabra in ["tiempo", "plazo", "cuando", "cuanto", "duracion", "fase"]):
        dias_estimados = "60 a 90 días" if materia.lower() == "laboral" else "90 a 120 días" if materia.lower() == "civil" else "45 a 90 días"
        return {
            "respuesta": (
                f"⏱️ **Estimaciones de Tiempo (Fase: {fase_procesal}):**\n\n"
                f"• Como estimación orientativa (no sustituye el criterio del abogado), un litigio **{materia}** en esta etapa suele requerir un promedio de **{dias_estimados}** hábiles para avanzar.\n"
                f"• **Nota:** Para ver los tiempos reales exactos de tu despacho, consulta la gráfica de promedios en el Dashboard."
            )
        }

    # 7. RESUMEN / ESTADO
    elif any(palabra in texto for palabra in ["resumen", "detalles", "expediente", "caso", "estado"]):
        return {
            "respuesta": (
                f"📋 **Resumen del Expediente {litigio.expediente}**:\n\n"
                f"• **Materia:** {materia}\n"
                f"• **Contraparte:** {litigio.contraparte or 'No registrada'}\n"
                f"• **Juzgado:** {litigio.juzgado or 'No registrado'}\n"
                f"• **Fase Actual:** {fase_procesal}\n"
                f"• **Monto en Contingencia:** ${monto:,.2f} MXN\n"
                f"• **Probabilidad de Éxito:** {probabilidad or 'No definida'}"
            )
        }

    # 8. RESPUESTA POR DEFECTO INTELIGENTE
    return {
        "respuesta": (
            "🤔 No logré identificar una consulta de mi especialidad en el texto. "
            "¿Te gustaría que analice alguna de las siguientes opciones para este caso?\n\n"
            "💬 Intenta preguntarme:\n"
            "• *'Dame una recomendación sobre el juicio'*\n"
            "• *'¿Qué riesgo financiero representa?'*\n"
            "• *'¿Cuánto tiempo tardará en resolverse?'*\n"
            "• *'¿Qué sigue en este proceso?'*"
        )
    }
