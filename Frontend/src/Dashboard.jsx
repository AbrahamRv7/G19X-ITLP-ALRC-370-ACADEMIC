import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import toast from 'react-hot-toast';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function Dashboard() {
  const navigate = useNavigate();
  const [contratos, setContratos] = useState([]);
  const [litigios, setLitigios] = useState([]);
  const [clientes, setClientes] = useState([]); // <-- NUEVO: Estado para clientes
  const [cargando, setCargando] = useState(true);

  // --- ESTADOS DEL BUSCADOR ---
  const [busquedaContratos, setBusquedaContratos] = useState('');
  const [busquedaLitigios, setBusquedaLitigios] = useState('');

  // --- ESTADOS PARA MODAL DE CONFIRMACIÓN ---
  const [modalConfirmacionVisible, setModalConfirmacionVisible] = useState(false);
  const [contratoPendienteDeCambio, setContratoPendienteDeCambio] = useState(null);

  // --- ESTADOS DEL CHAT IA ---
  const [chatVisible, setChatVisible] = useState(false);
  const [chatMensajes, setChatMensajes] = useState([]);
  const [escribiendoIA, setEscribiendoIA] = useState(false);
  const [mensajeInput, setMensajeInput] = useState('');
  const [chatJuicioActivo, setChatJuicioActivo] = useState(null);

  const COLORES = ['#0d6efd', '#20c997', '#fd7e14', '#6f42c1', '#dc3545'];

  // =================================================================
  // LÓGICA INTELIGENTE: CADUCIDAD AUTOMÁTICA DE CONTRATOS
  // =================================================================
  const procesarVencimientos = (listaContratos) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return listaContratos.map(contrato => {
      if (contrato.fecha_vencimiento && contrato.estatus !== 'Terminado') {
        const fechaVencimiento = new Date(`${contrato.fecha_vencimiento}T00:00:00`);
        if (fechaVencimiento < hoy) {
          return { ...contrato, estatus: 'Vencido' };
        }
      }
      return contrato;
    });
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }

    const cargarDatos = async () => {
      try {
        // <-- NUEVO: Bajamos también los clientes -->
        const [resContratos, resLitigios, resClientes] = await Promise.all([
          api.get('/contratos', { headers: { Authorization: `Bearer ${token}` } }),
          api.get('/litigios', { headers: { Authorization: `Bearer ${token}` } }),
          api.get('/clientes/', { headers: { Authorization: `Bearer ${token}` } }) 
        ]);
        
        const contratosActualizados = procesarVencimientos(resContratos.data);
        setContratos(contratosActualizados);
        setLitigios(resLitigios.data);
        setClientes(resClientes.data); // Guardamos los clientes
      } catch (error) {
        if (error.response?.status === 401) cerrarSesion();
      } finally {
        setCargando(false);
      }
    };
    cargarDatos();
  }, [navigate]);

  const cerrarSesion = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  // <-- NUEVO: Función para buscar el nombre del cliente -->
  const obtenerNombreCliente = (cliente_id) => {
    if (!cliente_id) return "Sin Cliente";
    const cliente = clientes.find(c => c.id === cliente_id);
    return cliente ? cliente.nombre_completo : "Cliente Desconocido";
  };

  // --- FUNCIÓN PARA EXPORTAR A EXCEL (CSV) ---
  const exportarCSV = (datos, tipo) => {
    if (datos.length === 0) {
      toast.error(`No hay datos de ${tipo} para exportar.`);
      return;
    }

    const cabeceras = tipo === 'contratos'
      ? ['ID', 'Tipo de Contrato', 'Contraparte', 'Estatus', 'Fecha Vencimiento', 'Monto Operación']
      : ['ID', 'Expediente', 'Cliente', 'Materia', 'Fase Procesal', 'Monto Contingencia'];

    const filas = datos.map(item => {
      if (tipo === 'contratos') {
        return [
          item.id,
          item.tipo_contrato,
          item.contraparte,
          item.estatus,
          item.fecha_vencimiento || 'N/A',
          item.monto_operacion || 0
        ];
      } else {
        return [
          item.id,
          item.expediente,
          obtenerNombreCliente(item.cliente_id), // Añadimos el cliente al Excel
          item.materia,
          item.fase_procesal,
          item.monto_contingencia || 0
        ];
      }
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

  // --- FUNCIONES DEL CHAT IA ---
  const analizarConIA = async (juicio) => {
    setChatJuicioActivo(juicio);
    setChatVisible(true);
    setChatMensajes([
      { rol: 'user', texto: `Analiza el expediente ${juicio.expediente} (${juicio.materia}) y dame tu recomendación.` }
    ]);
    setEscribiendoIA(true);

    try {
      const token = localStorage.getItem('token');
      const respuesta = await api.get(`/litigios/${juicio.id}/analizar`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChatMensajes(prev => [...prev, { rol: 'ai', texto: respuesta.data.analisis }]);
    } catch (error) {
      setChatMensajes(prev => [...prev, { rol: 'ai', texto: "❌ Error de conexión con el servidor." }]);
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
      const token = localStorage.getItem('token');
      const respuesta = await api.post(`/litigios/${chatJuicioActivo.id}/chat`, 
        { texto: textoUsuario }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setTimeout(() => {
        setChatMensajes(prev => [...prev, { rol: 'ai', texto: respuesta.data.respuesta }]);
        setEscribiendoIA(false);
      }, 1000);
    } catch (error) {
      setChatMensajes(prev => [...prev, { rol: 'ai', texto: "❌ Hubo un error de conexión con la base de conocimientos." }]);
      setEscribiendoIA(false);
    }
  };

  // --- FUNCIONES PARA EL MODAL DE ESTATUS DE CONTRATOS ---
  const intentarCambiarEstatus = (idContrato, nuevoEstatus) => {
    const contrato = contratos.find(c => c.id === idContrato);
    setContratoPendienteDeCambio({
      id: idContrato,
      nuevoEstatus: nuevoEstatus,
      contraparte: contrato.contraparte
    });
    setModalConfirmacionVisible(true);
  };

  const confirmarCambioEstatus = async () => {
    if (!contratoPendienteDeCambio) return;
    try {
      const token = localStorage.getItem('token');
      await api.put(`/contratos/${contratoPendienteDeCambio.id}/estatus`, 
        { estatus: contratoPendienteDeCambio.nuevoEstatus }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setContratos(contratos.map(c => 
        c.id === contratoPendienteDeCambio.id 
          ? { ...c, estatus: contratoPendienteDeCambio.nuevoEstatus } 
          : c
      ));
      toast.success('Estatus actualizado correctamente');
    } catch (error) {
      toast.error('Error al actualizar el estatus.');
      console.error(error);
    } finally {
      setModalConfirmacionVisible(false);
      setContratoPendienteDeCambio(null);
    }
  };

  const cancelarCambio = () => {
    setModalConfirmacionVisible(false);
    setContratoPendienteDeCambio(null);
  };

  // --- FUNCIONES DE COLORES DINÁMICOS ---
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

  // --- LÓGICA DE FILTRADO EN TIEMPO REAL ---
  const contratosFiltrados = contratos.filter(c => 
    c.contraparte.toLowerCase().includes(busquedaContratos.toLowerCase()) ||
    c.tipo_contrato.toLowerCase().includes(busquedaContratos.toLowerCase()) ||
    c.estatus.toLowerCase().includes(busquedaContratos.toLowerCase())
  );

  // <-- ACTUALIZADO: Filtrado inteligente que también busca por nombre de cliente -->
  const litigiosFiltrados = litigios.filter(l => 
    l.expediente.toLowerCase().includes(busquedaLitigios.toLowerCase()) ||
    l.materia.toLowerCase().includes(busquedaLitigios.toLowerCase()) ||
    l.fase_procesal.toLowerCase().includes(busquedaLitigios.toLowerCase()) ||
    obtenerNombreCliente(l.cliente_id).toLowerCase().includes(busquedaLitigios.toLowerCase())
  );

  // --- MATEMÁTICAS PARA GRÁFICAS Y KPIs ---
  const riesgoTotal = litigios.reduce((acc, lit) => acc + (parseFloat(lit.monto_contingencia) || 0), 0);
  const formatearDinero = (monto) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto);

  const datosPastel = Object.entries(
    litigios.reduce((acc, lit) => {
      acc[lit.materia] = (acc[lit.materia] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const datosBarras = Object.entries(
    contratos.reduce((acc, con) => {
      acc[con.estatus] = (acc[con.estatus] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, cantidad]) => ({ name, cantidad }));

  // --- ESTILOS GENERALES ---
  const styles = {
    pageBg: { backgroundColor: '#f4f7f6', minHeight: '100vh', padding: '40px 20px', fontFamily: "'Segoe UI', Roboto, sans-serif", position: 'relative' },
    container: { maxWidth: '1200px', margin: '0 auto' },
    card: { backgroundColor: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #edf2f9' },
    kpiCard: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', borderLeft: '5px solid #0d6efd' },
    kpiTitle: { margin: 0, color: '#6c757d', fontSize: '0.95rem', fontWeight: '600', textTransform: 'uppercase' },
    kpiNumber: { margin: '8px 0 0 0', fontSize: '2.8rem', color: '#2b3445', fontWeight: 'bold' },
    itemCard: { backgroundColor: '#fff', border: '1px solid #edf2f9', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', transition: 'transform 0.2s, box-shadow 0.2s' },
    btnYellow: { padding: '8px 16px', backgroundColor: '#ffc107', color: '#212529', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' },
    btnPurple: { padding: '8px 16px', backgroundColor: '#6f42c1', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' },
    
    // Estilos del Chat Copilot
    chatOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', justifyContent: 'flex-end', zIndex: 9999 },
    chatWindow: { width: '450px', maxWidth: '100%', height: '100%', backgroundColor: '#f4f7f6', display: 'flex', flexDirection: 'column', boxShadow: '-5px 0 20px rgba(0,0,0,0.15)' },
    chatHeader: { padding: '20px', backgroundColor: '#2b3445', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    chatBody: { flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' },
    msgUser: { alignSelf: 'flex-end', backgroundColor: '#0d6efd', color: '#fff', padding: '12px 16px', borderRadius: '15px 15px 0 15px', maxWidth: '85%', fontSize: '0.95rem' },
    msgAI: { alignSelf: 'flex-start', backgroundColor: '#fff', color: '#2b3445', padding: '16px', borderRadius: '15px 15px 15px 0', maxWidth: '90%', fontSize: '0.95rem', border: '1px solid #ddd', whiteSpace: 'pre-wrap' },
    typing: { alignSelf: 'flex-start', backgroundColor: '#e9ecef', color: '#6c757d', padding: '10px 15px', borderRadius: '15px', fontSize: '0.9rem', fontStyle: 'italic' },
    chatFooter: { padding: '15px', backgroundColor: '#fff', borderTop: '1px solid #ddd' },
    chatInput: { flex: 1, padding: '12px 15px', borderRadius: '25px', border: '1px solid #ccc', outline: 'none', fontSize: '0.95rem' },
    chatBtn: { padding: '10px 20px', backgroundColor: '#0d6efd', color: '#fff', border: 'none', borderRadius: '25px', cursor: 'pointer', fontWeight: 'bold' },
    
    // Estilos del Modal
    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 },
    modalBox: { backgroundColor: '#fff', padding: '30px', borderRadius: '12px', width: '400px', maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', textAlign: 'center' }
  };

  return (
    <div style={styles.pageBg}>
      <div style={styles.container}>
        
        {/* HEADER DE LA PÁGINA */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <h1 style={{ margin: 0, color: '#2b3445', fontSize: '2.2rem' }}>Panel de Indicadores</h1>
            <p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>Resumen analítico de operaciones legales</p>
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
          <div style={{ textAlign: 'center', padding: '50px', color: '#6c757d' }}>Cargando métricas...</div>
        ) : (
          <>
            {/* SECCIÓN 1: KPIs GLOBALES */}
            <div style={{ display: 'flex', gap: '24px', marginBottom: '30px' }}>
              <div style={{ flex: 1, ...styles.kpiCard }}>
                <div><h3 style={styles.kpiTitle}>Total Contratos</h3><p style={styles.kpiNumber}>{contratos.length}</p></div>
                <div style={{ fontSize: '3rem', opacity: 0.8 }}>📄</div>
              </div>
              <div style={{ flex: 1, ...styles.kpiCard, borderLeftColor: '#fd7e14' }}>
                <div><h3 style={styles.kpiTitle}>Litigios Activos</h3><p style={styles.kpiNumber}>{litigios.length}</p></div>
                <div style={{ fontSize: '3rem', opacity: 0.8 }}>⚖️</div>
              </div>
              <div style={{ flex: 1, ...styles.kpiCard, borderLeftColor: '#dc3545' }}>
                <div><h3 style={styles.kpiTitle}>Riesgo Económico</h3><p style={{ ...styles.kpiNumber, color: '#dc3545', fontSize: '2.1rem' }}>{formatearDinero(riesgoTotal)}</p></div>
                <div style={{ fontSize: '3rem', opacity: 0.8 }}>💰</div>
              </div>
            </div>

            {/* SECCIÓN 2: GRÁFICAS VISUALES */}
            <div style={{ display: 'flex', gap: '24px', marginBottom: '30px' }}>
              <div style={{ flex: 1, ...styles.card, height: '360px' }}>
                <h3 style={{ margin: '0 0 20px 0', textAlign: 'center', color: '#2b3445' }}>Juicios por Materia</h3>
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie data={datosPastel} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label>
                      {datosPastel.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORES[index % COLORES.length]} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1, ...styles.card, height: '360px' }}>
                <h3 style={{ margin: '0 0 20px 0', textAlign: 'center', color: '#2b3445' }}>Estatus de Contratos</h3>
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart data={datosBarras}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip />
                    <Bar dataKey="cantidad" fill="#0d6efd" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* SECCIÓN 3: TABLAS DE DATOS */}
            <div style={{ display: 'flex', gap: '24px' }}>
              
              {/* === COLUMNA 1: CONTRATOS === */}
              <div style={{ flex: 1, ...styles.card }}>
                <div style={{ borderBottom: '2px solid #edf2f9', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '1.4rem', color: '#2b3445', margin: 0 }}>📄 Últimos Contratos</h2>
                  <button onClick={() => exportarCSV(contratos, 'contratos')} style={{ padding: '6px 12px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>
                    📥 Excel
                  </button>
                </div>
                
                <input 
                  type="text" 
                  placeholder="Buscar por contraparte, tipo o estatus..." 
                  value={busquedaContratos}
                  onChange={(e) => setBusquedaContratos(e.target.value)}
                  style={{ width: '100%', padding: '10px', marginTop: '15px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
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
                            padding: '4px 10px', 
                            borderRadius: '20px', 
                            fontSize: '0.75rem', 
                            fontWeight: 'bold', 
                            letterSpacing: '0.5px', 
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            border: '1px solid transparent',
                            outline: 'none',
                            appearance: 'none', 
                            textAlign: 'center',
                            ...getEstatusStyle(c.estatus) 
                          }}
                        >
                          <option value="Borrador">Borrador</option>
                          <option value="En Revisión">En Revisión</option>
                          <option value="Activo">Activo</option>
                          <option value="Vencido">Vencido</option>
                          <option value="Terminado">Terminado</option>
                        </select>
                      </div>
                      
                      <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem', color: '#6c757d' }}>
                        Contraparte: <strong style={{ color: '#2b3445', textTransform: 'capitalize' }}>{c.contraparte}</strong>
                      </p>
                      
                      {c.fecha_vencimiento && (
                         <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: c.estatus === 'Vencido' ? '#dc3545' : '#6c757d' }}>
                           Vence el: {c.fecha_vencimiento}
                         </p>
                      )}

                      {c.monto_operacion && (
                        <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', fontWeight: 'bold', color: '#198754' }}>
                          Monto: {formatearDinero(c.monto_operacion)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* === COLUMNA 2: JUICIOS === */}
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
                  style={{ width: '100%', padding: '10px', marginTop: '15px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
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
                      
                      {/* <-- NUEVO: Pinta el nombre del cliente en la tarjeta --> */}
                      <p style={{ margin: '8px 0 0 0', fontSize: '0.95rem', color: '#4f46e5', fontWeight: '600' }}>
                        Cliente: {obtenerNombreCliente(l.cliente_id)}
                      </p>

                      <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#6c757d' }}>
                        Fase actual: <strong style={{ color: '#2b3445', textTransform: 'capitalize' }}>{l.fase_procesal}</strong>
                      </p>
                      <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', fontWeight: 'bold', color: '#2b3445' }}>
                        Riesgo: <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', ...getRiesgoStyle(l.monto_contingencia) }}>
                          {formatearDinero(l.monto_contingencia)}
                        </span>
                      </p>
                      
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <button 
                          onClick={() => navigate(`/detalle-juicio/${l.id}`, { state: { juicio: l } })} 
                          style={{ padding: '8px 12px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', transition: 'background 0.2s' }}
                        >
                          👁️ Detalles
                        </button>
                        <button onClick={() => navigate(`/actualizar-juicio/${l.id}`, { state: { juicio: l } })} style={styles.btnYellow}>
                          Actualizar
                        </button>
                        <button onClick={() => analizarConIA(l)} style={styles.btnPurple}>
                          ✨ IA
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

      {/* ==================================================== */}
      {/* COMPONENTE: MODAL DE CONFIRMACIÓN DE ESTATUS         */}
      {/* ==================================================== */}
      {modalConfirmacionVisible && contratoPendienteDeCambio && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={{ fontSize: '3rem', marginBottom: '15px' }}>⚠️</div>
            <h3 style={{ margin: '0 0 10px 0', color: '#2b3445', fontSize: '1.4rem' }}>¿Confirmar cambio?</h3>
            <p style={{ color: '#6c757d', marginBottom: '25px', lineHeight: '1.5' }}>
              Estás a punto de cambiar el estatus del contrato con <strong>{contratoPendienteDeCambio.contraparte}</strong> a <strong style={{color: getEstatusStyle(contratoPendienteDeCambio.nuevoEstatus).color}}>{contratoPendienteDeCambio.nuevoEstatus.toUpperCase()}</strong>.
            </p>
            
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button 
                onClick={cancelarCambio}
                style={{ padding: '10px 20px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmarCambioEstatus}
                style={{ padding: '10px 20px', backgroundColor: '#0d6efd', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Sí, cambiar estatus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* COMPONENTE: PANEL LATERAL DE CHAT IA */}
      {/* ==================================================== */}
      {chatVisible && (
        <div style={styles.chatOverlay} onClick={() => setChatVisible(false)}>
          <div style={styles.chatWindow} onClick={(e) => e.stopPropagation()}>
            
            <div style={styles.chatHeader}>
              <h3 style={{ margin: '0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>✨ Asesor Legal Copilot</h3>
              <button onClick={() => setChatVisible(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>✖</button>
            </div>
            
            <div style={styles.chatBody}>
              {chatMensajes.map((msg, idx) => (
                <div key={idx} style={msg.rol === 'user' ? styles.msgUser : styles.msgAI}>
                  <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '6px', fontWeight: 'bold' }}>
                    {msg.rol === 'user' ? 'Tú (Abogado)' : 'Asesor IA PluriOne'}
                  </div>
                  <div>{msg.texto}</div>
                </div>
              ))}
              {escribiendoIA && (
                <div style={styles.typing}>Analizando información... ⚖️</div>
              )}
            </div>

            <div style={styles.chatFooter}>
              <form onSubmit={enviarMensajeManual} style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  value={mensajeInput}
                  onChange={(e) => setMensajeInput(e.target.value)}
                  placeholder="Pregunta sobre el expediente..." 
                  style={styles.chatInput}
                />
                <button type="submit" style={styles.chatBtn}>
                  Enviar
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