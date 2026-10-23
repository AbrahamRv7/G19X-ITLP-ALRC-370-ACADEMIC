from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

import database
import models
import schemas
from security import get_current_user, require_admin

router = APIRouter(prefix="/litigios", tags=["5. Litigios"])

@router.post("", response_model=schemas.LitigioResponse)
def crear_litigio(
    litigio: schemas.LitigioCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    # 🛡️ Validación RBAC: Bloquear a visores
    if current_user.rol == models.RolUsuario.viewer:
        raise HTTPException(status_code=403, detail="Acceso denegado. Los usuarios de solo lectura no pueden crear litigios.")

    nuevo_litigio = models.Litigio(**litigio.model_dump())
    db.add(nuevo_litigio)
    try:
        db.commit()
        db.refresh(nuevo_litigio)
        return nuevo_litigio
    except Exception as e:
        db.rollback()
        print(f"Error interno al crear litigio: {e}")
        raise HTTPException(status_code=400, detail="Error al crear el litigio. ¿El número de expediente ya existe?")
    
@router.get("", response_model=List[schemas.LitigioResponse])
def obtener_litigios(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    return db.query(models.Litigio).all()

# Se unificaron las rutas: PUT /fase ahora actualiza y crea el historial
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
    analisis = f"Análisis de reglas para expediente {litigio.expediente}:\n"
    if litigio.monto_contingencia > 100000:
        analisis += "- Riesgo Económico ALTO.\n"
    if "Sentencia" in litigio.fase_procesal:
        analisis += "- Fase crítica alcanzada."
    else:
        analisis += "- En fase de desahogo."
        
    return {"analisis": analisis}

# Endpoint de Chat Interactivo (Motor de Reglas y Recomendaciones)
@router.post("/{litigio_id}/chat")
def chat_litigio(
    litigio_id: int,
    consulta: dict,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    litigio = db.query(models.Litigio).filter(models.Litigio.id == litigio_id).first()
    if not litigio:
        raise HTTPException(status_code=404, detail="Litigio no encontrado")

    texto = consulta.get("texto", "").lower().strip()
    
    # 1. SALUDO
    if any(palabra in texto for palabra in ["hola", "buenos dias", "buenas tardes", "saludos", "que tal"]):
        return {
            "respuesta": (
                f"👋 ¡Hola, {current_user.nombre}! Soy el Asistente Experto de PluriOne.\n\n"
                f"Estoy listo para analizar el expediente **{litigio.expediente}** ({litigio.materia}). "
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
        
        if "baja" in (litigio.probabilidad_exito or "").lower():
            recomendaciones.append("🚨 **Alerta de viabilidad**: La probabilidad de éxito es BAJA. Se sugiere evaluar urgentemente una estrategia de negociación o un convenio fuera de juicio para mitigar pérdidas.")
        elif "media" in (litigio.probabilidad_exito or "").lower():
            recomendaciones.append("⚠️ **Estrategia equilibrada**: El caso tiene un panorama incierto. Conviene robustecer el desahogo de pruebas y preparar alternativas de conciliación.")
        else:
            recomendaciones.append("✅ **Estrategia sólida**: La probabilidad de éxito es ALTA. Mantengan el rigor procesal para consolidar la resolución favorable.")

        if litigio.monto_contingencia >= 1000000:
            recomendaciones.append(f"💸 **Impacto Financiero Crítico**: Al superar el millón de pesos (${litigio.monto_contingencia:,.2f}), se recomienda crear una provisión contable de contingencia para este caso.")
        
        if "demanda" in litigio.fase_procesal.lower():
            recomendaciones.append("📂 **Acción en fase inicial**: Aseguren que el traslado y emplazamiento se hayan realizado con estricto apego a la ley para evitar vicios en el procedimiento.")
        elif "pruebas" in litigio.fase_procesal.lower() or "desahogo" in litigio.fase_procesal.lower():
            recomendaciones.append("🔎 **Acción en fase de pruebas**: Prioricen la preparación de peritajes y testimoniales clave. No dejen pasar los plazos de objeción.")
        elif "sentencia" in litigio.fase_procesal.lower() or "alegatos" in litigio.fase_procesal.lower():
            recomendaciones.append("⚖️ **Acción en fase resolutiva**: Se han cerrado las etapas de debate. Monitoreen el juzgado diariamente para reaccionar de inmediato a la notificación de la sentencia y preparar posibles recursos (amparo/apelación).")

        if litigio.materia.lower() == "laboral":
            recomendaciones.append("👥 **Nota laboral**: Recuerda que en esta materia la carga de la prueba suele ser del patrón. Aseguren tener expedientes de personal completos.")
        elif litigio.materia.lower() == "mercantil":
            recomendaciones.append("💼 **Nota mercantil**: Evalúen si es viable solicitar medidas cautelares o embargos preventivos para garantizar el pago del adeudo.")

        respuesta_final = "💡 **Análisis Recomendado** para este caso:\n\n" + "\n\n".join(recomendaciones)
        return {"respuesta": respuesta_final}

    # 4. RIESGO / DINERO / MONTO
    elif any(palabra in texto for palabra in ["riesgo", "monto", "dinero", "perder", "contingencia", "cuanto es"]):
        impacto = "Crítico" if litigio.monto_contingencia >= 1000000 else "Moderado" if litigio.monto_contingencia >= 100000 else "Bajo"
        return {
            "respuesta": (
                f"💰 **Análisis de Riesgo Financiero:**\n\n"
                f"• **Monto en Contingencia:** ${litigio.monto_contingencia:,.2f} MXN\n"
                f"• **Probabilidad de Éxito:** {litigio.probabilidad_exito or 'No asignada'}\n"
                f"• **Nivel de Impacto:** **{impacto}**\n\n"
                "Para proteger las finanzas corporativas, se aconseja " + 
                ("la autorización de reservas financieras de contingencia de inmediato." if impacto == "Crítico" else "dar seguimiento preventivo sin congelar flujos.")
            )
        }

   # 5. TIEMPO / PLAZOS / CUANDO / CUÁNTO
    elif any(palabra in texto for palabra in ["tiempo", "plazo", "cuando", "cuanto", "duracion", "fase"]):
        dias_estimados = "60 a 90 días" if litigio.materia.lower() == "laboral" else "90 a 120 días" if litigio.materia.lower() == "civil" else "45 a 90 días"
        return {
            "respuesta": (
                f"⏱️ **Estimaciones de Tiempo (Fase: {litigio.fase_procesal}):**\n\n"
                f"• Como estimación de referencia basada en la ley, un litigio **{litigio.materia}** en esta etapa suele requerir un promedio de **{dias_estimados}** hábiles para avanzar.\n"
                f"• **Nota:** Para ver los tiempos reales exactos de tu despacho, consulta la gráfica de promedios en el Dashboard."
            )
        }

    # 6. QUÉ SIGUE / PROCESO
    elif any(palabra in texto for palabra in ["que sigue", "proximos pasos", "que pasa", "fase siguiente"]):
        fase = litigio.fase_procesal.lower()
        if "demanda" in fase:
            sig = "Emplazamiento y Contestación de la Demanda."
        elif "pruebas" in fase or "desahogo" in fase:
            sig = "Etapa de Alegatos finales y conclusiones."
        elif "sentencia" in fase:
            sig = "Ejecución de sentencia, o bien, impugnaciones (Apelación / Amparo)."
        else:
            sig = "Revisión de acuerdos previos y preparación del siguiente recurso legal."
            
        return {
            "respuesta": (
                f"⏭️ **Próximos Pasos Procesales:**\n\n"
                f"El caso está en **{litigio.fase_procesal}**.\n"
                f"• El siguiente paso natural es: **{sig}**\n"
                f"• Asegúrate de validar que no haya promociones pendientes de acordar en el juzgado."
            )
        }

    # 7. RESUMEN / ESTADO
    elif any(palabra in texto for palabra in ["resumen", "detalles", "expediente", "caso", "estado"]):
        return {
            "respuesta": (
                f"📋 **Resumen del Expediente {litigio.expediente}**:\n\n"
                f"• **Materia:** {litigio.materia}\n"
                f"• **Contraparte:** {litigio.contraparte or 'No registrada'}\n"
                f"• **Juzgado:** {litigio.juzgado or 'No registrado'}\n"
                f"• **Fase Actual:** {litigio.fase_procesal}\n"
                f"• **Monto en Contingencia:** ${litigio.monto_contingencia:,.2f} MXN\n"
                f"• **Probabilidad de Éxito:** {litigio.probabilidad_exito or 'No definida'}"
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