from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import database
import models
import schemas
from schemas import ClienteResponse, ClienteCreate
from security import get_current_user, require_admin

router = APIRouter()

@router.post("/", response_model=schemas.ClienteResponse, tags=["3. Clientes"])
def crear_cliente(
    cliente: schemas.ClienteCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    # 🛡️ Control de Acceso Basado en Roles (RBAC)
    if current_user.rol == models.RolUsuario.viewer:
        raise HTTPException(status_code=403, detail="Acceso denegado. Los usuarios de solo lectura no pueden crear clientes.")

    nuevo_cliente = models.Cliente(**cliente.model_dump())
    db.add(nuevo_cliente)
    try:
        db.commit()
        db.refresh(nuevo_cliente)
        return nuevo_cliente
    except Exception as e:
        db.rollback()
        print(f"Error interno al crear cliente: {e}")
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

    # Desvinculamos contratos y litigios para no perder el historial, pero sin romper la integridad referencial
    db.query(models.Contrato).filter(models.Contrato.cliente_id == cliente_id).update({"cliente_id": None})
    db.query(models.Litigio).filter(models.Litigio.cliente_id == cliente_id).update({"cliente_id": None})

    db.delete(cliente)
    db.commit()
    return {"mensaje": "Cliente eliminado correctamente"}