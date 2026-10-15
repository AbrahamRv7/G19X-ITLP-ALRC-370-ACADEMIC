import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import toast from 'react-hot-toast';

function Clientes() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [litigios, setLitigios] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  // Estado para el modal de eliminación de cliente
  const [clienteAEliminar, setClienteAEliminar] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }

    const cargarDirectorio = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [resClientes, resLitigios, resContratos] = await Promise.allSettled([
          api.get('/clientes/', { headers }),
          api.get('/litigios', { headers }),
          api.get('/contratos', { headers })
        ]);

        if (resClientes.status === 'fulfilled') setClientes(resClientes.value.data);
        if (resLitigios.status === 'fulfilled') setLitigios(resLitigios.value.data);
        if (resContratos.status === 'fulfilled') setContratos(resContratos.value.data);
      } catch (error) {
        toast.error('Error al cargar el directorio de clientes.');
        console.error(error);
      } finally {
        setCargando(false);
      }
    };

    cargarDirectorio();
  }, [navigate]);

  const confirmarEliminarCliente = async () => {
    if (!clienteAEliminar) return;
    try {
      const token = localStorage.getItem('token');
      await api.delete(`/clientes/${clienteAEliminar.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClientes(clientes.filter(c => c.id !== clienteAEliminar.id));
      toast.success('Cliente eliminado del directorio');
    } catch (error) {
      toast.error('Error al eliminar el cliente.');
      console.error(error);
    } finally {
      setClienteAEliminar(null);
    }
  };

  const obtenerEstadisticasCliente = (clienteId) => {
    const juiciosDelCliente = litigios.filter(l => l.cliente_id === clienteId);
    const montoRiesgo = juiciosDelCliente.reduce(
      (acc, l) => acc + (parseFloat(l.monto_contingencia) || 0), 
      0
    );

    const contratosDelCliente = contratos.filter(c => c.cliente_id === clienteId);
    const montoContratos = contratosDelCliente.reduce(
      (acc, c) => acc + (parseFloat(c.monto_operacion) || 0),
      0
    );

    return {
      cantidadJuicios: juiciosDelCliente.length,
      montoRiesgo,
      cantidadContratos: contratosDelCliente.length,
      montoContratos
    };
  };

  const formatearDinero = (monto) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto);

  const formatearFecha = (fechaIso) => {
    if (!fechaIso) return 'N/A';
    return new Date(fechaIso).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const clientesFiltrados = clientes.filter((c) => {
    const termino = busqueda.toLowerCase();
    return (
      c.nombre_completo?.toLowerCase().includes(termino) ||
      (c.rfc && c.rfc.toLowerCase().includes(termino)) ||
      (c.correo && c.correo.toLowerCase().includes(termino)) ||
      (c.telefono && c.telefono.toLowerCase().includes(termino))
    );
  });

  const exportarDirectorioCSV = () => {
    if (clientes.length === 0) {
      toast.error('No hay clientes registrados para exportar.');
      return;
    }

    const cabeceras = [
      'ID',
      'Nombre / Razón Social',
      'RFC',
      'Correo Electrónico',
      'Teléfono',
      'Contratos Vinculados',
      'Monto en Contratos (MXN)',
      'Juicios Vinculados',
      'Riesgo en Litigios (MXN)',
      'Fecha de Registro'
    ];

    const filas = clientes.map((c) => {
      const stats = obtenerEstadisticasCliente(c.id);
      return [
        c.id,
        c.nombre_completo,
        c.rfc || 'Sin RFC',
        c.correo || 'Sin Correo',
        c.telefono || 'Sin Teléfono',
        stats.cantidadContratos,
        stats.montoContratos,
        stats.cantidadJuicios,
        stats.montoRiesgo,
        formatearFecha(c.creado_en)
      ];
    });

    const contenidoCSV = [
      cabeceras.join(','),
      ...filas.map((fila) => fila.map((valor) => `"${valor}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Directorio_Clientes_PluriOne.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Directorio de clientes descargado');
  };

  const clientesConContratos = clientes.filter(
    (c) => obtenerEstadisticasCliente(c.id).cantidadContratos > 0
  ).length;

  const clientesConJuicios = clientes.filter(
    (c) => obtenerEstadisticasCliente(c.id).cantidadJuicios > 0
  ).length;

  return (
    <div style={{ backgroundColor: '#f4f7f6', minHeight: '100vh', padding: '40px 20px', fontFamily: "'Segoe UI', Roboto, sans-serif" }}>
      <div style={{ maxWidth: '1250px', margin: '0 auto' }}>
        
        {/* ENCABEZADO */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h1 style={{ margin: 0, color: '#0f172a', fontSize: '2.2rem' }}>📇 Directorio de Clientes</h1>
            <p style={{ margin: '5px 0 0 0', color: '#64748b' }}>
              Padrón corporativo con consolidado de contratos y litigios por cliente
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={exportarDirectorioCSV}
              style={{ padding: '10px 18px', backgroundColor: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem' }}
            >
              📥 Exportar Excel
            </button>
            <button
              onClick={() => navigate('/nuevo-cliente')}
              style={{ padding: '10px 20px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.25)' }}
            >
              + Nuevo Cliente
            </button>
          </div>
        </div>

        {/* TARJETAS KPI DEL DIRECTORIO */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '30px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', borderLeft: '5px solid #10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', textTransform: 'uppercase' }}>Total Clientes</h3>
              <p style={{ margin: '8px 0 0 0', fontSize: '2.5rem', fontWeight: 'bold', color: '#0f172a' }}>{clientes.length}</p>
            </div>
            <span style={{ fontSize: '2.8rem', opacity: 0.85 }}>👥</span>
          </div>

          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', borderLeft: '5px solid #2563eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', textTransform: 'uppercase' }}>Clientes con Contratos</h3>
              <p style={{ margin: '8px 0 0 0', fontSize: '2.5rem', fontWeight: 'bold', color: '#0f172a' }}>{clientesConContratos}</p>
            </div>
            <span style={{ fontSize: '2.8rem', opacity: 0.85 }}>📄</span>
          </div>

          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', borderLeft: '5px solid #4f46e5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', textTransform: 'uppercase' }}>Clientes en Litigio</h3>
              <p style={{ margin: '8px 0 0 0', fontSize: '2.5rem', fontWeight: 'bold', color: '#0f172a' }}>{clientesConJuicios}</p>
            </div>
            <span style={{ fontSize: '2.8rem', opacity: 0.85 }}>⚖️</span>
          </div>
        </div>

        {/* BARRA DE BÚSQUEDA Y TABLA */}
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '28px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #edf2f9' }}>
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="🔍 Buscar cliente por nombre, razón social, RFC, correo o teléfono..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outlineColor: '#10b981', boxSizing: 'border-box', backgroundColor: '#f8fafc' }}
            />
          </div>

          {cargando ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              Cargando directorio de clientes...
            </div>
          ) : clientesFiltrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
              No se encontraron clientes que coincidan con la búsqueda.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.82rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '14px 10px' }}>ID</th>
                    <th style={{ padding: '14px 10px' }}>Nombre / Razón Social</th>
                    <th style={{ padding: '14px 10px' }}>RFC</th>
                    <th style={{ padding: '14px 10px' }}>Contacto</th>
                    <th style={{ padding: '14px 10px', textAlign: 'center' }}>Contratos</th>
                    <th style={{ padding: '14px 10px', textAlign: 'center' }}>Juicios Activos</th>
                    <th style={{ padding: '14px 10px' }}>Riesgo en Litigio</th>
                    <th style={{ padding: '14px 10px' }}>Alta</th>
                    <th style={{ padding: '14px 10px', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clientesFiltrados.map((cliente) => {
                    const stats = obtenerEstadisticasCliente(cliente.id);
                    return (
                      <tr key={cliente.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.93rem', color: '#1e293b' }}>
                        <td style={{ padding: '16px 10px', fontWeight: 'bold', color: '#64748b' }}>
                          #{cliente.id}
                        </td>
                        <td style={{ padding: '16px 10px', fontWeight: '600', color: '#0f172a' }}>
                          {cliente.nombre_completo}
                        </td>
                        <td style={{ padding: '16px 10px' }}>
                          {cliente.rfc ? (
                            <span style={{ backgroundColor: '#f1f5f9', color: '#334155', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', fontFamily: 'monospace' }}>
                              {cliente.rfc.toUpperCase()}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No registrado</span>
                          )}
                        </td>
                        <td style={{ padding: '16px 10px', fontSize: '0.86rem', color: '#475569' }}>
                          <div>📧 {cliente.correo || 'Sin correo'}</div>
                          <div style={{ marginTop: '4px', color: '#64748b' }}>📞 {cliente.telefono || 'Sin teléfono'}</div>
                        </td>
                        <td style={{ padding: '16px 10px', textAlign: 'center' }}>
                          <div>
                            <span style={{
                              backgroundColor: stats.cantidadContratos > 0 ? '#dbeafe' : '#f1f5f9',
                              color: stats.cantidadContratos > 0 ? '#1d4ed8' : '#64748b',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '0.8rem',
                              fontWeight: 'bold'
                            }}>
                              {stats.cantidadContratos} {stats.cantidadContratos === 1 ? 'contrato' : 'contratos'}
                            </span>
                          </div>
                          {stats.montoContratos > 0 && (
                            <div style={{ marginTop: '5px', fontSize: '0.78rem', fontWeight: '600', color: '#0f766e' }}>
                              {formatearDinero(stats.montoContratos)}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '16px 10px', textAlign: 'center' }}>
                          <span style={{
                            backgroundColor: stats.cantidadJuicios > 0 ? '#e0e7ff' : '#f1f5f9',
                            color: stats.cantidadJuicios > 0 ? '#4338ca' : '#64748b',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            fontWeight: 'bold'
                          }}>
                            {stats.cantidadJuicios} {stats.cantidadJuicios === 1 ? 'expediente' : 'expedientes'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 10px', fontWeight: 'bold', color: stats.montoRiesgo > 0 ? '#dc2626' : '#16a34a' }}>
                          {formatearDinero(stats.montoRiesgo)}
                        </td>
                        <td style={{ padding: '16px 10px', fontSize: '0.85rem', color: '#64748b' }}>
                          {formatearFecha(cliente.creado_en)}
                        </td>
                      <td style={{ padding: '16px 10px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              onClick={() => navigate(`/detalle-cliente/${cliente.id}`, { state: { cliente } })}
                              style={{ padding: '6px 12px', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
                            >
                              👁️ Ficha 360°
                            </button>
                            <button
                              onClick={() => setClienteAEliminar(cliente)}
                              style={{ padding: '6px 12px', backgroundColor: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
                            >
                              🗑️ Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN DE CLIENTE */}
      {clienteAEliminar && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
          <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', width: '420px', maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🗑️</div>
            <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '1.4rem' }}>¿Dar de baja cliente?</h3>
            <p style={{ color: '#64748b', marginBottom: '25px', lineHeight: '1.5' }}>
              Estás por eliminar a <strong>{clienteAEliminar.nombre_completo}</strong> del directorio corporativo. Sus contratos o litigios asociados se conservarán como registros sin cliente asignado.
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button
                onClick={() => setClienteAEliminar(null)}
                style={{ padding: '10px 20px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminarCliente}
                style={{ padding: '10px 20px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Sí, eliminar cliente
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Clientes;