from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

import database
import models
import schemas
from security import get_current_user, require_admin

router = APIRouter(prefix="/litigios", tags=["5. Litigios"])

@router.post("")
def crear_litigio(
    litigio: schemas.LitigioCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    datos = litigio.model_dump(exclude={"contraparte", "juzgado", "probabilidad_exito"})
    
    if not datos.get("usuario_responsable_id"):
        datos["usuario_responsable_id"] = current_user.id
        
    try:
        nuevo_litigio = models.Litigio(**datos)
        db.add(nuevo_litigio)
        db.commit()
        db.refresh(nuevo_litigio)
        return nuevo_litigio
    except Exception as e:
        db.rollback()
        # TEMPORALMENTE para ver qué nos dice la BD:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("")
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
    litigio = db.query(models.Litigio).filter(models.Litigio.id == litigio_id).first()
    if not litigio:
        raise HTTPException(status_code=404, detail="Litigio no encontrado")

    fase_anterior = litigio.fase_procesal
    litigio.fase_procesal = datos.fase_procesal
    
    nuevo_historial = models.HistorialLitigio(
        litigio_id=litigio.id,
        fase_anterior=fase_anterior,
        fase_nueva=datos.fase_procesal,
        comentarios=datos.comentarios
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

@router.post("/{litigio_id}/chat")
def chat_litigio(
    litigio_id: int,
    consulta: dict,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    texto = consulta.get("texto", "").lower()
    if "tiempo" in texto:
        respuesta = "El tiempo promedio en esta fase es de 30 a 60 días hábiles."
    elif "acuerdo" in texto:
        respuesta = "Es recomendable buscar conciliación para reducir la contingencia."
    else:
        respuesta = "El sistema experto ha registrado tu consulta."
    return {"respuesta": respuesta}