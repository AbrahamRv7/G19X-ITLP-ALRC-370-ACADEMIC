from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import database
import models
import schemas
from security import get_current_user, require_admin

router = APIRouter(prefix="/contratos", tags=["4. Contratos"])


@router.post("", response_model=schemas.ContratoResponse, tags=["4. Contratos"])
def crear_contrato(
    contrato: schemas.ContratoCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    # 🛡️ Validación RBAC: Bloquear a visores
    if current_user.rol == models.RolUsuario.viewer:
        raise HTTPException(status_code=403, detail="Acceso denegado. Los usuarios de solo lectura no pueden crear contratos.")

    nuevo_contrato = models.Contrato(**contrato.model_dump())
    db.add(nuevo_contrato)
    try:
        db.commit()
        db.refresh(nuevo_contrato)
        return nuevo_contrato
    except Exception as e:
        db.rollback()
        print(f"Error interno al crear contrato: {e}")
        raise HTTPException(status_code=400, detail="Error al crear el contrato.")


@router.get("", response_model=list[schemas.ContratoResponse])
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
    # 🛡️ Validación RBAC: Bloquear a visores en edición
    if current_user.rol == models.RolUsuario.viewer:
        raise HTTPException(status_code=403, detail="Acceso denegado. Los usuarios de solo lectura no pueden actualizar contratos.")

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
    # 🛡️ Validación RBAC: Bloquear a visores en estatus
    if current_user.rol == models.RolUsuario.viewer:
        raise HTTPException(status_code=403, detail="Acceso denegado. Los usuarios de solo lectura no pueden modificar estatus.")

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