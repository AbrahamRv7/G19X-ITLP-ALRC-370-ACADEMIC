import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import api from './api';
import toast from 'react-hot-toast';

function EditarContrato() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const contratoInicial = location.state?.contrato;

  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(false);

  const limpiarFecha = (fechaIso) => (fechaIso ? fechaIso.split('T')[0] : '');

  const [formData, setFormData] = useState({
    cliente_id: contratoInicial?.cliente_id || '',
    tipo_contrato: contratoInicial?.tipo_contrato || '',
    contraparte: contratoInicial?.contraparte || '',
    departamento_solicitante: contratoInicial?.departamento_solicitante || '',
    fecha_firma: limpiarFecha(contratoInicial?.fecha_firma),
    fecha_vencimiento: limpiarFecha(contratoInicial?.fecha_vencimiento),
    monto_operacion: contratoInicial?.monto_operacion ?? '',
    estatus: contratoInicial?.estatus || 'Activo'
  });

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [resClientes, resContratos] = await Promise.all([
          api.get('/clientes/'),
          contratoInicial ? Promise.resolve({ data: [] }) : api.get('/contratos')
        ]);
        setClientes(resClientes.data);

        if (!contratoInicial && resContratos.data.length > 0) {
          const encontrado = resContratos.data.find(c => c.id === parseInt(id, 10));
          if (encontrado) {
            setFormData({
              cliente_id: encontrado.cliente_id || '',
              tipo_contrato: encontrado.tipo_contrato || '',
              contraparte: encontrado.contraparte || '',
              departamento_solicitante: encontrado.departamento_solicitante || '',
              fecha_firma: limpiarFecha(encontrado.fecha_firma),
              fecha_vencimiento: limpiarFecha(encontrado.fecha_vencimiento),
              monto_operacion: encontrado.monto_operacion ?? '',
              estatus: encontrado.estatus || 'Activo'
            });
          }
        }
      } catch (error) {
        console.error(error);
        toast.error('Error al cargar la información del contrato.');
      }
    };
    cargarDatos();
  }, [id, contratoInicial]);

  const manejarCambio = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const manejarEnvio = async (e) => {
    e.preventDefault();
    setCargando(true);

    const payload = {
      cliente_id: formData.cliente_id ? parseInt(formData.cliente_id, 10) : null,
      tipo_contrato: formData.tipo_contrato,
      contraparte: formData.contraparte,
      departamento_solicitante: formData.departamento_solicitante,
       fecha_firma: formData.fecha_firma || null,
      fecha_vencimiento: formData.fecha_vencimiento || null,
       monto_operacion: formData.monto_operacion === '' ? 0 : parseFloat(formData.monto_operacion),
      estatus: formData.estatus
    };

    try {
      await api.put(`/contratos/${id}`, payload);
      toast.success('Contrato actualizado correctamente');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Error al actualizar el contrato.');
      console.error(error.response?.data || error); // Te ayudará a ver el error real en la consola F12
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
      <div style={{ maxWidth: '1000px', margin: '0 auto', marginBottom: '20px' }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}>
          ← Regresar al Dashboard
        </button>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.05)', padding: '40px' }}>
        <h2 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '1.8rem' }}>✏️ Editar Contrato #{id}</h2>
        <p style={{ margin: '0 0 28px 0', color: '#64748b' }}>
          Actualiza las condiciones comerciales, fechas de vigencia, cliente asociado o monto de operación.
        </p>

        <form onSubmit={manejarEnvio} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={labelStyle}>Cliente Asociado</label>
            <select name="cliente_id" value={formData.cliente_id} onChange={manejarCambio} style={inputStyle}>
              <option value="">-- Sin cliente asignado --</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre_completo} {c.rfc ? `(${c.rfc})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
            <div>
              <label style={labelStyle}>Tipo de Contrato *</label>
              <input type="text" name="tipo_contrato" value={formData.tipo_contrato} onChange={manejarCambio} style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>Contraparte / Proveedor *</label>
              <input type="text" name="contraparte" value={formData.contraparte} onChange={manejarCambio} style={inputStyle} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
            <div>
              <label style={labelStyle}>Departamento Solicitante *</label>
              <input type="text" name="departamento_solicitante" value={formData.departamento_solicitante} onChange={manejarCambio} style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>Estatus</label>
              <select name="estatus" value={formData.estatus} onChange={manejarCambio} style={inputStyle}>
                <option value="Borrador">Borrador</option>
                <option value="En Revisión">En Revisión</option>
                <option value="Activo">Activo</option>
                <option value="Vencido">Vencido</option>
                <option value="Terminado">Terminado</option>
              </select>
            </div>
          </div>

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
              <input type="number" step="0.01" name="monto_operacion" value={formData.monto_operacion} onChange={manejarCambio} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              style={{ padding: '12px 24px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              style={{ flex: 1, padding: '12px 24px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {cargando ? 'Guardando cambios...' : 'Guardar Cambios del Contrato'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditarContrato;