import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import toast from 'react-hot-toast';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

function Dashboard() {
  const navigate = useNavigate();
  const [contratos, setContratos] = useState([]);
  const [litigios, setLitigios] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);

  // --- ESTADOS CONECTADOS A LOS ENDPOINTS DE MÉTRICAS DEL BACKEND ---
  const [kpisBackend, setKpisBackend] = useState({
    contratos_activos: 0,
    contratos_por_vencer_30_dias: 0,
    riesgo_economico_total: 0,
    litigios_por_materia: {}
  });
  const [tiemposPorFase, setTiemposPorFase] = useState([]);
  const [riesgoPorProbabilidad, setRiesgoPorProbabilidad] = useState([]);
  const [cargaTrabajo, setCargaTrabajo] = useState([]);

  // --- ESTADOS DEL BUSCADOR ---
  const [busquedaContratos, setBusquedaContratos] = useState('');
  const [busquedaLitigios, setBusquedaLitigios] = useState('');

  // --- ESTADOS PARA MODALES ---
  const [modalConfirmacionVisible, setModalConfirmacionVisible] = useState(false);
  const [contratoPendienteDeCambio, setContratoPendienteDeCambio] = useState(null);
  const [modalEliminarVisible, setModalEliminarVisible] = useState(false);
  const [itemAEliminar, setItemAEliminar] = useState(null);

  // --- ESTADOS DEL ASISTENTE DE REGLAS JURÍDICAS ---
  const [chatVisible, setChatVisible] = useState(false);
  const [chatMensajes, setChatMensajes] = useState([]);
  const [escribiendoIA, setEscribiendoIA] = useState(false);
  const [mensajeInput, setMensajeInput] = useState('');
  const [chatJuicioActivo, setChatJuicioActivo] = useState(null);

  const COLORES = ['#0d6efd', '#20c997', '#fd7e14', '#6f42c1', '#dc3545'];

  const procesarVencimientos = (listaContratos) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return listaContratos.map(contrato => {
      if (contrato.fecha_vencimiento && contrato.estatus !== 'Terminado') {
        const fechaLimpia = contrato.fecha_vencimiento.split('T')[0];
        const fechaVencimiento = new Date(`${fechaLimpia}T00:00:00`);
        if (fechaVencimiento < hoy) {
          return { ...contrato, estatus: 'Vencido' };
        }
      }
      return contrato;
    });
  };

  const cargarTodo = async () => {
    const [
      resContratos,
      resLitigios,
      resClientes,
      resKpis,
      resTiempos,
      resRiesgoProb,
      resCarga
    ] = await Promise.allSettled([
      api.get('/contratos'),
      api.get('/litigios'),
      api.get('/clientes/'),
      api.get('/dashboard/kpis'),
      api.get('/metricas/tiempo-promedio-fases'),
      api.get('/metricas/riesgo-financiero'),
      api.get('/metricas/carga-trabajo')
    ]);

    if (resContratos.status === 'fulfilled') {
      setContratos(procesarVencimientos(resContratos.value.data));
    } else if (resContratos.reason?.response?.status === 401) {
      return cerrarSesion();
    }

    if (resLitigios.status === 'fulfilled') setLitigios(resLitigios.value.data);
    if (resClientes.status === 'fulfilled') setClientes(resClientes.value.data);
    if (resKpis.status === 'fulfilled' && resKpis.value.data?.kpis) {
      setKpisBackend(resKpis.value.data.kpis);
    }
    if (resTiempos.status === 'fulfilled') setTiemposPorFase(resTiempos.value.data);
    if (resRiesgoProb.status === 'fulfilled') setRiesgoPorProbabilidad(resRiesgoProb.value.data);
    if (resCarga.status === 'fulfilled') setCargaTrabajo(resCarga.value.data);

    setCargando(false);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }
    cargarTodo();
  }, [navigate]);

  const cerrarSesion = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const obtenerNombreCliente = (cliente_id) => {
    if (!cliente_id) return 'Sin Cliente';
    const cliente = clientes.find(c => c.id === cliente_id);
    return cliente ? cliente.nombre_completo : 'Cliente Desconocido';
  };

  const solicitarEliminacion = (id, tipo, nombre) => {
    setItemAEliminar({ id, tipo, nombre });
    setModalEliminarVisible(true);
  };

  const confirmarEliminacion = async () => {
    if (!itemAEliminar) return;
    try {
      if (itemAEliminar.tipo === 'contrato') {
        await api.delete(`/contratos/${itemAEliminar.id}`);
        toast.success('Contrato eliminado correctamente');
      } else {
        await api.delete(`/litigios/${itemAEliminar.id}`);
        toast.success('Juicio eliminado correctamente');
      }
      await cargarTodo();
    } catch (error) {
      const detalle = error.response?.data?.detail || 'No se pudo eliminar el registro (requiere rol admin).';
      toast.error(detalle);
    } finally {
      setModalEliminarVisible(false);
      setItemAEliminar(null);
    }
  };

  const exportarCSV = (datos, tipo) => {
    if (datos.length === 0) {
      toast.error(`No hay datos de ${tipo} para exportar.`);
      return;
    }

    const cabeceras = tipo === 'contratos'
      ? ['ID', 'Tipo de Contrato', 'Cliente', 'Contraparte', 'Estatus', 'Fecha Vencimiento', 'Monto Operación']
      : ['ID', 'Expediente', 'Cliente', 'Materia', 'Fase Procesal', 'Monto Contingencia'];

    const filas = datos.map(item => {
      if (tipo === 'contratos') {
        return [
          item.id,
          item.tipo_contrato,
          obtenerNombreCliente(item.cliente_id),
          item.contraparte,
          item.estatus,
          item.fecha_vencimiento || 'N/A',
          item.monto_operacion || 0
        ];
      }
      return [
        item.id,
        item.expediente,
        obtenerNombreCliente(item.cliente_id),
        item.materia,
        item.fase_procesal,
        item.monto_contingencia || 0
      ];
    });

    const contenidoCSV = [
      cabeceras.join(','),
      ...filas.map(fila => fila.map(valor => `"${valor}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Reporte_${tipo}_PluriOne.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Reporte de ${tipo} descargado`);
  };

  const analizarConReglas = async (juicio) => {
    setChatJuicioActivo(juicio);
    setChatVisible(true);
    setChatMensajes([
      { rol: 'user', texto: `Evalúa el expediente ${juicio.expediente} (${juicio.materia}) y dame el diagnóstico procesal.` }
    ]);
    setEscribiendoIA(true);

    try {
      const respuesta = await api.get(`/litigios/${juicio.id}/analizar`);
      setChatMensajes(prev => [...prev, { rol: 'ai', texto: respuesta.data.analisis }]);
    } catch {
      setChatMensajes(prev => [...prev, { rol: 'ai', texto: '❌ Error de conexión con el servidor.' }]);
    } finally {
      setEscribiendoIA(false);
    }
  };

  const enviarMensajeManual = async (e) => {
    e.preventDefault();
    if (!mensajeInput.trim() || !chatJuicioActivo) return;

    const textoUsuario = mensajeInput;
    setMensajeInput('');
    setChatMensajes(prev => [...prev, { rol: 'user', texto: textoUsuario }]);
    setEscribiendoIA(true);

    try {
      const respuesta = await api.post(`/litigios/${chatJuicioActivo.id}/chat`, { texto: textoUsuario });
      setChatMensajes(prev => [...prev, { rol: 'ai', texto: respuesta.data.respuesta }]);
    } catch {
      setChatMensajes(prev => [...prev, { rol: 'ai', texto: '❌ Error al consultar el motor de reglas.' }]);
    } finally {
      setEscribiendoIA(false);
    }
  };

  const intentarCambiarEstatus = (idContrato, nuevoEstatus) => {
    const contrato = contratos.find(c => c.id === idContrato);
    setContratoPendienteDeCambio({
      id: idContrato,
      nuevoEstatus,
      contraparte: contrato.contraparte
    });
    setModalConfirmacionVisible(true);
  };

  const confirmarCambioEstatus = async () => {
    if (!contratoPendienteDeCambio) return;
    try {
      await api.put(`/contratos/${contratoPendienteDeCambio.id}/estatus`, {
        estatus: contratoPendienteDeCambio.nuevoEstatus
      });
      await cargarTodo();
      toast.success('Estatus actualizado correctamente');
    } catch {
      toast.error('Error al actualizar el estatus.');
    } finally {
      setModalConfirmacionVisible(false);
      setContratoPendienteDeCambio(null);
    }
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

  const contratosFiltrados = contratos.filter(c =>
    (c.contraparte || '').toLowerCase().includes(busquedaContratos.toLowerCase()) ||
    (c.tipo_contrato || '').toLowerCase().includes(busquedaContratos.toLowerCase()) ||
    (c.estatus || '').toLowerCase().includes(busquedaContratos.toLowerCase()) ||
    obtenerNombreCliente(c.cliente_id).toLowerCase().includes(busquedaContratos.toLowerCase())
  );

  const litigiosFiltrados = litigios.filter(l =>
    (l.expediente || '').toLowerCase().includes(busquedaLitigios.toLowerCase()) ||
    (l.materia || '').toLowerCase().includes(busquedaLitigios.toLowerCase()) ||
    (l.fase_procesal || '').toLowerCase().includes(busquedaLitigios.toLowerCase()) ||
    obtenerNombreCliente(l.cliente_id).toLowerCase().includes(busquedaLitigios.toLowerCase())
  );

  const formatearDinero = (monto) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto || 0);

  const datosPastel = Object.entries(kpisBackend.litigios_por_materia || {}).map(([name, value]) => ({
    name,
    value
  }));

  const datosBarras = Object.entries(
    contratos.reduce((acc, con) => {
      acc[con.estatus] = (acc[con.estatus] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, cantidad]) => ({ name, cantidad }));

  const styles = {
    pageBg: { backgroundColor: '#f4f7f6', minHeight: '100vh', padding: '40px 20px', fontFamily: "'Segoe UI', Roboto, sans-serif" },
    container: { maxWidth: '1240px', margin: '0 auto' },
    card: { backgroundColor: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #edf2f9' },
    kpiCard: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: '12px', padding: '22px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', borderLeft: '5px solid #0d6efd' },
    kpiTitle: { margin: 0, color: '#6c757d', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' },
    kpiNumber: { margin: '8px 0 0 0', fontSize: '2.2rem', color: '#2b3445', fontWeight: 'bold' },
    itemCard: { backgroundColor: '#fff', border: '1px solid #edf2f9', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' },
    btnYellow: { padding: '8px 14px', backgroundColor: '#ffc107', color: '#212529', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' },
    btnPurple: { padding: '8px 14px', backgroundColor: '#6f42c1', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' },
    btnDangerOutline: { padding: '6px 10px', backgroundColor: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 },
    modalBox: { backgroundColor: '#fff', padding: '30px', borderRadius: '12px', width: '420px', maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', textAlign: 'center' }
  };

  return (
    <div style={styles.pageBg}>
      <div style={styles.container}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <h1 style={{ margin: 0, color: '#2b3445', fontSize: '2.2rem' }}>Panel de Indicadores Jurídicos</h1>
            <p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>Métricas calculadas en tiempo real desde el motor analítico (FastAPI + PostgreSQL)</p>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => navigate('/registrar-usuario')} style={{ padding: '10px 20px', backgroundColor: '#0f766e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              🛡️ Nuevo Usuario
            </button>
            <button onClick={cerrarSesion} style={{ padding: '10px 20px', backgroundColor: '#fff', color: '#dc3545', border: '1px solid #dc3545', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              Cerrar Sesión
            </button>
          </div>
        </div>

        {cargando ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#6c757d' }}>Cargando métricas jurídicas...</div>
        ) : (
          <>
            {/* SECCIÓN 1: 4 KPIs DESDE EL BACKEND */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
              <div style={styles.kpiCard}>
                <div>
                  <h3 style={styles.kpiTitle}>Contratos Activos</h3>
                  <p style={styles.kpiNumber}>{kpisBackend.contratos_activos}</p>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>De {contratos.length} registrados</span>
                </div>
                <div style={{ fontSize: '2.5rem', opacity: 0.8 }}>📄</div>
              </div>

              <div style={{ ...styles.kpiCard, borderLeftColor: '#eab308' }}>
                <div>
                  <h3 style={styles.kpiTitle}>Por Vencer (≤ 30 días)</h3>
                  <p style={{ ...styles.kpiNumber, color: '#b45309' }}>{kpisBackend.contratos_por_vencer_30_dias || 0}</p>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Alerta preventiva</span>
                </div>
                <div style={{ fontSize: '2.5rem', opacity: 0.8 }}>⏳</div>
              </div>

              <div style={{ ...styles.kpiCard, borderLeftColor: '#fd7e14' }}>
                <div>
                  <h3 style={styles.kpiTitle}>Litigios Activos</h3>
                  <p style={styles.kpiNumber}>{litigios.length}</p>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>En seguimiento procesal</span>
                </div>
                <div style={{ fontSize: '2.5rem', opacity: 0.8 }}>⚖️</div>
              </div>

              <div style={{ ...styles.kpiCard, borderLeftColor: '#dc3545' }}>
                <div>
                  <h3 style={styles.kpiTitle}>Riesgo Económico</h3>
                  <p style={{ ...styles.kpiNumber, color: '#dc3545', fontSize: '1.7rem' }}>
                    {formatearDinero(kpisBackend.riesgo_economico_total)}
                  </p>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Contingencia total</span>
                </div>
                <div style={{ fontSize: '2.5rem', opacity: 0.8 }}>💰</div>
              </div>
            </div>

            {/* SECCIÓN 2: GRÁFICAS PRINCIPALES */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '30px' }}>
              <div style={{ ...styles.card, height: '350px' }}>
                <h3 style={{ margin: '0 0 15px 0', textAlign: 'center', color: '#2b3445' }}>Juicios por Materia</h3>
                <ResponsiveContainer width="100%" height="88%">
                  <PieChart>
                    <Pie data={datosPastel} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" label>
                      {datosPastel.map((_, index) => <Cell key={`cell-${index}`} fill={COLORES[index % COLORES.length]} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={{ ...styles.card, height: '350px' }}>
                <h3 style={{ margin: '0 0 15px 0', textAlign: 'center', color: '#2b3445' }}>Estatus de Contratos</h3>
                <ResponsiveContainer width="100%" height="88%">
                  <BarChart data={datosBarras}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip />
                    <Bar dataKey="cantidad" fill="#0d6efd" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* SECCIÓN 3: NUEVAS MÉTRICAS JURÍDICAS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '30px' }}>
              <div style={{ ...styles.card, height: '320px' }}>
                <h3 style={{ margin: '0 0 6px 0', color: '#0f172a', fontSize: '1.05rem' }}>⏱️ Duración Promedio por Fase</h3>
                <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>Calculado desde la bitácora procesal</p>
                {tiemposPorFase.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Sin datos suficientes aún.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="80%">
                    <BarChart data={tiemposPorFase} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" unit=" d" />
                      <YAxis dataKey="fase" type="category" width={95} style={{ fontSize: '0.8rem' }} />
                      <Tooltip formatter={(val) => [`${val} días`, 'Promedio']} />
                      <Bar dataKey="dias_promedio" fill="#4f46e5" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div style={{ ...styles.card, height: '320px' }}>
                <h3 style={{ margin: '0 0 6px 0', color: '#0f172a', fontSize: '1.05rem' }}>📊 Exposición por Probabilidad</h3>
                <p style={{ margin: '0 0 15px 0', fontSize: '0.8rem', color: '#64748b' }}>Endpoint: /metricas/riesgo-financiero</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {riesgoPorProbabilidad.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Sin litigios evaluados.</p>
                  ) : (
                    riesgoPorProbabilidad.map((item, idx) => (
                      <div key={idx} style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '600', color: '#334155', textTransform: 'capitalize' }}>
                          Probabilidad {item.probabilidad}
                        </span>
                        <span style={{ fontWeight: 'bold', color: '#dc2626' }}>
                          {formatearDinero(item.monto_total)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div style={{ ...styles.card, height: '320px', overflowY: 'auto' }}>
                <h3 style={{ margin: '0 0 6px 0', color: '#0f172a', fontSize: '1.05rem' }}>👩‍⚖️ Carga por Abogado</h3>
                <p style={{ margin: '0 0 15px 0', fontSize: '0.8rem', color: '#64748b' }}>Endpoint: /metricas/carga-trabajo</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {cargaTrabajo.map((u) => (
                    <div key={u.usuario_id} style={{ backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '0.92rem' }}>{u.nombre}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase' }}>{u.rol}</div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '0.82rem', color: '#334155' }}>
                        <div><strong>{u.carga_total_asuntos}</strong> asuntos</div>
                        <div style={{ color: '#64748b' }}>{u.total_contratos} cont. | {u.total_litigios} juicios</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SECCIÓN 4: LISTADOS OPERATIVOS */}
            <div style={{ display: 'flex', gap: '24px' }}>
              
              {/* COLUMNA 1: CONTRATOS */}
              <div style={{ flex: 1, ...styles.card }}>
                <div style={{ borderBottom: '2px solid #edf2f9', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '1.4rem', color: '#2b3445', margin: 0 }}>📄 Últimos Contratos</h2>
                  <button onClick={() => exportarCSV(contratos, 'contratos')} style={{ padding: '6px 12px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>
                    📥 Excel
                  </button>
                </div>
                
                <input 
                  type="text" 
                  placeholder="Buscar por cliente, contraparte, tipo o estatus..." 
                  value={busquedaContratos}
                  onChange={(e) => setBusquedaContratos(e.target.value)}
                  style={{ width: '100%', padding: '10px', marginTop: '15px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
                  {contratosFiltrados.length === 0 ? <p style={{ color: '#6c757d' }}>No se encontraron contratos.</p> : contratosFiltrados.map((c) => (
                    <div key={c.id} style={{ ...styles.itemCard, borderLeft: `4px solid ${getEstatusStyle(c.estatus).color}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: 0, textTransform: 'capitalize', color: '#2b3445', fontSize: '1.05rem' }}>
                          {c.tipo_contrato}
                        </h4>
                        
                        <select 
                          value={c.estatus}
                          onChange={(e) => intentarCambiarEstatus(c.id, e.target.value)}
                          style={{ 
                            padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold',
                            textTransform: 'uppercase', cursor: 'pointer', border: '1px solid transparent',
                            outline: 'none', textAlign: 'center', ...getEstatusStyle(c.estatus) 
                          }}
                        >
                          <option value="Borrador">Borrador</option>
                          <option value="En Revisión">En Revisión</option>
                          <option value="Activo">Activo</option>
                          <option value="Vencido">Vencido</option>
                          <option value="Terminado">Terminado</option>
                        </select>
                      </div>

                      <p style={{ margin: '6px 0 0 0', fontSize: '0.95rem', color: '#2563eb', fontWeight: '600' }}>
                        Cliente: {obtenerNombreCliente(c.cliente_id)}
                      </p>
                      
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.9rem', color: '#6c757d' }}>
                        Contraparte: <strong style={{ color: '#2b3445' }}>{c.contraparte}</strong>
                      </p>
                      
                      {c.fecha_vencimiento && (
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: c.estatus === 'Vencido' ? '#dc3545' : '#6c757d' }}>
                          Vence el: {c.fecha_vencimiento.split('T')[0]}
                        </p>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 'bold', color: '#198754' }}>
                          Monto: {formatearDinero(c.monto_operacion || 0)}
                        </p>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => navigate(`/editar-contrato/${c.id}`, { state: { contrato: c } })}
                            style={{ padding: '6px 10px', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem' }}
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => solicitarEliminacion(c.id, 'contrato', `${c.tipo_contrato} (${c.contraparte})`)}
                            style={styles.btnDangerOutline}
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* COLUMNA 2: JUICIOS */}
              <div style={{ flex: 1, ...styles.card }}>
                <div style={{ borderBottom: '2px solid #edf2f9', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '1.4rem', color: '#2b3445', margin: 0 }}>⚖️ Juicios Activos</h2>
                  <button onClick={() => exportarCSV(litigios, 'litigios')} style={{ padding: '6px 12px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>
                    📥 Excel
                  </button>
                </div>

                <input 
                  type="text" 
                  placeholder="Buscar por cliente, expediente, materia..." 
                  value={busquedaLitigios}
                  onChange={(e) => setBusquedaLitigios(e.target.value)}
                  style={{ width: '100%', padding: '10px', marginTop: '15px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
                  {litigiosFiltrados.length === 0 ? <p style={{ color: '#6c757d' }}>No se encontraron litigios.</p> : litigiosFiltrados.map((l) => (
                    <div key={l.id} style={{ ...styles.itemCard, borderLeft: `4px solid ${getRiesgoStyle(l.monto_contingencia).color}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: 0, color: '#2b3445', fontSize: '1.05rem', textTransform: 'uppercase' }}>
                          Exp. {l.expediente}
                        </h4>
                        <span style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: '#e2e8f0', color: '#475569', textTransform: 'uppercase' }}>
                          {l.materia}
                        </span>
                      </div>
                      
                      <p style={{ margin: '6px 0 0 0', fontSize: '0.95rem', color: '#4f46e5', fontWeight: '600' }}>
                        Cliente: {obtenerNombreCliente(l.cliente_id)}
                      </p>

                      <p style={{ margin: '2px 0 0 0', fontSize: '0.9rem', color: '#6c757d' }}>
                        Fase actual: <strong style={{ color: '#2b3445', textTransform: 'capitalize' }}>{l.fase_procesal}</strong>
                      </p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', fontWeight: 'bold', color: '#2b3445' }}>
                        Riesgo: <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', ...getRiesgoStyle(l.monto_contingencia) }}>
                          {formatearDinero(l.monto_contingencia)}
                        </span>
                      </p>
                      
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => navigate(`/detalle-juicio/${l.id}`, { state: { juicio: l } })} 
                            style={{ padding: '8px 12px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                          >
                            👁️ Detalles
                          </button>
                          <button onClick={() => navigate(`/actualizar-juicio/${l.id}`, { state: { juicio: l } })} style={styles.btnYellow}>
                            Actualizar
                          </button>
                          <button onClick={() => analizarConReglas(l)} style={styles.btnPurple}>
                            ⚖️ Diagnóstico
                          </button>
                        </div>
                        
                        <button
                          onClick={() => solicitarEliminacion(l.id, 'litigio', `Exp. ${l.expediente}`)}
                          style={styles.btnDangerOutline}
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </>
        )}
      </div>

      {/* MODAL CAMBIO DE ESTATUS */}
      {modalConfirmacionVisible && contratoPendienteDeCambio && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={{ fontSize: '3rem', marginBottom: '15px' }}>⚠️</div>
            <h3 style={{ margin: '0 0 10px 0', color: '#2b3445', fontSize: '1.4rem' }}>¿Confirmar cambio?</h3>
            <p style={{ color: '#6c757d', marginBottom: '25px', lineHeight: '1.5' }}>
              Cambiarás el estatus del contrato con <strong>{contratoPendienteDeCambio.contraparte}</strong> a <strong>{contratoPendienteDeCambio.nuevoEstatus.toUpperCase()}</strong>.
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button onClick={() => setModalConfirmacionVisible(false)} style={{ padding: '10px 20px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Cancelar
              </button>
              <button onClick={confirmarCambioEstatus} style={{ padding: '10px 20px', backgroundColor: '#0d6efd', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Sí, cambiar estatus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ELIMINACIÓN */}
      {modalEliminarVisible && itemAEliminar && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🗑️</div>
            <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '1.4rem' }}>¿Eliminar registro?</h3>
            <p style={{ color: '#64748b', marginBottom: '25px', lineHeight: '1.5' }}>
              Eliminarás permanentemente <strong>{itemAEliminar.nombre}</strong> (requiere permisos de Administrador).
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button onClick={() => setModalEliminarVisible(false)} style={{ padding: '10px 20px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Cancelar
              </button>
              <button onClick={confirmarEliminacion} style={{ padding: '10px 20px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PANEL LATERAL: MOTOR DE REGLAS JURÍDICAS */}
      {chatVisible && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', justifyContent: 'flex-end', zIndex: 9999 }} onClick={() => setChatVisible(false)}>
          <div style={{ width: '450px', maxWidth: '100%', height: '100%', backgroundColor: '#f4f7f6', display: 'flex', flexDirection: 'column', boxShadow: '-5px 0 20px rgba(0,0,0,0.15)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px', backgroundColor: '#2b3445', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>⚖️ Motor de Reglas Jurídicas</h3>
              <button onClick={() => setChatVisible(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>✖</button>
            </div>
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {chatMensajes.map((msg, idx) => (
                <div key={idx} style={msg.rol === 'user'
                  ? { alignSelf: 'flex-end', backgroundColor: '#0d6efd', color: '#fff', padding: '12px 16px', borderRadius: '15px 15px 0 15px', maxWidth: '85%', fontSize: '0.95rem' }
                  : { alignSelf: 'flex-start', backgroundColor: '#fff', color: '#2b3445', padding: '16px', borderRadius: '15px 15px 15px 0', maxWidth: '90%', fontSize: '0.95rem', border: '1px solid #ddd', whiteSpace: 'pre-wrap' }
                }>
                  <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '6px', fontWeight: 'bold' }}>
                    {msg.rol === 'user' ? 'Consulta' : 'Sistema Experto PluriOne'}
                  </div>
                  <div>{msg.texto}</div>
                </div>
              ))}
              {escribiendoIA && <div style={{ fontStyle: 'italic', color: '#64748b' }}>Evaluando reglas procesales...</div>}
            </div>
            <div style={{ padding: '15px', backgroundColor: '#fff', borderTop: '1px solid #ddd' }}>
              <form onSubmit={enviarMensajeManual} style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={mensajeInput}
                  onChange={(e) => setMensajeInput(e.target.value)}
                  placeholder="Ej. peor escenario, acuerdo, tiempo, pruebas..."
                  style={{ flex: 1, padding: '12px 15px', borderRadius: '25px', border: '1px solid #ccc', outline: 'none' }}
                />
                <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#0d6efd', color: '#fff', border: 'none', borderRadius: '25px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Consultar
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;