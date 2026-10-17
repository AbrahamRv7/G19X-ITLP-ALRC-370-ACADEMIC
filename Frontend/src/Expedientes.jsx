import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import toast from 'react-hot-toast';

function Expedientes() {
  const navigate = useNavigate();
  const [litigios, setLitigios] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const cargarDatos = async () => {
    try {
      const [resLitigios, resClientes] = await Promise.all([
        api.get('/litigios'),
        api.get('/clientes/')
      ]);
      setLitigios(resLitigios.data);
      setClientes(resClientes.data);
      setCargando(false);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar los expedientes.');
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/');
      }
    }
  };

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/');
      return;
    }
    cargarDatos();
  }, [navigate]);

  const obtenerNombreCliente = (id) => {
    if (!id) return 'Sin Cliente';
    const c = clientes.find(item => item.id === id);
    return c ? c.nombre_completo : `Cliente ID ${id}`;
  };

  const formatearDinero = (monto) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto || 0);
  };

  const getRiesgoStyle = (monto) => {
    if (monto >= 200000) return { backgroundColor: '#f8d7da', color: '#721c24' };
    if (monto >= 50000) return { backgroundColor: '#fff3cd', color: '#856404' };
    return { backgroundColor: '#d1e7dd', color: '#0f5132' };
  };

  const litigiosFiltrados = litigios.filter(l => 
    (l.expediente || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (l.materia || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (l.fase_procesal || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    obtenerNombreCliente(l.cliente_id).toLowerCase().includes(busqueda.toLowerCase())
  );

  const styles = {
    pageBg: { backgroundColor: '#f4f7f6', minHeight: '100vh', padding: '40px 20px', fontFamily: "'Segoe UI', Roboto, sans-serif" },
    container: { maxWidth: '1000px', margin: '0 auto' },
    card: { backgroundColor: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #edf2f9', marginTop: '20px' },
    itemCard: { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' },
    searchInput: { width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' },
    btnPrimary: { padding: '10px 20px', backgroundColor: '#0d6efd', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
    btnYellow: { padding: '8px 14px', backgroundColor: '#ffc107', color: '#212529', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem' },
    btnOutline: { padding: '8px 14px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem' },
  };

  return (
    <div style={styles.pageBg}>
      <div style={styles.container}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ margin: 0, color: '#2b3445', fontSize: '2.2rem' }}>⚖️ Control de Expedientes</h1>
            <p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>Gestión procesal y contingencias de litigios activos.</p>
          </div>
          <button onClick={() => navigate('/dashboard')} style={styles.btnOutline}>
            ⬅ Volver al Dashboard
          </button>
        </div>

        <div style={styles.card}>
          <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
            <input 
              type="text" 
              placeholder="Buscar por expediente, cliente, materia o fase procesal..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          {cargando ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Cargando información de litigios...</div>
          ) : (
            <div>
              {litigiosFiltrados.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>No se encontraron expedientes con ese criterio.</p>
              ) : (
                litigiosFiltrados.map((l) => (
                  <div key={l.id} style={{ ...styles.itemCard, borderLeft: `5px solid ${getRiesgoStyle(l.monto_contingencia).color}` }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ margin: '0 0 5px 0', color: '#0f172a', fontSize: '1.2rem', textTransform: 'uppercase' }}>
                          Exp. {l.expediente}
                        </h3>
                        <p style={{ margin: 0, fontSize: '1rem', color: '#2563eb', fontWeight: 'bold' }}>
                          Cliente: {obtenerNombreCliente(l.cliente_id)}
                        </p>
                      </div>
                      <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', backgroundColor: '#e2e8f0', color: '#334155', textTransform: 'uppercase' }}>
                        {l.materia}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                      <div>
                        <p style={{ margin: '0 0 5px 0', fontSize: '0.95rem', color: '#475569' }}>
                          Fase Actual: <strong style={{ color: '#0f172a', textTransform: 'capitalize' }}>{l.fase_procesal}</strong>
                        </p>
                        <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 'bold', color: '#2b3445' }}>
                          Contingencia Estimada: <span style={{ padding: '2px 8px', borderRadius: '6px', ...getRiesgoStyle(l.monto_contingencia) }}>
                            {formatearDinero(l.monto_contingencia)}
                          </span>
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                          onClick={() => navigate(`/detalle-juicio/${l.id}`, { state: { juicio: l } })} 
                          style={styles.btnOutline}
                        >
                          👁️ Ver Bitácora
                        </button>
                        <button 
                          onClick={() => navigate(`/actualizar-juicio/${l.id}`, { state: { juicio: l } })} 
                          style={styles.btnYellow}
                        >
                          Actualizar Fase
                        </button>
                      </div>
                    </div>

                  </div>
                ))
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default Expedientes;