import enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric, ForeignKey, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

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
    expediente = Column(String(50), unique=True, nullable=False)
    
    # También blindamos los Enums de los litigios
    materia = Column(SQLEnum(MateriaLitigio, values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    fase_procesal = Column(String(100), nullable=False)
    monto_contingencia = Column(Numeric(15, 2), default=0.00)
    probabilidad_exito = Column(SQLEnum(NivelProbabilidad, values_callable=lambda obj: [e.value for e in obj]))
    
    esta_activo = Column(Boolean, default=True)
    creado_en = Column(DateTime, server_default=func.now())
    actualizado_en = Column(DateTime, server_default=func.now(), onupdate=func.now())

    responsable = relationship("Usuario", back_populates="litigios")
    historial = relationship("HistorialLitigio", back_populates="litigio")

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

    