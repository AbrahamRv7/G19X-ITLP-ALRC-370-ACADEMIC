from typing import List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

import database
import models
import schemas
from security import pwd_context, create_access_token, get_current_user, require_admin

router = APIRouter()


@router.post("/login", tags=["1. Autenticación"])
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    termino = form_data.username.strip().lower()
    usuario = db.query(models.Usuario).filter(
        or_(
            func.lower(models.Usuario.email) == termino,
            func.lower(models.Usuario.nombre) == termino,
        )
    ).first()

    if not usuario or not pwd_context.verify(form_data.password, usuario.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas.")

    rol_valor = usuario.rol.value if hasattr(usuario.rol, "value") else str(usuario.rol)
    access_token = create_access_token(data={"sub": usuario.email, "rol": rol_valor})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "usuario": {"id": usuario.id, "nombre": usuario.nombre, "email": usuario.email, "rol": rol_valor},
    }


@router.post("/usuarios", tags=["2. Gestión de Usuarios"])
def crear_usuario(
    usuario: schemas.UsuarioCreate,
    db: Session = Depends(database.get_db),
    current_admin: models.Usuario = Depends(require_admin),
):
    existe = db.query(models.Usuario).filter(models.Usuario.email == usuario.email).first()
    if existe:
        raise HTTPException(status_code=400, detail="Este correo ya está registrado en el sistema")

    nuevo_usuario = models.Usuario(
        nombre=usuario.nombre,
        email=usuario.email,
        password_hash=pwd_context.hash(usuario.password),
        rol=usuario.rol,
        esta_activo=True,
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    return {"mensaje": "Usuario creado exitosamente", "correo": nuevo_usuario.email, "rol": nuevo_usuario.rol}


@router.get("/usuarios", response_model=List[schemas.UsuarioResponse], tags=["2. Gestión de Usuarios"])
def obtener_usuarios(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    return db.query(models.Usuario).all()