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


def como(rol):
    main.app.dependency_overrides[get_current_user] = lambda: UsuarioFalso(rol)
    return TestClient(main.app)


LITIGIO = {
    'expediente': 'PRUEBA-001/2026', 'cliente_id': 1, 'materia': 'Laboral',
    'fase_procesal': 'Demanda Inicial', 'monto_contingencia': 1000,
    'probabilidad_exito': 'Alta', 'usuario_responsable_id': 1,
}


# ✅ Check 1: viewer recibe 403 al escribir
def test_viewer_no_puede_crear_litigios():
    respuesta = como(models.RolUsuario.viewer).post('/litigios', json=LITIGIO)
    assert respuesta.status_code == 403
    main.app.dependency_overrides.clear()


# ✅ Check 1: no administrador recibe 403 al borrar
def test_abogado_no_puede_borrar_litigios():
    respuesta = como(models.RolUsuario.abogado).delete('/litigios/1')
    assert respuesta.status_code == 403
    main.app.dependency_overrides.clear()


# ✅ Check 2: cambiar de fase deja registro en historial_litigios
def test_cambiar_fase_escribe_en_historial():
    admin = como(models.RolUsuario.admin)
    
    # 0.1 Intentamos crear el cliente (¡Corregido a nombre_completo!)
    res_cliente = admin.post('/clientes', json={
        "nombre_completo": "Cliente Prueba",
        "email": "prueba@cliente.com",
        "telefono": "1234567890",
        "empresa": "Empresa Prueba"
    })
    assert res_cliente.status_code in [200, 201], f"Falló al crear cliente: {res_cliente.text}"
    cliente_id = res_cliente.json()["id"]
    
    # 0.2 Adaptamos los datos del litigio
    datos_litigio = LITIGIO.copy()
    datos_litigio["cliente_id"] = cliente_id
    
    # 0.3 Intentamos crear el litigio
    res_crear = admin.post('/litigios', json=datos_litigio)
    assert res_crear.status_code in [200, 201], f"Falló al crear litigio: {res_crear.text}"
    litigio_id = res_crear.json()["id"]
    
    # 1. Cambiamos la fase actuando como abogado
    cliente_abogado = como(models.RolUsuario.abogado)
    respuesta_fase = cliente_abogado.put(f'/litigios/{litigio_id}/fase', json={"fase_procesal": "Etapa probatoria"})
    assert respuesta_fase.status_code == 200, f"Falló al cambiar fase: {respuesta_fase.text}"
    
    # 2. Consultamos el historial
    respuesta_historial = cliente_abogado.get(f'/litigios/{litigio_id}/historial')
    assert respuesta_historial.status_code == 200
    
    # 3. Verificamos que la nueva fase se haya guardado
    historial = respuesta_historial.json()
    assert any("Etapa probatoria" in str(evento) for evento in historial)
    
    main.app.dependency_overrides.clear()# ✅ Check 2: cambiar de fase deja registro en historial_litigios
def test_cambiar_fase_escribe_en_historial():
    admin = como(models.RolUsuario.admin)
    
    # 0.1 Intentamos crear el cliente (¡Corregido a nombre_completo!)
    res_cliente = admin.post('/clientes', json={
        "nombre_completo": "Cliente Prueba",
        "email": "prueba@cliente.com",
        "telefono": "1234567890",
        "empresa": "Empresa Prueba"
    })
    assert res_cliente.status_code in [200, 201], f"Falló al crear cliente: {res_cliente.text}"
    cliente_id = res_cliente.json()["id"]
    
    # 0.2 Adaptamos los datos del litigio
    datos_litigio = LITIGIO.copy()
    datos_litigio["cliente_id"] = cliente_id
    
    # 0.3 Intentamos crear el litigio
    res_crear = admin.post('/litigios', json=datos_litigio)
    assert res_crear.status_code in [200, 201], f"Falló al crear litigio: {res_crear.text}"
    litigio_id = res_crear.json()["id"]
    
    # 1. Cambiamos la fase actuando como abogado
    cliente_abogado = como(models.RolUsuario.abogado)
    respuesta_fase = cliente_abogado.put(f'/litigios/{litigio_id}/fase', json={"fase_procesal": "Etapa probatoria"})
    assert respuesta_fase.status_code == 200, f"Falló al cambiar fase: {respuesta_fase.text}"
    
    # 2. Consultamos el historial
    respuesta_historial = cliente_abogado.get(f'/litigios/{litigio_id}/historial')
    assert respuesta_historial.status_code == 200
    
    # 3. Verificamos que la nueva fase se haya guardado
    historial = respuesta_historial.json()
    assert any("Etapa probatoria" in str(evento) for evento in historial)
    
    main.app.dependency_overrides.clear()