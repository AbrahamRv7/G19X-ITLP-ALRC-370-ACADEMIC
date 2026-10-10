import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from './api';

function DetalleJuicio() {
  const location = useLocation();
  const navigate = useNavigate();
  const juicio = location.state?.juicio;
  
  // Estado para guardar el nombre del cliente
  const [nombreCliente, setNombreCliente] = useState('Cargando cliente...');

  useEffect(() => {
    if (juicio?.cliente_id) {
      const obtenerCliente = async () => {
        try {
          const token = localStorage.getItem('token');
          // Traemos los clientes para buscar el nombre exacto
          const respuesta = await api.get('/clientes/', {
            headers: { Authorization: `Bearer ${token}` }
          });
          const clienteEncontrado = respuesta.data.find(c => c.id === juicio.cliente_id);
          setNombreCliente(clienteEncontrado ? clienteEncontrado.nombre_completo : 'Cliente Desconocido');
        } catch (error) {
          setNombreCliente('Error al cargar cliente');
        }
      };
      obtenerCliente();
    } else {
      setNombreCliente('Sin cliente asignado (Registro Antiguo)');
    }
  }, [juicio]);

  if (!juicio) {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px' }}>
        <h2>No se seleccionó ningún expediente.</h2>
        <button onClick={() => navigate('/dashboard')}>Regresar</button>
      </div>
    );
  }

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

        {/* NUEVA CUADRÍCULA DE PARTES INVOLUCRADAS */}
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
              ${juicio.monto_contingencia?.toLocaleString()}
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