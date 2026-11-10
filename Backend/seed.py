"""Carga datos de prueba. Uso: cd Backend; python seed.py"""
from datetime import date, timedelta
import database
import models
from security import pwd_context

models.Base.metadata.create_all(bind=database.engine)
db = database.SessionLocal()

# Validar que no se dupliquen datos si se ejecuta varias veces
if db.query(models.Cliente).count() == 0:
    clave = pwd_context.hash('Demo2026!')
    
    # 1. Crear usuarios de prueba
    abogado = models.Usuario(
        nombre='Abogado Demo', email='abogado@demo.local',
        password_hash=clave, rol=models.RolUsuario.abogado
    )
    lector = models.Usuario(
        nombre='Lector Demo', email='viewer@demo.local',
        password_hash=clave, rol=models.RolUsuario.viewer
    )
    
    # 2. Crear clientes
    cliente1 = models.Cliente(nombre_completo='Industrias Demo SA de CV', correo='contacto@demo.local')
    cliente2 = models.Cliente(nombre_completo='Comercializadora Beta', correo='ventas@beta.local')
    db.add_all([abogado, lector, cliente1, cliente2])
    db.flush()  # Genera los IDs para usarlos en las siguientes tablas

    hoy = date.today()
    
    # 3. Crear contratos (uno por vencer en menos de 30 días para los KPIs)
    contrato_por_vencer = models.Contrato(
        cliente_id=cliente1.id, usuario_responsable_id=abogado.id,
        tipo_contrato='Prestación de servicios', contraparte='Proveedor Demo',
        departamento_solicitante='Compras', fecha_firma=hoy - timedelta(days=300),
        fecha_vencimiento=hoy + timedelta(days=15), monto_operacion=250000,
        estatus=models.EstatusContrato.activo
    )
    contrato_largo = models.Contrato(
        cliente_id=cliente2.id, usuario_responsable_id=abogado.id,
        tipo_contrato='Arrendamiento', contraparte='Inmobiliaria Sur',
        departamento_solicitante='Operaciones', fecha_firma=hoy - timedelta(days=100),
        fecha_vencimiento=hoy + timedelta(days=365), monto_operacion=850000,
        estatus=models.EstatusContrato.activo
    )
    db.add_all([contrato_por_vencer, contrato_largo])

    # 4. Crear litigios variados (distintas materias, uno con monto alto)
    litigio_laboral = models.Litigio(
        cliente_id=cliente1.id, usuario_responsable_id=abogado.id,
        expediente='DEMO-001/2026', materia=models.MateriaLitigio.laboral,
        fase_procesal='Etapa probatoria', monto_contingencia=1500000.0,
        probabilidad_exito=models.NivelProbabilidad.media
    )
    litigio_mercantil = models.Litigio(
        cliente_id=cliente2.id, usuario_responsable_id=abogado.id,
        expediente='DEMO-002/2026', materia=models.MateriaLitigio.mercantil,
        fase_procesal='Demanda Inicial', monto_contingencia=300000.0,
        probabilidad_exito=models.NivelProbabilidad.alta
    )
    litigio_civil = models.Litigio(
        cliente_id=cliente1.id, usuario_responsable_id=abogado.id,
        expediente='DEMO-003/2026', materia=models.MateriaLitigio.civil,
        fase_procesal='Sentencia', monto_contingencia=50000.0,
        probabilidad_exito=models.NivelProbabilidad.baja
    )
    db.add_all([litigio_laboral, litigio_mercantil, litigio_civil])
    db.flush()

    # 5. Crear historial procesal (dos cambios de fase para el litigio laboral)
    historial1 = models.HistorialLitigio(
        litigio_id=litigio_laboral.id, usuario_modificador_id=abogado.id,
        fase_anterior='Demanda Inicial', fase_nueva='Contestación',
        comentarios='La contraparte presentó contestación en tiempo y forma.'
    )
    historial2 = models.HistorialLitigio(
        litigio_id=litigio_laboral.id, usuario_modificador_id=abogado.id,
        fase_anterior='Contestación', fase_nueva='Etapa probatoria',
        comentarios='Apertura del periodo de desahogo de pruebas.'
    )
    db.add_all([historial1, historial2])

    db.commit()
    print('Datos de prueba cargados correctamente.')
else:
    print('Los datos de prueba ya existen en la base de datos.')

db.close()