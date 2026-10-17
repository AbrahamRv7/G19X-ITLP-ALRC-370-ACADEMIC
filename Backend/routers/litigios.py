from typing import List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

import database
import models
import schemas
from security import get_current_user, require_admin

router = APIRouter(prefix="/litigios", tags=["5. Litigios"])


class MensajeChat(BaseModel):
    texto: str


@router.post("")
def crear_litigio(
    litigio: schemas.LitigioCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    datos = litigio.model_dump()
    columnas_validas = {c.name for c in models.Litigio.__table__.columns}
    datos_filtrados = {k: v for k, v in datos.items() if k in columnas_validas}
    if not datos_filtrados.get("usuario_responsable_id"):
        datos_filtrados["usuario_responsable_id"] = current_user.id

    nuevo_litigio = models.Litigio(**datos_filtrados)
    if nuevo_litigio.materia:
        nuevo_litigio.materia = nuevo_litigio.materia.capitalize()
    if nuevo_litigio.probabilidad_exito:
        nuevo_litigio.probabilidad_exito = nuevo_litigio.probabilidad_exito.capitalize()

    db.add(nuevo_litigio)
    try:
        db.commit()
        db.refresh(nuevo_litigio)
        return nuevo_litigio
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error al guardar el litigio: {str(e)}")


@router.get("")
def obtener_litigios(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    return db.query(models.Litigio).all()


@router.post("/{litigio_id}/historial")
def registrar_avance_litigio(
    litigio_id: int,
    historial: schemas.HistorialLitigioCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    litigio = db.query(models.Litigio).filter(models.Litigio.id == litigio_id).first()
    if not litigio:
        raise HTTPException(status_code=404, detail="Juicio no encontrado")

    nuevo_historial = models.HistorialLitigio(
        litigio_id=litigio.id,
        usuario_modificador_id=current_user.id,
        fase_anterior=litigio.fase_procesal,
        fase_nueva=historial.fase_nueva,
        comentarios=historial.comentarios,
    )
    db.add(nuevo_historial)
    litigio.fase_procesal = historial.fase_nueva
    db.commit()
    db.refresh(litigio)
    return {"mensaje": "Historial y fase procesal actualizados correctamente"}


@router.put("/{litigio_id}/fase", response_model=schemas.LitigioResponse)
def actualizar_fase_litigio(
    litigio_id: int,
    cambio: schemas.HistorialLitigioCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    litigio = db.query(models.Litigio).filter(models.Litigio.id == litigio_id).first()
    if not litigio:
        raise HTTPException(status_code=404, detail="Litigio no encontrado")

    nuevo_historial = models.HistorialLitigio(
        litigio_id=litigio.id,
        usuario_modificador_id=current_user.id,
        fase_anterior=litigio.fase_procesal,
        fase_nueva=cambio.fase_nueva,
        comentarios=cambio.comentarios,
    )
    db.add(nuevo_historial)
    litigio.fase_procesal = cambio.fase_nueva
    db.commit()
    db.refresh(litigio)
    return litigio


@router.get("/{litigio_id}/historial", response_model=List[schemas.HistorialLitigioResponse])
def obtener_historial_litigio(
    litigio_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    litigio = db.query(models.Litigio).filter(models.Litigio.id == litigio_id).first()
    if not litigio:
        raise HTTPException(status_code=404, detail="Litigio no encontrado")

    return (
        db.query(models.HistorialLitigio)
        .filter(models.HistorialLitigio.litigio_id == litigio_id)
        .order_by(models.HistorialLitigio.fecha_cambio.desc())
        .all()
    )


@router.delete("/{litigio_id}")
def eliminar_litigio(
    litigio_id: int,
    db: Session = Depends(database.get_db),
    current_admin: models.Usuario = Depends(require_admin),
):
    litigio = db.query(models.Litigio).filter(models.Litigio.id == litigio_id).first()
    if not litigio:
        raise HTTPException(status_code=404, detail="Litigio no encontrado")

    db.query(models.HistorialLitigio).filter(models.HistorialLitigio.litigio_id == litigio_id).delete()
    db.delete(litigio)
    db.commit()
    return {"mensaje": "Litigio y su bitácora eliminados correctamente"}


@router.get("/{litigio_id}/analizar", tags=["7. Motor de Reglas Jurídicas"])
def analizar_litigio_ia(
    litigio_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    litigio = db.query(models.Litigio).filter(models.Litigio.id == litigio_id).first()
    if not litigio:
        raise HTTPException(status_code=404, detail="Juicio no encontrado")

    nivel_riesgo = "ALTO" if litigio.monto_contingencia > 200000 else "MODERADO"
    analisis_generado = (
        f"⚖️ [Motor de Reglas Jurídicas PluriOne - Diagnóstico Procesal]\n\n"
        f"• Expediente: {litigio.expediente} ({litigio.materia})\n"
        f"• Fase Procesal Actual: {litigio.fase_procesal}\n"
        f"• Evaluación de Contingencia: Se detecta un nivel de riesgo {nivel_riesgo} "
        f"debido al monto involucrado de ${litigio.monto_contingencia:,.2f}.\n\n"
        f"💡 Recomendación del Sistema: Dado que la probabilidad de éxito se estima como '{litigio.probabilidad_exito}', "
        f"se aconseja reforzar de inmediato el desahogo de pruebas documentales en esta etapa para blindar la postura de la empresa."
    )
    return {"analisis": analisis_generado}


@router.post("/{litigio_id}/chat", tags=["7. Motor de Reglas Jurídicas"])
def chat_litigio_ia(
    litigio_id: int,
    mensaje: MensajeChat,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    litigio = db.query(models.Litigio).filter(models.Litigio.id == litigio_id).first()
    if not litigio:
        raise HTTPException(status_code=404, detail="Juicio no encontrado")

    pregunta = mensaje.texto.lower()
    if "peor escenario" in pregunta or "perdemos" in pregunta or "riesgo" in pregunta:
        respuesta = f"📉 Si el fallo es desfavorable en esta materia ({litigio.materia}), la empresa tendría que desembolsar el monto total de contingencia de ${litigio.monto_contingencia:,.2f}, más gastos y costas del juicio. Sugiero provisionar este monto contablemente."
    elif "acuerdo" in pregunta or "negociar" in pregunta:
        respuesta = f"🤝 Dado que nuestra probabilidad de éxito actual es '{litigio.probabilidad_exito}', buscar un acuerdo conciliatorio podría ahorrar hasta un 30% del monto total en contingencia procesal."
    elif "tiempo" in pregunta or "cuánto" in pregunta or "duración" in pregunta:
        respuesta = f"⏳ Actualmente nos encontramos en la fase de '{litigio.fase_procesal}'. Dependiendo de la carga del juzgado, esta etapa puede demorar entre 3 y 6 meses antes de pasar a la siguiente instancia judicial."
    elif "resumen" in pregunta or "director" in pregunta:
        respuesta = (
            f"📝 Resumen Ejecutivo:\n"
            f"Expediente: {litigio.expediente} ({litigio.materia}).\n"
            f"Fase Procesal: {litigio.fase_procesal}.\n"
            f"Riesgo Financiero: ${litigio.monto_contingencia:,.2f}.\n"
            f"Estatus de probabilidad: {litigio.probabilidad_exito}."
        )
    elif "documento" in pregunta or "prueba" in pregunta:
        respuesta = f"📁 Para respaldar nuestra postura en la fase actual ('{litigio.fase_procesal}'), es vital recopilar todos los contratos originales, correos electrónicos vinculantes y testimoniales antes de la audiencia."
    else:
        respuesta = f"⚖️ Evaluando expediente {litigio.expediente}... Te sugiero vigilar estrictamente los plazos de la fase actual ('{litigio.fase_procesal}') para evitar preclusiones. ¿Te gustaría explorar opciones de acuerdo o revisar el riesgo financiero?"

    return {"respuesta": respuesta}