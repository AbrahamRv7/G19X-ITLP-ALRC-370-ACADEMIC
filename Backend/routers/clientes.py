from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import database
import models
from schemas import ClienteResponse, ClienteCreate, ExpedienteResponse, ExpedienteCreate
from security import get_current_user, require_admin

router = APIRouter()


@router.post("/clientes/", response_model=ClienteResponse, tags=["3. Clientes"])
def crear_cliente(
    cliente: ClienteCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    nuevo_cliente = models.Cliente(**cliente.model_dump())
    db.add(nuevo_cliente)
    try:
        db.commit()
        db.refresh(nuevo_cliente)
        return nuevo_cliente
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Error al crear el cliente. Revisa si el RFC o correo ya existen.")


@router.get("/clientes/", response_model=List[ClienteResponse], tags=["3. Clientes"])
def obtener_clientes(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    return db.query(models.Cliente).offset(skip).limit(limit).all()


@router.delete("/clientes/{cliente_id}", tags=["3. Clientes"])
def eliminar_cliente(
    cliente_id: int,
    db: Session = Depends(database.get_db),
    current_admin: models.Usuario = Depends(require_admin),
):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    db.query(models.Contrato).filter(models.Contrato.cliente_id == cliente_id).update({"cliente_id": None})
    db.query(models.Litigio).filter(models.Litigio.cliente_id == cliente_id).update({"cliente_id": None})
    db.query(models.Expediente).filter(models.Expediente.cliente_id == cliente_id).delete()

    db.delete(cliente)
    db.commit()
    return {"mensaje": "Cliente eliminado correctamente"}


@router.post("/expedientes/", response_model=ExpedienteResponse, tags=["3. Expedientes"])
def crear_expediente(
    expediente: ExpedienteCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == expediente.cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="El cliente especificado no existe")

    abogado = db.query(models.Usuario).filter(models.Usuario.id == expediente.abogado_id).first()
    if not abogado:
        raise HTTPException(status_code=404, detail="El abogado especificado no existe")

    nuevo_expediente = models.Expediente(**expediente.model_dump())
    db.add(nuevo_expediente)
    try:
        db.commit()
        db.refresh(nuevo_expediente)
        return nuevo_expediente
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Error al crear el expediente. ¿El número ya está en uso?")


@router.get("/expedientes/", response_model=List[ExpedienteResponse], tags=["3. Expedientes"])
def obtener_expedientes(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    return db.query(models.Expediente).offset(skip).limit(limit).all()


@router.delete("/expedientes/{expediente_id}", tags=["3. Expedientes"])
def eliminar_expediente(
    expediente_id: int,
    db: Session = Depends(database.get_db),
    current_admin: models.Usuario = Depends(require_admin),
):
    expediente = db.query(models.Expediente).filter(models.Expediente.id == expediente_id).first()
    if not expediente:
        raise HTTPException(status_code=404, detail="Expediente no encontrado")
    db.delete(expediente)
    db.commit()
    return {"mensaje": "Expediente eliminado correctamente"}