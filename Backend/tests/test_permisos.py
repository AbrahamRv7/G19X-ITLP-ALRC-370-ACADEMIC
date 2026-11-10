import uuid

import pytest
from fastapi.testclient import TestClient

import main
import models
from security import get_current_user


class UsuarioFalso:
    def __init__(self, rol):
        self.id = 1
        self.nombre = 'Prueba'
        self.rol = rol
        self.esta_activo = True


@pytest.fixture(autouse=True)
def limpiar_overrides():
    """Garantiza que ningún test deje un usuario simulado activo, aunque falle a medias."""
    yield
    main.app.dependency_overrides.clear()


@pytest.fixture
def como():
    # `with TestClient(...)` ejecuta el arranque de la app (crea el administrador inicial,
    # que es el usuario id=1 que usan estos tests).
    with TestClient(main.app) as cliente:
        def _como(rol):
            main.app.dependency_overrides[get_current_user] = lambda: UsuarioFalso(rol)
            return cliente
        yield _como


def datos_litigio(cliente_id=1):
    # Expediente único en cada ejecución: la base de datos exige expedientes irrepetibles.
    return {
        'expediente': f'PRUEBA-{uuid.uuid4().hex[:8]}/2026', 'cliente_id': cliente_id,
        'materia': 'Laboral', 'fase_procesal': 'Demanda Inicial',
        'monto_contingencia': 1000, 'probabilidad_exito': 'Alta',
    }


# ✅ Check 1: viewer recibe 403 al escribir
def test_viewer_no_puede_crear_litigios(como):
    respuesta = como(models.RolUsuario.viewer).post('/litigios', json=datos_litigio())
    assert respuesta.status_code == 403


# ✅ Check 1: no administrador recibe 403 al borrar
def test_abogado_no_puede_borrar_litigios(como):
    respuesta = como(models.RolUsuario.abogado).delete('/litigios/1')
    assert respuesta.status_code == 403


# ✅ Check 2: cambiar de fase deja registro en historial_litigios y el borrado posterior funciona
def test_cambiar_fase_escribe_en_historial(como):
    admin = como(models.RolUsuario.admin)

    res_cliente = admin.post('/clientes', json={
        'nombre_completo': 'Cliente Prueba',
        'correo': f'prueba-{uuid.uuid4().hex[:8]}@cliente.com',
        'telefono': '1234567890',
    })
    assert res_cliente.status_code in [200, 201], f'Falló al crear cliente: {res_cliente.text}'
    cliente_id = res_cliente.json()['id']

    litigio_id = None
    try:
        res_crear = admin.post('/litigios', json=datos_litigio(cliente_id))
        assert res_crear.status_code in [200, 201], f'Falló al crear litigio: {res_crear.text}'
        litigio_id = res_crear.json()['id']

        # El responsable no se envió: debe quedar asignado al usuario que lo creó
        assert res_crear.json()['usuario_responsable_id'] == 1

        abogado = como(models.RolUsuario.abogado)
        res_fase = abogado.put(f'/litigios/{litigio_id}/fase', json={'fase_procesal': 'Etapa probatoria'})
        assert res_fase.status_code == 200, f'Falló al cambiar fase: {res_fase.text}'

        res_historial = abogado.get(f'/litigios/{litigio_id}/historial')
        assert res_historial.status_code == 200
        assert any('Etapa probatoria' in str(evento) for evento in res_historial.json())

        # Regresión: borrar un litigio que ya tiene historial no debe dar error 500
        res_borrar = como(models.RolUsuario.admin).delete(f'/litigios/{litigio_id}')
        assert res_borrar.status_code == 200, f'Falló al borrar litigio con historial: {res_borrar.text}'
        litigio_id = None
    finally:
        # Limpieza: la prueba no deja datos en la base
        admin = como(models.RolUsuario.admin)
        if litigio_id is not None:
            admin.delete(f'/litigios/{litigio_id}')
        admin.delete(f'/clientes/{cliente_id}')


# ✅ Check 3: el asistente entiende preguntas con acentos y no imprime nombres de Enum
def test_chat_entiende_acentos_y_muestra_materia(como):
    admin = como(models.RolUsuario.admin)
    res_cliente = admin.post('/clientes', json={
        'nombre_completo': 'Cliente Chat',
        'correo': f'chat-{uuid.uuid4().hex[:8]}@cliente.com',
    })
    assert res_cliente.status_code in [200, 201], res_cliente.text
    cliente_id = res_cliente.json()['id']

    litigio_id = None
    try:
        res_crear = admin.post('/litigios', json=datos_litigio(cliente_id))
        assert res_crear.status_code in [200, 201], res_crear.text
        litigio_id = res_crear.json()['id']

        res = admin.post(f'/litigios/{litigio_id}/chat', json={'texto': '¿Qué sigue?'})
        assert res.status_code == 200
        assert 'Próximos Pasos' in res.json()['respuesta']

        res = admin.post(f'/litigios/{litigio_id}/chat', json={'texto': 'Resumen'})
        assert res.status_code == 200
        assert 'Laboral' in res.json()['respuesta']
        assert 'MateriaLitigio' not in res.json()['respuesta']
    finally:
        admin = como(models.RolUsuario.admin)
        if litigio_id is not None:
            admin.delete(f'/litigios/{litigio_id}')
        admin.delete(f'/clientes/{cliente_id}')
