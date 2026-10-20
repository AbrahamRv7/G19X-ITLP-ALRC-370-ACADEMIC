import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import toast from 'react-hot-toast';

function Expedientes() {
  const navigate = useNavigate();
  // Los expedientes se obtienen de la ruta /litigios
  const [expedientes, setExpedientes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        // Pedimos los litigios (que contienen el campo expediente) y los clientes
        const [resLitigios, resClientes] = await Promise.all([
          api.get('/litigios'),
          api.get('/clientes/')
        ]);
        setExpedientes(resLitigios.data);
        setClientes(resClientes.data);
      } catch (error) {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/');
        } else {
          toast.error('Error al cargar expedientes.');
        }
      } finally {
        setCargando(false);
      }
    };
    cargarDatos();
  }, [navigate]);

  const obtenerNombreCliente = (cliente_id) => {
    if (!cliente_id) return 'Sin Cliente Asignado';
    const cliente = clientes.find(c => c.id === cliente_id);
    return cliente ? cliente.nombre_completo : 'Cliente Desconocido';
  };

  const expedientesFiltrados = expedientes.filter(e =>
    (e.expediente || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (e.materia || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    obtenerNombreCliente(e.cliente_id).toLowerCase().includes(busqueda.toLowerCase())
  );

  const formatearDinero = (monto) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto || 0);

  const getRiesgoStyle = (monto) => {
    if (monto >= 200000) return { backgroundColor: '#f8d7da', color: '#721c24' };
    if (monto >= 50000) return { backgroundColor: '#fff3cd', color: '#856404' };
    return { backgroundColor: '#d1e7dd', color: '#0f5132' };
  };

  if (cargando) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Cargando expedientes...</div>;
  }

  return (
    <div style={{ backgroundColor: '#f4f7f6', minHeight: '100vh', padding: '40px 20px', fontFamily: "'Segoe UI', Roboto, sans-serif" }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          <div>
            <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', padding: 0, marginBottom: '10px' }}>
              ← Regresar al Dashboard
            </button>
            <h1 style={{ margin: 0, color: '#2b3445', fontSize: '2.2rem' }}>📁 Expedientes Activos</h1>
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #edf2f9' }}>
          <input 
            type="text" 
            placeholder="Buscar por número de expediente, cliente o materia..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem', boxSizing: 'border-box', marginBottom: '20px' }}
          />

          {expedientesFiltrados.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6c757d', padding: '20px' }}>No se encontraron expedientes con esa búsqueda.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
              {expedientesFiltrados.map((exp) => (
                <div key={exp.id} style={{ backgroundColor: '#fff', border: '1px solid #edf2f9', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: `5px solid ${getRiesgoStyle(exp.monto_contingencia).color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ margin: 0, color: '#2b3445', fontSize: '1.2rem', textTransform: 'uppercase' }}>
                      Exp. {exp.expediente}
                    </h3>
                    <span style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: '#e2e8f0', color: '#475569', textTransform: 'uppercase' }}>
                      {exp.materia}
                    </span>
                  </div>
                  
                  <p style={{ margin: '8px 0 0 0', fontSize: '1rem', color: '#4f46e5', fontWeight: '600' }}>
                    {obtenerNombreCliente(exp.cliente_id)}
                  </p>

                  <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#6c757d' }}>
                    Fase Procesal: <strong style={{ color: '#2b3445' }}>{exp.fase_procesal}</strong>
                  </p>
                  
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', fontWeight: 'bold', color: '#2b3445' }}>
                    Contingencia: <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', ...getRiesgoStyle(exp.monto_contingencia) }}>
                      {formatearDinero(exp.monto_contingencia)}
                    </span>
                  </p>

                  <button 
                    onClick={() => navigate(`/detalle-juicio/${exp.id}`, { state: { juicio: exp } })} 
                    style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}
                  >
                    Ver Bitácora Procesal Completa →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Expedientes;