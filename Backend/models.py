import enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from database import Base
from sqlalchemy.sql import func
import enum

class RolUsuario(str, enum.Enum):
    admin = 'admin'
    abogado = 'abogado'
    viewer = 'viewer'

class EstatusContrato(str, enum.Enum):
    borrador = 'Borrador'
    en_revision = 'En Revisión'
    activo = 'Activo'
    vencido = 'Vencido'
    terminado = 'Terminado'

class MateriaLitigio(str, enum.Enum):
    laboral = 'Laboral'
    mercantil = 'Mercantil'
    civil = 'Civil'
    fiscal = 'Fiscal'
    administrativo = 'Administrativo'

class NivelProbabilidad(str, enum.Enum):
    alta = 'Alta'
    media = 'Media'
    baja = 'Baja'

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    rol = Column(SQLEnum(RolUsuario), default=RolUsuario.viewer)
    expedientes = relationship("Expediente", back_populates="abogado")
    esta_activo = Column(Boolean, default=True)
    creado_en = Column(DateTime, server_default=func.now())
    actualizado_en = Column(DateTime, server_default=func.now(), onupdate=func.now())

    contratos = relationship("Contrato", back_populates="responsable")
    litigios = relationship("Litigio", back_populates="responsable")

class Contrato(Base):
    __tablename__ = "contratos"

    id = Column(Integer, primary_key=True, index=True)
    usuario_responsable_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"))
    tipo_contrato = Column(String(100), nullable=False)
    contraparte = Column(String(150), nullable=False)
    departamento_solicitante = Column(String(100), nullable=False)
    fecha_firma = Column(DateTime)
    fecha_vencimiento = Column(DateTime)
    monto_operacion = Column(Numeric(15, 2), default=0.00)
    
    # Aquí está la solución: obligamos a SQLAlchemy a usar los valores
    estatus = Column(SQLEnum(EstatusContrato, values_callable=lambda obj: [e.value for e in obj]), default=EstatusContrato.activo)
    
    creado_en = Column(DateTime, server_default=func.now())
    actualizado_en = Column(DateTime, server_default=func.now(), onupdate=func.now())

    responsable = relationship("Usuario", back_populates="contratos")

class Litigio(Base):
    __tablename__ = "litigios"

    id = Column(Integer, primary_key=True, index=True)
    usuario_responsable_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"))
    
    
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=True) 

    expediente = Column(String(50), unique=True, nullable=False)
    
    materia = Column(SQLEnum(MateriaLitigio, values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    fase_procesal = Column(String(100), nullable=False)
    monto_contingencia = Column(Numeric(15, 2), default=0.00)
    probabilidad_exito = Column(SQLEnum(NivelProbabilidad, values_callable=lambda obj: [e.value for e in obj]))
    
    esta_activo = Column(Boolean, default=True)
    creado_en = Column(DateTime, server_default=func.now())
    actualizado_en = Column(DateTime, server_default=func.now(), onupdate=func.now())

    responsable = relationship("Usuario", back_populates="litigios")
    historial = relationship("HistorialLitigio", back_populates="litigio")
    cliente = relationship("Cliente")

class HistorialLitigio(Base):
    __tablename__ = "historial_litigios"

    id = Column(Integer, primary_key=True, index=True)
    litigio_id = Column(Integer, ForeignKey("litigios.id", ondelete="CASCADE"), nullable=False)
    usuario_modificador_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"))
    fase_anterior = Column(String(100))
    fase_nueva = Column(String(100), nullable=False)
    comentarios = Column(String)
    fecha_cambio = Column(DateTime, server_default=func.now())

    litigio = relationship("Litigio", back_populates="historial")

    # 1. Definimos los estados posibles de un expediente
class EstadoExpediente(str, enum.Enum):
    abierto = "Abierto"
    en_proceso = "En Proceso"
    mediacion = "Mediación"
    sentencia = "Sentencia"
    cerrado = "Cerrado"

# 2. Modelo de Clientes
class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    nombre_completo = Column(String(150), nullable=False)
    rfc = Column(String(13), unique=True, index=True)
    correo = Column(String(100), unique=True, index=True)
    telefono = Column(String(20))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    # Relación bidireccional con Expediente
    expedientes = relationship("Expediente", back_populates="cliente")

# 3. Modelo de Expedientes (El núcleo del sistema)
class Expediente(Base):
    __tablename__ = "expedientes"

    id = Column(Integer, primary_key=True, index=True)
    numero_expediente = Column(String(50), unique=True, index=True, nullable=False)
    titulo = Column(String(200), nullable=False)
    descripcion = Column(Text)
    estado = Column(SQLEnum(EstadoExpediente), default=EstadoExpediente.abierto)
    
    # Llaves Foráneas (Foreign Keys)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    abogado_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False) 

    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())

    # Relaciones para navegar los datos fácilmente en Python
    cliente = relationship("Cliente", back_populates="expedientes")
    abogado = relationship("Usuario", back_populates="expedientes")

    