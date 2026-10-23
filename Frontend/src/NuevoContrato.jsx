import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import toast from 'react-hot-toast';

function NuevoContrato() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(false);

  const [formData, setFormData] = useState({
    cliente_id: '',
    tipo_contrato: '',
    contraparte: '',
    departamento_solicitante: '',
    fecha_firma: '',
    fecha_vencimiento: '',
    monto_operacion: '',
    estatus: 'Activo'
  });

  // Cargar clientes al abrir el formulario
  useEffect(() => {
    const obtenerClientes = async () => {
      try {
        const token = localStorage.getItem('token');
        const respuesta = await api.get('/clientes/', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setClientes(respuesta.data);
      } catch (error) {
        console.error('Error al cargar clientes:', error);
        toast.error('No se pudo cargar la lista de clientes.');
      }
    };
    obtenerClientes();
  }, []);

  const manejarCambio = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const manejarEnvio = async (e) => {
    e.preventDefault();

    if (!formData.cliente_id) {
      toast.error('Selecciona el cliente asociado al contrato.');
      return;
    }

    setCargando(true);

    const payload = {
      cliente_id: parseInt(formData.cliente_id, 10),
      tipo_contrato: formData.tipo_contrato,
      contraparte: formData.contraparte,
      departamento_solicitante: formData.departamento_solicitante,
      fecha_firma: formData.fecha_firma ? `${formData.fecha_firma}T00:00:00` : null,
      fecha_vencimiento: formData.fecha_vencimiento ? `${formData.fecha_vencimiento}T00:00:00` : null,
      monto_operacion: parseFloat(formData.monto_operacion) || 0,
      estatus: formData.estatus
    };

    try {
      const token = localStorage.getItem('token');
      await api.post('/contratos', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('¡Contrato registrado y vinculado al cliente!');
      navigate('/dashboard');
    } catch (error) {
      const mensajeError = error.response?.data?.detail || 'Error al guardar el contrato. Verifica los datos.';
      toast.error(mensajeError);
      setCargando(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #cbd5e1',
    fontSize: '0.95rem', boxSizing: 'border-box', outlineColor: '#2563eb', backgroundColor: '#f8fafc'
  };
  const labelStyle = { display: 'block', marginBottom: '8px', color: '#1e293b', fontWeight: '600', fontSize: '0.9rem' };

  return (
    <div style={{ backgroundColor: '#f4f7f6', minHeight: '100vh', padding: '40px 20px', fontFamily: "'Segoe UI', Roboto, sans-serif" }}>
      
      <div style={{ maxWidth: '1100px', margin: '0 auto', marginBottom: '20px' }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}>
          ← Regresar al Dashboard
        </button>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.05)', display: 'flex', overflow: 'hidden' }}>
        
        {/* COLUMNA IZQUIERDA: CONTEXTO CORPORATIVO */}
        <div style={{ flex: '1', backgroundColor: '#1e3a8a', padding: '40px', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>📄</div>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '1.8rem', fontWeight: 'bold' }}>Alta de Contrato</h2>
          <p style={{ color: '#bfdbfe', fontSize: '1rem', lineHeight: '1.6', marginBottom: '30px' }}>
            Registra un nuevo instrumento contractual vinculándolo a un cliente de tu padrón corporativo para dar seguimiento a su vigencia y monto de operación.
          </p>
          
          <div style={{ backgroundColor: '#1d4ed8', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #60a5fa' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#eff6ff', fontSize: '0.95rem' }}>📌 Control de Vigencias</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#dbeafe', fontSize: '0.9rem', lineHeight: '1.7' }}>
              <li><strong>Cliente:</strong> Asocia el contrato al cliente titular.</li>
              <li><strong>Caducidad Automática:</strong> Si la fecha de vencimiento se rebasa, el Dashboard marcará el contrato como <em>Vencido</em> automáticamente.</li>
            </ul>
          </div>
        </div>

        {/* COLUMNA DERECHA: FORMULARIO */}
        <div style={{ flex: '2', padding: '50px 40px' }}>
          <form onSubmit={manejarEnvio} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* FILA 1: Selector de Cliente */}
            <div>
              <label style={labelStyle}>Cliente Asociado *</label>
              <select
                name="cliente_id"
                value={formData.cliente_id}
                onChange={manejarCambio}
                style={{ ...inputStyle, cursor: 'pointer' }}
                required
              >
                <option value="">-- Selecciona un cliente del directorio --</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre_completo} {c.rfc ? `(${c.rfc})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* FILA 2: Tipo de Contrato y Contraparte */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Tipo de Contrato *</label>
                <input
                  type="text"
                  name="tipo_contrato"
                  value={formData.tipo_contrato}
                  onChange={manejarCambio}
                  placeholder="Ej. Prestación de Servicios, NDA, Arrendamiento"
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Contraparte / Proveedor *</label>
                <input
                  type="text"
                  name="contraparte"
                  value={formData.contraparte}
                  onChange={manejarCambio}
                  placeholder="Ej. Inmobiliaria del Centro S.A."
                  style={inputStyle}
                  required
                />
              </div>
            </div>

            {/* FILA 3: Departamento Solicitante y Estatus */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Departamento Solicitante *</label>
                <input
                  type="text"
                  name="departamento_solicitante"
                  value={formData.departamento_solicitante}
                  onChange={manejarCambio}
                  placeholder="Ej. Operaciones, Recursos Humanos, TI"
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Estatus Inicial</label>
                <select name="estatus" value={formData.estatus} onChange={manejarCambio} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="Borrador">Borrador</option>
                  <option value="En Revisión">En Revisión</option>
                  <option value="Activo">Activo</option>
                  <option value="Terminado">Terminado</option>
                </select>
              </div>
            </div>

            {/* FILA 4: Fechas y Monto */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Fecha de Firma</label>
                <input type="date" name="fecha_firma" value={formData.fecha_firma} onChange={manejarCambio} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Fecha de Vencimiento</label>
                <input type="date" name="fecha_vencimiento" value={formData.fecha_vencimiento} onChange={manejarCambio} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Monto de Operación (MXN)</label>
                <input
                  type="number"
                  step="0.01"
                  name="monto_operacion"
                  value={formData.monto_operacion}
                  onChange={manejarCambio}
                  placeholder="Ej. 150000"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <button
                type="submit"
                disabled={cargando}
                style={{
                  padding: '14px 30px',
                  backgroundColor: cargando ? '#94a3b8' : '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1.05rem',
                  fontWeight: 'bold',
                  cursor: cargando ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                  width: '100%'
                }}
              >
                {cargando ? 'Guardando Contrato...' : 'Registrar Contrato'}
              </button>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}

export default NuevoContrato;