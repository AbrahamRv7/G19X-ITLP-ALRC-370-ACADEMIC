from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import database
import models
import schemas
from security import get_current_user, require_admin

router = APIRouter(prefix="/contratos", tags=["4. Contratos"])


@router.post("")
def crear_contrato(
    contrato: schemas.ContratoCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    datos = contrato.model_dump()
    columnas_validas = {c.name for c in models.Contrato.__table__.columns}
    datos_filtrados = {k: v for k, v in datos.items() if k in columnas_validas}
    if not datos_filtrados.get("usuario_responsable_id"):
        datos_filtrados["usuario_responsable_id"] = current_user.id

    nuevo_contrato = models.Contrato(**datos_filtrados)
    db.add(nuevo_contrato)
    try:
        db.commit()
        db.refresh(nuevo_contrato)
        return nuevo_contrato
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error al crear el contrato: {str(e)}")


@router.get("")
def obtener_contratos(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    return db.query(models.Contrato).all()


@router.put("/{contrato_id}")
def actualizar_contrato(
    contrato_id: int,
    datos: schemas.ContratoCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    contrato = db.query(models.Contrato).filter(models.Contrato.id == contrato_id).first()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")

    campos = datos.model_dump(exclude_unset=True)
    columnas_validas = {c.name for c in models.Contrato.__table__.columns}
    for clave, valor in campos.items():
        if clave in columnas_validas and clave != "id":
            setattr(contrato, clave, valor)

    db.commit()
    db.refresh(contrato)
    return contrato


@router.put("/{contrato_id}/estatus")
def actualizar_estatus_contrato(
    contrato_id: int,
    datos: schemas.ContratoEstatusUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    contrato = db.query(models.Contrato).filter(models.Contrato.id == contrato_id).first()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")
    contrato.estatus = datos.estatus
    db.commit()
    db.refresh(contrato)
    return contrato


@router.delete("/{contrato_id}")
def eliminar_contrato(
    contrato_id: int,
    db: Session = Depends(database.get_db),
    current_admin: models.Usuario = Depends(require_admin),
):
    contrato = db.query(models.Contrato).filter(models.Contrato.id == contrato_id).first()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")
    db.delete(contrato)
    db.commit()
    return {"mensaje": "Contrato eliminado correctamente"}