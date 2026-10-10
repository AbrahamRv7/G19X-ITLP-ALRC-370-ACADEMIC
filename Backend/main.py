from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from pydantic import BaseModel

import database
import models
import schemas
import oauth2

# =====================================================================
# 1. INICIALIZACIÓN DE TABLAS Y SEGURIDAD BASE
# =====================================================================
models.Base.metadata.create_all(bind=database.engine)

SECRET_KEY = "clave_secreta_super_segura_para_plurione_2026"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def obtener_hash_password(password: str):
    return pwd_context.hash(password)
    
def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# =====================================================================
# 2. CREACIÓN DE LA APLICACIÓN (¡AQUÍ NACE 'app'!)
# =====================================================================
app = FastAPI(
    title="PluriOne - API de Métricas Jurídicas",
    description="Plataforma de backend transaccional y analítico para el área jurídica.",
    version="1.0.0",
    contact={
        "name": "Abraham Rivera - Residencia Profesional",
    }
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

# =====================================================================
# 3. EVENTOS DE ARRANQUE Y FUNCIONES DE EMERGENCIA
# =====================================================================
@app.on_event("startup")
def create_initial_admin():
    db: Session = database.SessionLocal() 
    try:
        user = db.query(models.Usuario).first()
        if not user:
            print("La base de datos está vacía. Creando administrador inicial Pepe Pérez...")
            hashed_password = pwd_context.hash("password123")
            
            # Construcción dinámica que se adapta automáticamente a tu models.py
            datos_admin = {}
            
            # Adaptar correo
            if hasattr(models.Usuario, 'email'):
                datos_admin['email'] = "pepe.perez@plurione.com"
            else:
                datos_admin['correo'] = "pepe.perez@plurione.com"
                
            # Adaptar nombre
            if hasattr(models.Usuario, 'nombre_completo'):
                datos_admin['nombre_completo'] = "Pepe Perez"
            else:
                datos_admin['nombre'] = "Pepe Perez"
                
            # Adaptar contraseña
            if hasattr(models.Usuario, 'password_hash'):
                datos_admin['password_hash'] = hashed_password
            elif hasattr(models.Usuario, 'hashed_password'):
                datos_admin['hashed_password'] = hashed_password
            else:
                datos_admin['contrasena_hash'] = hashed_password
                
            # Adaptar rol (solo si existe en tu modelo)
            if hasattr(models.Usuario, 'rol'):
                datos_admin['rol'] = "Administrador"
                
            admin = models.Usuario(**datos_admin)
            db.add(admin)
            db.commit()
            print("¡Pepe Perez creado con éxito!")
    except Exception as e:
        print(f"Error al crear el administrador: {e}")
    finally:
        db.close()
@app.get("/crear-admin-seguro", tags=["Emergencia"])
def crear_admin_seguro():
    db = database.SessionLocal()
    try:
        # Buscamos de forma segura si ya existe el correo
        user = db.query(models.Usuario).filter(
            getattr(models.Usuario, 'correo', getattr(models.Usuario, 'email', None)) == "pepe.perez@plurione.com"
        ).first()
        
        if user:
            correo_encontrado = getattr(user, 'correo', getattr(user, 'email', 'Desconocido'))
            return {"estatus": "Pepe ya existia en la base de datos", "correo": correo_encontrado}
        
        nuevo_admin = models.Usuario(
            nombre="Pepe Perez",
            correo="pepe.perez@plurione.com",
            rol="Socio Administrador",
            contrasena_hash=pwd_context.hash("password123")
        )
        db.add(nuevo_admin)
        db.commit()
        return {"estatus": "EXITO: Pepe Perez ha sido creado", "correo": nuevo_admin.correo}
        
    except Exception as e:
        return {"estatus": "ERROR", "detalle": str(e)}
    finally:
        db.close()

# =====================================================================
# 4. MIDDLEWARES DE PROTECCIÓN (GUARDIA DE SEGURIDAD)
# =====================================================================
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    credentials_exception = HTTPException(
        status_code=401,
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
        
    # Búsqueda dinámica flexible (soporta columna 'correo' o 'email')
    if hasattr(models.Usuario, 'correo'):
        usuario = db.query(models.Usuario).filter(models.Usuario.correo == email).first()
    else:
        usuario = db.query(models.Usuario).filter(models.Usuario.email == email).first()
        
    if usuario is None:
        raise credentials_exception
        
    return usuario

# =====================================================================
# 5. ENDPOINTS PRINCIPALES (RUTAS)
# =====================================================================
@app.get("/", tags=["0. Sistema"], summary="Verificar estado del servidor")
def leer_raiz(db: Session = Depends(database.get_db)):
    return {"mensaje": "¡Conexión a PostgreSQL y Servidor Activa!"}

@app.post("/login", tags=["Autenticación"])
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    termino_busqueda = form_data.username.strip().lower()
    filtros = []
    
    # Tolerancia a diferentes nombres de columna en tu models.py
    if hasattr(models.Usuario, 'email'):
        filtros.append(func.lower(models.Usuario.email) == termino_busqueda)
    if hasattr(models.Usuario, 'correo'):
        filtros.append(func.lower(models.Usuario.correo) == termino_busqueda)
    if hasattr(models.Usuario, 'nombre'):
        filtros.append(func.lower(models.Usuario.nombre) == termino_busqueda)
    if hasattr(models.Usuario, 'username'):
        filtros.append(func.lower(models.Usuario.username) == termino_busqueda)
    if hasattr(models.Usuario, 'nombre_usuario'):
        filtros.append(func.lower(models.Usuario.nombre_usuario) == termino_busqueda)

    if not filtros:
         raise HTTPException(status_code=500, detail="Error: El modelo de datos no tiene campos válidos.")

    usuario = db.query(models.Usuario).filter(or_(*filtros)).first()
    if not usuario:
        raise HTTPException(status_code=401, detail="Usuario o correo no encontrado")
        
    # Tolerancia al nombre de la columna de contraseña
    hash_guardado = getattr(usuario, 'contrasena_hash', getattr(usuario, 'password_hash', getattr(usuario, 'hashed_password', None)))
        
    if not hash_guardado or not pwd_context.verify(form_data.password, hash_guardado):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas. Revisa tu usuario/correo y contraseña.")
        
    # El token se genera utilizando el correo del usuario
    correo_usuario = getattr(usuario, 'correo', getattr(usuario, 'email', 'desconocido'))
    access_token = create_access_token(data={"sub": correo_usuario})
    
    return {
        "access_token": access_token, 
        "token_type": "bearer"
    }

@app.post("/usuarios", tags=["2. Gestión de Usuarios"])
def crear_usuario(usuario: schemas.UsuarioCreate, db: Session = Depends(database.get_db)):
    correo_busqueda = getattr(usuario, 'email', getattr(usuario, 'correo', None))
    
    filtro_existencia = []
    if hasattr(models.Usuario, 'email'):
         filtro_existencia.append(models.Usuario.email == correo_busqueda)
    if hasattr(models.Usuario, 'correo'):
         filtro_existencia.append(models.Usuario.correo == correo_busqueda)
         
    usuario_existente = db.query(models.Usuario).filter(or_(*filtro_existencia)).first()
    if usuario_existente:
        raise HTTPException(status_code=400, detail="Este correo ya está registrado en el sistema")
    
    password_encriptada = pwd_context.hash(usuario.password)
    
    # Construcción dinámica del nuevo usuario adaptada a tu modelo
    datos_nuevo_usuario = {}
    if hasattr(models.Usuario, 'nombre_completo'):
        datos_nuevo_usuario['nombre_completo'] = getattr(usuario, 'nombre_completo', getattr(usuario, 'nombre', None))
    elif hasattr(models.Usuario, 'nombre'):
        datos_nuevo_usuario['nombre'] = getattr(usuario, 'nombre', getattr(usuario, 'nombre_completo', None))
        
    if hasattr(models.Usuario, 'email'):
        datos_nuevo_usuario['email'] = correo_busqueda
    elif hasattr(models.Usuario, 'correo'):
         datos_nuevo_usuario['correo'] = correo_busqueda
         
    if hasattr(models.Usuario, 'hashed_password'):
         datos_nuevo_usuario['hashed_password'] = password_encriptada
    elif hasattr(models.Usuario, 'contrasena_hash'):
         datos_nuevo_usuario['contrasena_hash'] = password_encriptada
    elif hasattr(models.Usuario, 'password_hash'):
         datos_nuevo_usuario['password_hash'] = password_encriptada
         
    if hasattr(models.Usuario, 'rol') and hasattr(usuario, 'rol'):
         datos_nuevo_usuario['rol'] = usuario.rol
         
    nuevo_usuario = models.Usuario(**datos_nuevo_usuario)
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    
    return {"mensaje": "Usuario creado exitosamente", "correo": correo_busqueda}

@app.get("/usuarios", response_model=list[schemas.UsuarioResponse], tags=["2. Gestión de Usuarios"], summary="Consultar lista de usuarios")
def obtener_usuarios(db: Session = Depends(database.get_db), current_user: models.Usuario = Depends(get_current_user)):
    return db.query(models.Usuario).all()

# --- MÓDULO 3: CONTRATOS ---
@app.post("/contratos", tags=["1. Operaciones"])
def crear_contrato(contrato: schemas.ContratoCreate, db: Session = Depends(database.get_db)):
    nuevo_contrato = models.Contrato(**contrato.model_dump())
    db.add(nuevo_contrato)
    db.commit()
    db.refresh(nuevo_contrato)
    return nuevo_contrato

@app.get("/contratos", tags=["1. Operaciones"])
def obtener_contratos(db: Session = Depends(database.get_db)):
    contratos = db.query(models.Contrato).all()
    return contratos
    
@app.put("/contratos/{contrato_id}/estatus", tags=["2. Contratos"])
def actualizar_estatus_contrato(contrato_id: int, datos: schemas.ContratoEstatusUpdate, db: Session = Depends(database.get_db)):
    contrato = db.query(models.Contrato).filter(models.Contrato.id == contrato_id).first()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")
    contrato.estatus = datos.estatus
    db.commit()
    db.refresh(contrato)
    return contrato

# --- MÓDULO 4: LITIGIOS ---
@app.post("/litigios", tags=["Litigios"])
def crear_litigio(litigio: schemas.LitigioCreate, db: Session = Depends(database.get_db)):
    nuevo_litigio = models.Litigio(**litigio.model_dump())
    nuevo_litigio.materia = nuevo_litigio.materia.capitalize()
    db.add(nuevo_litigio)
    db.commit()
    db.refresh(nuevo_litigio)
    return nuevo_litigio

@app.get("/litigios", tags=["Litigios"])
def obtener_litigios(db: Session = Depends(database.get_db)):
    litigios = db.query(models.Litigio).all()
    return litigios
    
@app.post("/litigios/{litigio_id}/historial", tags=["3. Gestión de Litigios"])
def registrar_avance_litigio(litigio_id: int, historial: schemas.HistorialLitigioCreate, db: Session = Depends(database.get_db)):
    litigio = db.query(models.Litigio).filter(models.Litigio.id == litigio_id).first()
    if not litigio:
        raise HTTPException(status_code=404, detail="Juicio no encontrado")

    nuevo_historial = models.HistorialLitigio(
        litigio_id=litigio.id,
        usuario_modificador_id=historial.usuario_modificador_id,
        fase_anterior=litigio.fase_procesal,
        fase_nueva=historial.fase_nueva,
        comentarios=historial.comentarios
    )
    db.add(nuevo_historial)
    litigio.fase_procesal = historial.fase_nueva
    db.commit()
    db.refresh(litigio)
    return {"mensaje": "Historial y fase procesal actualizados correctamente"}

@app.put("/litigios/{litigio_id}/fase", response_model=schemas.LitigioResponse, tags=["4. Módulo de Litigios (Juicios)"], summary="Actualizar fase procesal (Motor de Historial)")
def actualizar_fase_litigio(litigio_id: int, cambio: schemas.HistorialLitigioCreate, db: Session = Depends(database.get_db), current_user: models.Usuario = Depends(get_current_user)):
    litigio = db.query(models.Litigio).filter(models.Litigio.id == litigio_id).first()
    if not litigio:
        raise HTTPException(status_code=404, detail="Litigio no encontrado")
    
    nuevo_historial = models.HistorialLitigio(
        litigio_id=litigio.id, 
        usuario_modificador_id=cambio.usuario_modificador_id,
        fase_anterior=litigio.fase_procesal, 
        fase_nueva=cambio.fase_nueva, 
        comentarios=cambio.comentarios
    )
    db.add(nuevo_historial)
    litigio.fase_procesal = cambio.fase_nueva
    db.commit()
    db.refresh(litigio)
    return litigio

@app.get("/litigios/{litigio_id}/historial", response_model=list[schemas.HistorialLitigioResponse], tags=["4. Módulo de Litigios (Juicios)"], summary="Ver la línea de tiempo de un juicio")
def obtener_historial_litigio(litigio_id: int, db: Session = Depends(database.get_db), current_user: models.Usuario = Depends(get_current_user)):
    litigio = db.query(models.Litigio).filter(models.Litigio.id == litigio_id).first()
    if not litigio:
        raise HTTPException(status_code=404, detail="Litigio no encontrado")
    
    historial = db.query(models.HistorialLitigio).filter(models.HistorialLitigio.litigio_id == litigio_id).order_by(models.HistorialLitigio.fecha_cambio.desc()).all()
    return historial

# --- MÓDULO 5: KPI's Y DASHBOARD ---
@app.get("/dashboard/kpis", tags=["Métricas"])
def obtener_kpis_principales(db: Session = Depends(database.get_db)):
    contratos_activos = db.query(models.Contrato).filter(
        models.Contrato.estatus == models.EstatusContrato.activo
    ).count()

    riesgo_total = db.query(func.sum(models.Litigio.monto_contingencia)).filter(
        models.Litigio.esta_activo == True
    ).scalar() or 0.0 

    litigios_materia = db.query(
        models.Litigio.materia, func.count(models.Litigio.id)
    ).group_by(models.Litigio.materia).all()
    
    desglose_materia = {materia.value if hasattr(materia, 'value') else materia: cantidad for materia, cantidad in litigios_materia}

    return {
        "kpis": {
            "contratos_activos": contratos_activos,
            "riesgo_economico_total": float(riesgo_total),
            "litigios_por_materia": desglose_materia
        }
    }
    
@app.get("/metricas/litigios-por-fase", tags=["5. Panel de Métricas (Dashboard)"], summary="KPI: Conteo de litigios agrupados por fase")
def metricas_litigios_por_fase(db: Session = Depends(database.get_db), current_user: models.Usuario = Depends(get_current_user)):
    resultados = db.query(models.Litigio.fase_procesal, func.count(models.Litigio.id).label("cantidad")).group_by(models.Litigio.fase_procesal).all()
    return [{"fase": fila.fase_procesal, "cantidad": fila.cantidad} for fila in resultados]

@app.get("/metricas/riesgo-financiero", tags=["5. Panel de Métricas (Dashboard)"], summary="KPI: Riesgo financiero por probabilidad de éxito")
def metricas_riesgo_financiero(db: Session = Depends(database.get_db), current_user: models.Usuario = Depends(get_current_user)):
    resultados = db.query(models.Litigio.probabilidad_exito, func.sum(models.Litigio.monto_contingencia).label("monto_total")).group_by(models.Litigio.probabilidad_exito).all()
    return [{"probabilidad": fila.probabilidad_exito or "No especificada", "monto_total": float(fila.monto_total or 0.0)} for fila in resultados]

@app.get("/metricas/carga-trabajo", tags=["5. Panel de Métricas (Dashboard)"], summary="KPI: Carga de trabajo por abogado/usuario")
def metricas_carga_trabajo(db: Session = Depends(database.get_db), current_user: models.Usuario = Depends(get_current_user)):
    usuarios = db.query(models.Usuario).all()
    reporte_carga = []
    for usuario in usuarios:
        total_contratos = len(usuario.contratos) if hasattr(usuario, 'contratos') and usuario.contratos else 0
        total_litigios = len(usuario.litigios) if hasattr(usuario, 'litigios') and usuario.litigios else 0
        reporte_carga.append({
            "usuario_id": usuario.id,
            "nombre": getattr(usuario, 'nombre', getattr(usuario, 'nombre_completo', 'Desconocido')),
            "rol": getattr(usuario, 'rol', 'No especificado'),
            "total_contratos": total_contratos,
            "total_litigios": total_litigios,
            "carga_total_asuntos": total_contratos + total_litigios
        })
    return reporte_carga

# =====================================================================
# 6. MÓDULO DE INTELIGENCIA ARTIFICIAL (SEGURO)
# =====================================================================
class MensajeChat(BaseModel):
    texto: str
    
@app.get("/litigios/{litigio_id}/analizar", tags=["4. Inteligencia Artificial"])
def analizar_litigio_ia(litigio_id: int, db: Session = Depends(database.get_db)):
    litigio = db.query(models.Litigio).filter(models.Litigio.id == litigio_id).first()
    if not litigio:
        raise HTTPException(status_code=404, detail="Juicio no encontrado")

    nivel_riesgo = "ALTO" if litigio.monto_contingencia > 200000 else "MODERADO"
    
    analisis_generado = (
        f"⚖️ [Asesor IA PluriOne - Análisis Estratégico]\n\n"
        f"• Expediente: {litigio.expediente} ({litigio.materia})\n"
        f"• Fase Procesal Actual: {litigio.fase_procesal}\n"
        f"• Evaluación de Contingencia: Se detecta un nivel de riesgo {nivel_riesgo} "
        f"debido al monto involucrado de ${litigio.monto_contingencia:,.2f}.\n\n"
        f"💡 Recomendación del Sistema: Dado que la probabilidad de éxito se estima como '{litigio.probabilidad_exito}', "
        f"se aconseja reforzar de inmediato el desahogo de pruebas documentales en esta etapa para blindar la postura de la empresa."
    )

    return {"analisis": analisis_generado}

@app.post("/litigios/{litigio_id}/chat", tags=["4. Inteligencia Artificial"])
def chat_litigio_ia(litigio_id: int, mensaje: MensajeChat, db: Session = Depends(database.get_db)):
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
        # AQUÍ ESTABA EL ERROR: Sintaxis corregida sin guiones ni saltos erróneos
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
        respuesta = f"⚖️ Analizando tu pregunta sobre el expediente {litigio.expediente}... Te sugiero vigilar estrictamente los plazos de la fase actual ('{litigio.fase_procesal}') para evitar preclusiones. ¿Te gustaría explorar opciones de acuerdo o revisar el riesgo financiero?"
        
    return {"respuesta": respuesta}