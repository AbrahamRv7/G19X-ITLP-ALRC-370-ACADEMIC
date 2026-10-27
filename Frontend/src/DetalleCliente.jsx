import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import api from './api';
import toast from 'react-hot-toast';

function DetalleCliente() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [cliente, setCliente] = useState(location.state?.cliente || null);
  const [contratosCliente, setContratosCliente] = useState([]);
  const [litigiosCliente, setLitigiosCliente] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }

    const cargarFicha360 = async () => {
      const headers = { Authorization: `Bearer ${token}` };
      const clienteIdNum = parseInt(id, 10);

      const [resClientes, resContratos, resLitigios] = await Promise.allSettled([
        api.get('/clientes', { headers }),
        api.get('/contratos', { headers }),
        api.get('/litigios', { headers })
      ]);

      if (resClientes.status === 'fulfilled') {
        const encontrado = resClientes.value.data.find(c => c.id === clienteIdNum);
        if (encontrado) setCliente(encontrado);
      }

      if (resContratos.status === 'fulfilled') {
        const filtrados = resContratos.value.data.filter(c => c.cliente_id === clienteIdNum);
        setContratosCliente(filtrados);
      } else {
        toast.error('No se pudieron cargar los contratos del cliente.');
      }

      if (resLitigios.status === 'fulfilled') {
        const filtrados = resLitigios.value.data.filter(l => l.cliente_id === clienteIdNum);
        setLitigiosCliente(filtrados);
      } else {
        toast.error('No se pudieron cargar los litigios del cliente.');
      }

      setCargando(false);
    };

    cargarFicha360();
  }, [id, navigate]);

  const formatearDinero = (monto) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto || 0);

  const formatearFecha = (fechaIso) => {
    if (!fechaIso) return 'N/A';
    return new Date(fechaIso).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getEstatusStyle = (estatus) => {
    const estado = estatus?.toLowerCase() || '';
    if (estado === 'activo') return { backgroundColor: '#d1e7dd', color: '#0f5132' };
    if (estado === 'en revisión' || estado === 'borrador') return { backgroundColor: '#fff3cd', color: '#856404' };
    if (estado === 'vencido' || estado === 'terminado') return { backgroundColor: '#f8d7da', color: '#721c24' };
    return { backgroundColor: '#e2e3e5', color: '#383d41' };
  };

  const getRiesgoStyle = (monto) => {
    if (monto >= 200000) return { backgroundColor: '#f8d7da', color: '#721c24' };
    if (monto >= 50000) return { backgroundColor: '#fff3cd', color: '#856404' };
    return { backgroundColor: '#d1e7dd', color: '#0f5132' };
  };

  if (cargando) {
    return (
      <div style={{ textAlign: 'center', padding: '80px', color: '#64748b', fontFamily: 'sans-serif' }}>
        Cargando Ficha 360° del cliente...
      </div>
    );
  }

  if (!cliente) {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px', fontFamily: 'sans-serif' }}>
        <h2>No se encontró la información del cliente.</h2>
        <button onClick={() => navigate('/clientes')} style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontWeight: 'bold' }}>
          Volver al Directorio
        </button>
      </div>
    );
  }

  const montoTotalContratos = contratosCliente.reduce((acc, c) => acc + (parseFloat(c.monto_operacion) || 0), 0);
  const montoTotalRiesgo = litigiosCliente.reduce((acc, l) => acc + (parseFloat(l.monto_contingencia) || 0), 0);

  return (
    <div style={{ backgroundColor: '#f4f7f6', minHeight: '100vh', padding: '40px 20px', fontFamily: "'Segoe UI', Roboto, sans-serif" }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* BOTÓN REGRESAR */}
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => navigate('/clientes')}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}
          >
            ← Volver al Directorio de Clientes
          </button>
        </div>

        {/* TARJETA DE PERFIL CORPORATIVO */}
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '30px', borderTop: '5px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '5px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Cliente #{cliente.id}
                </span>
                {cliente.rfc && (
                  <span style={{ backgroundColor: '#f1f5f9', color: '#334155', padding: '5px 12px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', fontFamily: 'monospace' }}>
                    RFC: {cliente.rfc.toUpperCase()}
                  </span>
                )}
              </div>

              <h1 style={{ margin: '12px 0 8px 0', color: '#0f172a', fontSize: '2.1rem' }}>
                {cliente.nombre_completo}
              </h1>

              <div style={{ display: 'flex', gap: '24px', color: '#475569', fontSize: '0.95rem', flexWrap: 'wrap', marginTop: '10px' }}>
                <span>📧 <strong>Correo:</strong> {cliente.correo || 'No registrado'}</span>
                <span>📞 <strong>Teléfono:</strong> {cliente.telefono || 'No registrado'}</span>
                <span>📅 <strong>Fecha de Alta:</strong> {formatearFecha(cliente.creado_en)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/nuevo-contrato')}
                style={{ padding: '10px 18px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
              >
                + Nuevo Contrato
              </button>
              <button
                onClick={() => navigate('/nuevo-litigio')}
                style={{ padding: '10px 18px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
              >
                + Nuevo Juicio
              </button>
            </div>
          </div>
        </div>

        {/* KPIs FINANCIEROS DEL CLIENTE */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '30px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', borderLeft: '5px solid #2563eb' }}>
            <h3 style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase' }}>Contratos Vinculados</h3>
            <p style={{ margin: '8px 0 4px 0', fontSize: '2.2rem', fontWeight: 'bold', color: '#0f172a' }}>{contratosCliente.length}</p>
            <span style={{ fontSize: '0.9rem', color: '#0f766e', fontWeight: '600' }}>
              Operación: {formatearDinero(montoTotalContratos)}
            </span>
          </div>

          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', borderLeft: '5px solid #4f46e5' }}>
            <h3 style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase' }}>Litigios Activos</h3>
            <p style={{ margin: '8px 0 4px 0', fontSize: '2.2rem', fontWeight: 'bold', color: '#0f172a' }}>{litigiosCliente.length}</p>
            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
              Expedientes judiciales asociados
            </span>
          </div>

          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', borderLeft: '5px solid #dc2626' }}>
            <h3 style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase' }}>Exposición en Litigios</h3>
            <p style={{ margin: '8px 0 4px 0', fontSize: '2rem', fontWeight: 'bold', color: montoTotalRiesgo > 0 ? '#dc2626' : '#16a34a' }}>
              {formatearDinero(montoTotalRiesgo)}
            </p>
            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
              Contingencia acumulada
            </span>
          </div>
        </div>

        {/* COLUMNAS 360: CONTRATOS Y LITIGIOS DEL CLIENTE */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
          
          {/* COLUMNA IZQUIERDA: CONTRATOS */}
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #edf2f9' }}>
            <h2 style={{ margin: '0 0 18px 0', fontSize: '1.3rem', color: '#0f172a', borderBottom: '2px solid #edf2f9', paddingBottom: '12px' }}>
              📄 Contratos del Cliente ({contratosCliente.length})
            </h2>

            {contratosCliente.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                Este cliente aún no tiene contratos registrados.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {contratosCliente.map((c) => (
                  <div key={c.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', borderLeft: `4px solid ${getEstatusStyle(c.estatus).color}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, color: '#0f172a', fontSize: '1.05rem', textTransform: 'capitalize' }}>
                        {c.tipo_contrato}
                      </h4>
                      <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', ...getEstatusStyle(c.estatus) }}>
                        {c.estatus}
                      </span>
                    </div>

                    <p style={{ margin: '8px 0 4px 0', fontSize: '0.9rem', color: '#475569' }}>
                      <strong>Contraparte:</strong> {c.contraparte}
                    </p>
                    <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: '#64748b' }}>
                      <strong>Departamento:</strong> {c.departamento_solicitante}
                    </p>
                    {c.fecha_vencimiento && (
                      <p style={{ margin: '0 0 6px 0', fontSize: '0.82rem', color: '#64748b' }}>
                        <strong>Vencimiento:</strong> {c.fecha_vencimiento.split('T')[0]}
                      </p>
                    )}
                    <p style={{ margin: '8px 0 0 0', fontSize: '0.95rem', fontWeight: 'bold', color: '#0f766e' }}>
                      Monto: {formatearDinero(c.monto_operacion)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA: JUICIOS / LITIGIOS */}
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #edf2f9' }}>
            <h2 style={{ margin: '0 0 18px 0', fontSize: '1.3rem', color: '#0f172a', borderBottom: '2px solid #edf2f9', paddingBottom: '12px' }}>
              ⚖️ Litigios y Expedientes ({litigiosCliente.length})
            </h2>

            {litigiosCliente.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                Este cliente no tiene litigios activos registrados.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {litigiosCliente.map((l) => (
                  <div key={l.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', borderLeft: `4px solid ${getRiesgoStyle(l.monto_contingencia).color}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, color: '#0f172a', fontSize: '1.05rem', textTransform: 'uppercase' }}>
                        Exp. {l.expediente}
                      </h4>
                      <span style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: '#e2e8f0', color: '#475569', textTransform: 'uppercase' }}>
                        {l.materia}
                      </span>
                    </div>

                    <p style={{ margin: '8px 0 4px 0', fontSize: '0.9rem', color: '#475569' }}>
                      <strong>Contraparte:</strong> {l.contraparte || 'No especificada'}
                    </p>
                    <p style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: '#475569' }}>
                      <strong>Fase actual:</strong> <span style={{ color: '#2563eb', fontWeight: '600', textTransform: 'capitalize' }}>{l.fase_procesal}</span>
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 'bold', ...getRiesgoStyle(l.monto_contingencia) }}>
                        Riesgo: {formatearDinero(l.monto_contingencia)}
                      </span>

                      <button
                        onClick={() => navigate(`/detalle-juicio/${l.id}`, { state: { juicio: l } })}
                        style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem' }}
                      >
                        👁️ Ver Bitácora
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}

export default DetalleCliente;