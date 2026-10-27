import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from './api';

function DetalleJuicio() {
  const location = useLocation();
  const navigate = useNavigate();
  const juicio = location.state?.juicio;
  
  // Estados para el cliente y la bitácora del historial
  const [nombreCliente, setNombreCliente] = useState('Cargando cliente...');
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);

  useEffect(() => {
    if (!juicio) return;

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    // 1. Obtener el nombre del cliente asociado
    if (juicio.cliente_id) {
      api.get('/clientes', { headers })
        .then(res => {
          const clienteEncontrado = res.data.find(c => c.id === juicio.cliente_id);
          setNombreCliente(clienteEncontrado ? clienteEncontrado.nombre_completo : 'Cliente Desconocido');
        })
        .catch(() => setNombreCliente('Error al cargar cliente'));
    } else {
      setNombreCliente('Sin cliente asignado');
    }

    // 2. Obtener el historial de fases procesales del litigio
    api.get(`/litigios/${juicio.id}/historial`, { headers })
      .then(res => {
        setHistorial(res.data);
      })
      .catch(err => {
        console.error('Error al cargar el historial:', err);
      })
      .finally(() => {
        setCargandoHistorial(false);
      });
  }, [juicio]);

  if (!juicio) {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px', fontFamily: 'sans-serif' }}>
        <h2>No se seleccionó ningún expediente.</h2>
        <button onClick={() => navigate('/dashboard')} style={{ padding: '10px 20px', cursor: 'pointer' }}>
          Regresar al Dashboard
        </button>
      </div>
    );
  }

  // Formateador de fecha para la bitácora
  const formatearFecha = (fechaIso) => {
    if (!fechaIso) return 'Fecha no registrada';
    const fecha = new Date(fechaIso);
    return fecha.toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Estilos de color para el riesgo
  const colorRiesgo = juicio.monto_contingencia >= 200000 ? '#dc3545' : juicio.monto_contingencia >= 50000 ? '#856404' : '#0f5132';

  return (
    <div style={{ backgroundColor: '#f4f7f6', minHeight: '100vh', padding: '40px 20px', fontFamily: "'Segoe UI', Roboto, sans-serif" }}>
      
      <div style={{ maxWidth: '1000px', margin: '0 auto', marginBottom: '20px' }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}>
          ← Regresar al Dashboard
        </button>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', padding: '40px' }}>
        
        {/* ENCABEZADO DEL EXPEDIENTE */}
        <div style={{ borderBottom: '2px solid #edf2f9', paddingBottom: '20px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ backgroundColor: '#e2e8f0', color: '#475569', padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Materia {juicio.materia}
            </span>
            <h1 style={{ margin: '15px 0 5px 0', color: '#0f172a', fontSize: '2.2rem', textTransform: 'uppercase' }}>
              Expediente: {juicio.expediente}
            </h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '1.1rem' }}>
              Fase Actual: <strong style={{ color: '#2563eb', textTransform: 'capitalize' }}>{juicio.fase_procesal}</strong>
            </p>
          </div>
          
          <button 
            onClick={() => navigate(`/actualizar-juicio/${juicio.id}`, { state: { juicio } })} 
            style={{ padding: '10px 20px', backgroundColor: '#ffc107', color: '#212529', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Actualizar Fase
          </button>
        </div>

        {/* CUADRÍCULA DE PARTES INVOLUCRADAS */}
        <h3 style={{ color: '#0f172a', marginBottom: '15px' }}>Partes Involucradas</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '30px' }}>
          <div style={{ backgroundColor: '#f0fdf4', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
            <p style={{ margin: '0 0 5px 0', fontSize: '0.85rem', color: '#065f46', fontWeight: 'bold', textTransform: 'uppercase' }}>Representado (Nuestro Cliente)</p>
            <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: '#0f172a' }}>
              {nombreCliente}
            </p>
          </div>
          <div style={{ backgroundColor: '#fff1f2', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #f43f5e' }}>
            <p style={{ margin: '0 0 5px 0', fontSize: '0.85rem', color: '#9f1239', fontWeight: 'bold', textTransform: 'uppercase' }}>Contraparte</p>
            <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: '#0f172a' }}>
              {juicio.contraparte || 'No registrada'}
            </p>
          </div>
        </div>

        {/* CUADRÍCULA DE DATOS FINANCIEROS Y ESTRATÉGICOS */}
        <h3 style={{ color: '#0f172a', marginBottom: '15px' }}>Información Financiera y Estratégica</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
          
          <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <p style={{ margin: '0 0 5px 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Riesgo de Contingencia</p>
            <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 'bold', color: colorRiesgo }}>
              ${Number(juicio.monto_contingencia || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <p style={{ margin: '0 0 5px 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Probabilidad de Éxito</p>
            <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: '#0f172a', textTransform: 'capitalize' }}>
              {juicio.probabilidad_exito || 'No evaluada'}
            </p>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <p style={{ margin: '0 0 5px 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Juzgado / Autoridad</p>
            <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a' }}>
              {juicio.juzgado || 'Por asignar'}
            </p>
          </div>
        </div>

        {/* ========================================================= */}
        {/* NUEVA SECCIÓN: LÍNEA DE TIEMPO / BITÁCORA PROCESAL        */}
        {/* ========================================================= */}
        <div style={{ marginBottom: '35px' }}>
          <h3 style={{ color: '#0f172a', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🕒 Línea de Tiempo y Bitácora Procesal
          </h3>

          {cargandoHistorial ? (
            <p style={{ color: '#64748b', fontStyle: 'italic' }}>Cargando historial del expediente...</p>
          ) : historial.length === 0 ? (
            <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b' }}>
              Aún no se han registrado cambios de fase en la bitácora de este expediente. 
              Usa el botón amarillo <strong>"Actualizar Fase"</strong> arriba a la derecha cuando el juicio avance.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: '3px solid #cbd5e1', marginLeft: '10px', paddingLeft: '20px' }}>
              {historial.map((registro) => (
                <div 
                  key={registro.id} 
                  style={{ 
                    backgroundColor: '#f8fafc', 
                    padding: '18px 20px', 
                    borderRadius: '8px', 
                    border: '1px solid #e2e8f0',
                    position: 'relative'
                  }}
                >
                  {/* Punto indicador en la línea de tiempo */}
                  <div style={{
                    position: 'absolute',
                    left: '-28px',
                    top: '22px',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: '#2563eb',
                    border: '2px solid #fff',
                    boxShadow: '0 0 0 2px #2563eb'
                  }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ backgroundColor: '#e2e8f0', color: '#475569', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', textTransform: 'capitalize' }}>
                        {registro.fase_anterior || 'Inicio'}
                      </span>
                      <span style={{ color: '#64748b', fontWeight: 'bold' }}>➔</span>
                      <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'capitalize' }}>
                        {registro.fase_nueva}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>
                      📅 {formatearFecha(registro.fecha_cambio)}
                    </span>
                  </div>

                  <p style={{ margin: 0, color: '#334155', fontSize: '0.95rem', lineHeight: '1.5' }}>
                    <strong>Comentarios:</strong> {registro.comentarios || 'Sin comentarios adicionales.'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RECOMENDACIÓN INFERIOR */}
        <div style={{ backgroundColor: '#eff6ff', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#1e3a8a' }}>💡 Siguiente Paso</h4>
          <p style={{ margin: 0, color: '#1e40af', fontSize: '0.95rem' }}>
            Asegúrate de recolectar toda la evidencia correspondiente a la fase de <strong>{juicio.fase_procesal}</strong>. Puedes usar el botón de <strong>✨ IA</strong> en el Dashboard para obtener recomendaciones sobre este expediente.
          </p>
        </div>

      </div>
    </div>
  );
}

export default DetalleJuicio;