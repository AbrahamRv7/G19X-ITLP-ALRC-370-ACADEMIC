import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import toast from 'react-hot-toast';

function NuevoContrato() {
  const navigate = useNavigate();

  // Estados del formulario
  const [formData, setFormData] = useState({
    tipo_contrato: '',
    contraparte: '',
    departamento_solicitante: '',
    fecha_firma: '',
    fecha_vencimiento: '',
    monto_operacion: '',
    estatus: 'Borrador',
    usuario_responsable_id: 1 // Por defecto para la residencia
  });

  const [cargando, setCargando] = useState(false);

  const manejarCambio = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const manejarEnvio = async (e) => {
    e.preventDefault();
    if (!formData.tipo_contrato || !formData.contraparte) {
      toast.error('Tipo de contrato y contraparte son obligatorios.');
      return;
    }

    setCargando(true);

    const datosLimpios = { ...formData };
    if (!datosLimpios.monto_operacion) datosLimpios.monto_operacion = 0; // Si está vacío, mandamos 0
    if (!datosLimpios.fecha_firma) datosLimpios.fecha_firma = null;      // Si está vacío, mandamos null
    if (!datosLimpios.fecha_vencimiento) datosLimpios.fecha_vencimiento = null;
    
    try {
      const token = localStorage.getItem('token');
      console.log("El token que React está intentando enviar es:", token);
      
      // CORRECCIÓN AQUÍ: Solo pasamos datosLimpios
      await api.post('/contratos', datosLimpios, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('¡Contrato registrado exitosamente!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Error al guardar el contrato. Verifica los datos.');
      console.error(error);
      setCargando(false);
    }
  };

  // --- ESTILOS REUTILIZABLES ---
  const inputStyle = {
    width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', 
    fontSize: '0.95rem', boxSizing: 'border-box', outlineColor: '#2563eb', backgroundColor: '#f8fafc'
  };
  const labelStyle = { display: 'block', marginBottom: '8px', color: '#1e293b', fontWeight: '600', fontSize: '0.9rem' };

  return (
    <div style={{ backgroundColor: '#f4f7f6', minHeight: '100vh', padding: '40px 20px', fontFamily: "'Segoe UI', Roboto, sans-serif" }}>
      
      {/* BOTÓN DE REGRESO */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', marginBottom: '20px' }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}>
          ← Regresar al Dashboard
        </button>
      </div>

      {/* CONTENEDOR PRINCIPAL SPLIT-VIEW */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.05)', display: 'flex', overflow: 'hidden' }}>
        
        {/* COLUMNA IZQUIERDA: GUÍAS Y CONTEXTO (Azul Corporativo) */}
        <div style={{ flex: '1', backgroundColor: '#0f172a', padding: '40px', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>📄</div>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '1.8rem', fontWeight: 'bold' }}>Alta de Contrato</h2>
          <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: '1.6', marginBottom: '30px' }}>
            Ingresa los detalles operativos y financieros del nuevo acuerdo comercial para integrarlo al panel de control de LegalOps.
          </p>
          
          <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#e2e8f0', fontSize: '0.95rem' }}>📌 Directrices de Registro</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.7' }}>
              <li>Verifica que las fechas de firma y vencimiento coincidan con el documento físico.</li>
              <li>Si el contrato no tiene un monto fijo, ingresa "0".</li>
              <li>Guarda el registro como "Borrador" si aún falta recabar firmas de la contraparte.</li>
            </ul>
          </div>
        </div>

        {/* COLUMNA DERECHA: FORMULARIO EN GRID */}
        <div style={{ flex: '2', padding: '50px 40px' }}>
          <form onSubmit={manejarEnvio} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* FILA 1: Tipo y Contraparte (2 Columnas) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Tipo de Contrato *</label>
                <input type="text" name="tipo_contrato" value={formData.tipo_contrato} onChange={manejarCambio} placeholder="Ej. Prestación de Servicios" style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>Contraparte *</label>
                <input type="text" name="contraparte" value={formData.contraparte} onChange={manejarCambio} placeholder="Empresa o persona física" style={inputStyle} required />
              </div>
            </div>

            {/* FILA 2: Departamento (Fila completa) */}
            <div>
              <label style={labelStyle}>Departamento Solicitante</label>
              <input type="text" name="departamento_solicitante" value={formData.departamento_solicitante} onChange={manejarCambio} placeholder="Ej. Recursos Humanos, Ventas, TI..." style={inputStyle} />
            </div>

            {/* FILA 3: Fechas (2 Columnas) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Fecha de Firma</label>
                <input type="date" name="fecha_firma" value={formData.fecha_firma} onChange={manejarCambio} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Fecha de Vencimiento</label>
                <input type="date" name="fecha_vencimiento" value={formData.fecha_vencimiento} onChange={manejarCambio} style={inputStyle} />
              </div>
            </div>

            {/* FILA 4: Monto y Estatus (2 Columnas) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Monto de Operación ($)</label>
                <input type="number" name="monto_operacion" value={formData.monto_operacion} onChange={manejarCambio} placeholder="0.00" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Estatus Inicial</label>
                <select name="estatus" value={formData.estatus} onChange={manejarCambio} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="Borrador">Borrador</option>
                  <option value="En Revisión">En Revisión</option>
                  <option value="Activo">Activo</option>
                  <option value="Vencido">Vencido</option>
                  <option value="Terminado">Terminado</option>
                </select>
              </div>
            </div>

            {/* BOTÓN DE GUARDAR */}
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="submit" 
                disabled={cargando}
                style={{ 
                  padding: '14px 30px', backgroundColor: cargando ? '#94a3b8' : '#2563eb', color: '#fff', border: 'none', 
                  borderRadius: '8px', fontSize: '1.05rem', fontWeight: 'bold', cursor: cargando ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)', transition: 'background-color 0.2s', width: '100%'
                }}
              >
                {cargando ? 'Guardando...' : 'Registrar Nuevo Contrato'}
              </button>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}

export default NuevoContrato;