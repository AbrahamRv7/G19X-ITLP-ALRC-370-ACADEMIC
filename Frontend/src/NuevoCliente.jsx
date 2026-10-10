import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api'; // Ruta corregida apuntando a tu api.js
import toast from 'react-hot-toast';

function NuevoCliente() {
  const navigate = useNavigate();

  // Consolidamos el estado como en tus otros formularios (añadiendo rfc y teléfono)
  const [formData, setFormData] = useState({
    nombre_completo: '',
    correo: '',
    rfc: '',
    telefono: ''
  });

  const [cargando, setCargando] = useState(false);

  const manejarCambio = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const manejarEnvio = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre_completo) {
      toast.error('El nombre completo es obligatorio.');
      return;
    }

    setCargando(true);

    // Convertimos los campos vacíos a null para que FastAPI no procese strings vacíos
    const datosLimpios = { ...formData };
    if (!datosLimpios.correo) datosLimpios.correo = null;
    if (!datosLimpios.rfc) datosLimpios.rfc = null;
    if (!datosLimpios.telefono) datosLimpios.telefono = null;

    try {
      const token = localStorage.getItem('token');
      
      // Usamos la ruta /clientes/ de tu backend en Render
      await api.post('/clientes/', datosLimpios, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('¡Cliente registrado exitosamente!');
      navigate('/dashboard'); // Regresa automático al panel
    } catch (error) {
      toast.error('Error al guardar. Verifica que el Correo o RFC no estén duplicados.');
      console.error(error);
      setCargando(false);
    }
  };

  // --- ESTILOS REUTILIZABLES ---
  const inputStyle = {
    width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', 
    fontSize: '0.95rem', boxSizing: 'border-box', outlineColor: '#10b981', backgroundColor: '#f8fafc' // Verde para diferenciar
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
        
        {/* COLUMNA IZQUIERDA: GUÍAS Y CONTEXTO (Verde Esmeralda Corporativo) */}
        <div style={{ flex: '1', backgroundColor: '#064e3b', padding: '40px', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>👥</div>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '1.8rem', fontWeight: 'bold' }}>Registro de Cliente</h2>
          <p style={{ color: '#a7f3d0', fontSize: '1rem', lineHeight: '1.6', marginBottom: '30px' }}>
            Da de alta a un nuevo cliente. Una vez registrado, aparecerá en el menú desplegable para vincularlo a sus expedientes y litigios.
          </p>
          
          <div style={{ backgroundColor: '#065f46', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#d1fae5', fontSize: '0.95rem' }}>📌 Directrices de Registro</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#a7f3d0', fontSize: '0.9rem', lineHeight: '1.7' }}>
              <li><strong>Nombre:</strong> Razón social o nombre completo obligatorio.</li>
              <li><strong>RFC y Correo:</strong> Deben ser únicos. El sistema rebotará duplicados.</li>
            </ul>
          </div>
        </div>

        {/* COLUMNA DERECHA: FORMULARIO EN GRID */}
        <div style={{ flex: '2', padding: '50px 40px' }}>
          <form onSubmit={manejarEnvio} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* FILA 1: Nombre */}
            <div>
              <label style={labelStyle}>Nombre Completo o Razón Social *</label>
              <input type="text" name="nombre_completo" value={formData.nombre_completo} onChange={manejarCambio} placeholder="Ej. Juan Pérez o Empresa S.A. de C.V." style={inputStyle} required />
            </div>

            {/* FILA 2: RFC y Correo (2 Columnas) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
              <div>
                <label style={labelStyle}>RFC</label>
                <input type="text" name="rfc" value={formData.rfc} onChange={manejarCambio} placeholder="Ej. ABCD123456XYZ" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Correo Electrónico</label>
                <input type="email" name="correo" value={formData.correo} onChange={manejarCambio} placeholder="contacto@empresa.com" style={inputStyle} />
              </div>
            </div>

            {/* FILA 3: Teléfono */}
            <div>
              <label style={labelStyle}>Teléfono de Contacto</label>
              <input type="text" name="telefono" value={formData.telefono} onChange={manejarCambio} placeholder="Ej. 55 1234 5678" style={inputStyle} />
            </div>

            {/* BOTÓN DE GUARDAR */}
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="submit" 
                disabled={cargando}
                style={{ 
                  padding: '14px 30px', backgroundColor: cargando ? '#94a3b8' : '#10b981', color: '#fff', border: 'none', 
                  borderRadius: '8px', fontSize: '1.05rem', fontWeight: 'bold', cursor: cargando ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)', transition: 'background-color 0.2s', width: '100%'
                }}
              >
                {cargando ? 'Guardando...' : 'Registrar Nuevo Cliente'}
              </button>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}

export default NuevoCliente;