from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from pydantic import BaseModel
from passlib.context import CryptContext

import database
import models
import schemas
import oauth2
SECRET_KEY = "clave_secreta_plurione_2026"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def obtener_hash_password(password: str):
    return pwd_context.hash(password)

# --- 1. CONFIGURACIÓN DE SEGURIDAD (ENCRIPTACIÓN Y TOKENS) ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "clave_secreta_super_segura_para_plurione_2026"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
# FastAPI buscará el token en esta ruta para habilitar el candado de Swagger
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# --- 2. INICIALIZACIÓN DE LA APLICACIÓN ---
app = FastAPI(
    title="PluriOne - API de Métricas Jurídicas",
    description="""
    Plataforma de backend transaccional y analítico para el área jurídica.
    
    **Módulos Principales:**
    1. **Seguridad:** Autenticación mediante tokens JWT.
    2. **Operación:** Control de contratos y auditoría de historial en litigios.
    3. **Analítica:** Generación de KPIs en tiempo real para tableros ejecutivos.
    """,
    version="1.0.0",
    contact={
        "name": "Abraham Rivera - Residencia Profesional",
    }
)

@app.get("/dashboard/kpis", tags=["Métricas"])
def obtener_kpis_principales(db: Session = Depends(database.get_db)):
    
    # KPI 1: Contratos Activos (Para saber cuántos compromisos vigentes hay)
    contratos_activos = db.query(models.Contrato).filter(
        models.Contrato.estatus == models.EstatusContrato.activo
    ).count()

    # KPI 2: Riesgo Económico Total (Suma de las contingencias de litigios activos)
    riesgo_total = db.query(func.sum(models.Litigio.monto_contingencia)).filter(
        models.Litigio.esta_activo == True
    ).scalar() or 0.0 # El 'or 0.0' evita errores si no hay litigios registrados aún

    # KPI 3: Cantidad de Litigios divididos por Materia (Laboral, Civil, etc.)
    litigios_materia = db.query(
        models.Litigio.materia, func.count(models.Litigio.id)
    ).group_by(models.Litigio.materia).all()
    
    # Formateamos el resultado de las materias para que React lo lea fácil
    desglose_materia = {materia.value: cantidad for materia, cantidad in litigios_materia}

    return {
        "kpis": {
            "contratos_activos": contratos_activos,
            "riesgo_economico_total": float(riesgo_total),
            "litigios_por_materia": desglose_materia
        }
    }

# --- 3. CONFIGURACIÓN DE CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

# --- 4. FUNCIÓN "GUARDIA" DE SEGURIDAD ---
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
        
    usuario = db.query(models.Usuario).filter(models.Usuario.email == email).first()
    if usuario is None:
        raise credentials_exception
        
    return usuario

# =====================================================================
#                        ENDPOINTS DE LA API
# =====================================================================

@app.get("/", tags=["0. Sistema"], summary="Verificar estado del servidor")
def leer_raiz(db: Session = Depends(database.get_db)):
    return {"mensaje": "¡Conexión a PostgreSQL y Servidor Activa!"}

