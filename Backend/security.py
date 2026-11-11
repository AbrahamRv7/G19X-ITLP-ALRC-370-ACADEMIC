import logging
import os
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jwt.exceptions import PyJWTError as JWTError
import bcrypt

import database
import models
import jwt

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("ERROR CRÍTICO: La variable de entorno SECRET_KEY no está configurada.")

logger = logging.getLogger(__name__)

# Aviso (no bloquea el arranque) si la clave es corta o parece un valor de ejemplo del repositorio.
_PREFIJOS_DE_EJEMPLO = ("tu_clave", "cambia_esta", "escribe_aqui", "reemplazar", "clave_secre")
if len(SECRET_KEY) < 32 or SECRET_KEY.lower().startswith(_PREFIJOS_DE_EJEMPLO):
    logger.warning(
        "SECRET_KEY es corta o parece un valor de ejemplo. Genera una con: "
        "python -c \"import secrets; print(secrets.token_hex(32))\""
    )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


# --- COMPATIBILIDAD CON BCRYPT DIRECTO (Elimina errores de passlib) ---
class NativeBcryptContext:
    def verify(self, plain_password: str, hashed_password: str) -> bool:
        try:
            # Bcrypt tiene un límite estricto de 72 bytes en contraseñas
            pwd_bytes = plain_password.encode('utf-8')[:72]
            hash_bytes = hashed_password.encode('utf-8')
            return bcrypt.checkpw(pwd_bytes, hash_bytes)
        except Exception:
            return False

    def hash(self, password: str) -> str:
        pwd_bytes = password.encode('utf-8')[:72]
        hashed = bcrypt.hashpw(pwd_bytes, bcrypt.gensalt())
        return hashed.decode('utf-8')


# Instancia compatible que mantiene exactamente la misma interfaz (.verify y .hash)
pwd_context = NativeBcryptContext()


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(database.get_db)
) -> models.Usuario:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales de autenticación no válidas o expiradas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    usuario = db.query(models.Usuario).filter(models.Usuario.email == email).first()
    if usuario is None or not usuario.esta_activo:
        raise credentials_exception
    return usuario


def require_admin(current_user: models.Usuario = Depends(get_current_user)) -> models.Usuario:
    rol_actual = current_user.rol.value if hasattr(current_user.rol, "value") else str(current_user.rol)
    if rol_actual != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permisos insuficientes: esta acción requiere rol de Administrador (admin).",
        )
    return current_user