# --- MÓDULO 1: AUTENTICACIÓN ---
# --- MÓDULO 1: AUTENTICACIÓN ---
@app.post("/login", tags=["Autenticación"])
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    
    # Limpiamos espacios y pasamos a minúsculas lo que escribiste en la pantalla
    termino_busqueda = form_data.username.strip().lower()

    # Creamos los filtros ignorando mayúsculas/minúsculas con func.lower()
    filtros = [func.lower(models.Usuario.email) == termino_busqueda]
    
    if hasattr(models.Usuario, 'nombre'):
        filtros.append(func.lower(models.Usuario.nombre) == termino_busqueda)
    if hasattr(models.Usuario, 'username'):
        filtros.append(func.lower(models.Usuario.username) == termino_busqueda)
    if hasattr(models.Usuario, 'nombre_usuario'):
        filtros.append(func.lower(models.Usuario.nombre_usuario) == termino_busqueda)

    # Buscamos al usuario sin importar cómo escribiste las mayúsculas
    usuario = db.query(models.Usuario).filter(or_(*filtros)).first()

    if not usuario:
        raise HTTPException(status_code=401, detail="Usuario o correo no encontrado")
        
    # Cambiamos hashed_password por el nombre real de tu columna (por ejemplo, password)
    # Cambiamos a password_hash como está en tu models.py
    if not pwd_context.verify(form_data.password, usuario.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas. Revisa tu usuario/correo y contraseña.")
    access_token = create_access_token(data={"sub": usuario.email})
    
    return {
        "access_token": access_token, 
        "token_type": "bearer"
    }
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

@app.put("/litigios/{litigio_id}/fase", response_model=schemas.LitigioResponse, tags=["4. Módulo de Litigios (Juicios)"], summary="Actualizar fase procesal (Motor de Historial)")
def actualizar_fase_litigio(litigio_id: int, cambio: schemas.HistorialLitigioCreate, db: Session = Depends(database.get_db), current_user: int = Depends(oauth2.get_current_user)):
    litigio = db.query(models.Litigio).filter(models.Litigio.id == litigio_id).first()
    if not litigio:
        raise HTTPException(status_code=404, detail="Litigio no encontrado")
    
    nuevo_historial = models.HistorialLitigio(
        litigio_id=litigio.id, usuario_modificador_id=cambio.usuario_modificador_id,
        fase_anterior=litigio.fase_procesal, fase_nueva=cambio.fase_nueva, comentarios=cambio.comentarios
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
        total_contratos = len(usuario.contratos) if usuario.contratos else 0
        total_litigios = len(usuario.litigios) if usuario.litigios else 0
        reporte_carga.append({
            "usuario_id": usuario.id,
            "nombre": usuario.nombre,
            "rol": usuario.rol,
            "total_contratos": total_contratos,
            "total_litigios": total_litigios,
            "carga_total_asuntos": total_contratos + total_litigios
        })
    return reporte_carga

# --- MÓDULO: HISTORIAL DE LITIGIOS ---
@app.post("/litigios/{litigio_id}/historial", tags=["3. Gestión de Litigios"])
def registrar_avance_litigio(
    litigio_id: int, 
    historial: schemas.HistorialLitigioCreate, 
    db: Session = Depends(database.get_db)
):
    # 1. Buscamos el juicio en la base de datos
    litigio = db.query(models.Litigio).filter(models.Litigio.id == litigio_id).first()
    if not litigio:
        raise HTTPException(status_code=404, detail="Juicio no encontrado")

    # 2. Guardamos la bitácora (quién lo hizo y qué cambió)
    nuevo_historial = models.HistorialLitigio(
        litigio_id=litigio.id,
        usuario_modificador_id=historial.usuario_modificador_id,
        fase_anterior=litigio.fase_procesal,
        fase_nueva=historial.fase_nueva,
        comentarios=historial.comentarios
    )
    db.add(nuevo_historial)

    # 3. Actualizamos la fase actual del juicio
    litigio.fase_procesal = historial.fase_nueva
    
    # 4. Confirmamos y forzamos el refresco en PostgreSQL
    db.commit()
    db.refresh(litigio)
    
    return {"mensaje": "Historial y fase procesal actualizados correctamente"}

# ==========================================
# 5. MÓDULO DE INTELIGENCIA ARTIFICIAL (SEGURO)
# ==========================================
@app.get("/litigios/{litigio_id}/analizar", tags=["4. Inteligencia Artificial"])
def analizar_litigio_ia(litigio_id: int, db: Session = Depends(database.get_db)):
    # 1. Buscamos el juicio en la base de datos
    litigio = db.query(models.Litigio).filter(models.Litigio.id == litigio_id).first()
    if not litigio:
        raise HTTPException(status_code=404, detail="Juicio no encontrado")

    # 2. Generamos el análisis estratégico inteligente basado en los datos reales del expediente
    # (Aquí es donde en producción conectarías tu Azure OpenAI mediante una petición HTTP POST limpia)
    
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

# Agregar esto al final de tu main.py

class MensajeChat(BaseModel):
    texto: str

@app.post("/litigios/{litigio_id}/chat", tags=["4. Inteligencia Artificial"])
def chat_litigio_ia(litigio_id: int, mensaje: MensajeChat, db: Session = Depends(database.get_db)):
    # 1. Buscamos el juicio activo
    litigio = db.query(models.Litigio).filter(models.Litigio.id == litigio_id).first()
    if not litigio:
        raise HTTPException(status_code=404, detail="Juicio no encontrado")
    
    # 2. Convertimos la pregunta del usuario a minúsculas para buscar palabras clave
    pregunta = mensaje.texto.lower()
    
    # 3. Lógica del Simulador IA (Respuestas dinámicas)
    if "peor escenario" in pregunta or "perdemos" in pregunta or "riesgo" in pregunta:
        respuesta = f"📉 Si el fallo es desfavorable en esta materia ({litigio.materia}), la empresa tendría que desembolsar el monto total de contingencia de ${litigio.monto_contingencia:,.2f}, más gastos y costas del juicio. Sugiero provisionar este monto contablemente."
        
    elif "acuerdo" in pregunta or "negociar" in pregunta:
        respuesta = f"🤝 Dado que nuestra probabilidad de éxito actual es '{litigio.probabilidad_exito}', buscar un acuerdo conciliatorio podría ahorrar hasta un 30% del monto total en contingencia procesal."
        
    elif "tiempo" in pregunta or "cuánto" in pregunta or "duración" in pregunta:
        respuesta = f"⏳ Actualmente nos encontramos en la fase de '{litigio.fase_procesal}'. Dependiendo de la carga del juzgado, esta etapa puede demorar entre 3 y 6 meses antes de pasar a la siguiente instancia judicial."
        
    elif "resumen" in pregunta or "director" in pregunta:
        respuesta = f"📝 Resumen Ejecutivo:\n• Expediente: {litigio.expediente} ({litigio.materia}).\n• Fase Procesal: {litigio.fase_procesal}.\n• Riesgo Financiero: ${litigio.monto_contingencia:,.2f}.\n• Estatus de probabilidad: {litigio.probabilidad_exito}."
        
    elif "documento" in pregunta or "prueba" in pregunta:
        respuesta = f"📁 Para respaldar nuestra postura en la fase actual ('{litigio.fase_procesal}'), es vital recopilar todos los contratos originales, correos electrónicos vinculantes y testimoniales antes de la audiencia."
        
    else:
        # Respuesta por defecto si hace otra pregunta
        respuesta = f"⚖️ Analizando tu pregunta sobre el expediente {litigio.expediente}... Te sugiero vigilar estrictamente los plazos de la fase actual ('{litigio.fase_procesal}') para evitar preclusiones. ¿Te gustaría explorar opciones de acuerdo o revisar el riesgo financiero?"
        
    return {"respuesta": respuesta}

@app.put("/contratos/{contrato_id}/estatus", tags=["2. Contratos"])
def actualizar_estatus_contrato(contrato_id: int, datos: schemas.ContratoEstatusUpdate, db: Session = Depends(database.get_db)):
    contrato = db.query(models.Contrato).filter(models.Contrato.id == contrato_id).first()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")
    
    # Actualizamos el estatus
    contrato.estatus = datos.estatus
    db.commit()
    db.refresh(contrato)
    return contrato

@app.post("/usuarios", tags=["Gestión de Usuarios"])
def crear_usuario(usuario: schemas.UsuarioCreate, db: Session = Depends(database.get_db)):
    # 1. Verificar si el correo ya existe para evitar duplicados
    usuario_existente = db.query(models.Usuario).filter(models.Usuario.email == usuario.email).first()
    if usuario_existente:
        raise HTTPException(status_code=400, detail="Este correo ya está registrado en el sistema")
    
    # 2. Encriptar la contraseña (nadie podrá verla, ni el administrador)
    password_encriptada = obtener_hash_password(usuario.password)
    
    # 3. Crear el modelo para la Base de Datos
    # Nota: Asegúrate de que los nombres de la izquierda coincidan con las columnas de tu models.Usuario
    nuevo_usuario = models.Usuario(
        nombre_completo=usuario.nombre_completo,
        email=usuario.email,
        hashed_password=password_encriptada, # Asegúrate de que tu columna se llame así o "password"
        # rol=usuario.rol # Descomenta esto si tienes una columna "rol" en tu base de datos
    )
    
    # 4. Guardar en la base de datos
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    
    return {"mensaje": "Usuario creado exitosamente", "email": nuevo_usuario.email}