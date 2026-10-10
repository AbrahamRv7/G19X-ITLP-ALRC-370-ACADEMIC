import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import toast from 'react-hot-toast';

function RegistrarUsuario() {
  const navigate = useNavigate();

  // CORREGIDO: Cambiamos "nombre_completo" por "nombre" para que empate con FastAPI
  const [formData, setFormData] = useState({
    nombre: '', 
    email: '',
    password: '',
    rol: 'abogado'
  });

  const [cargando, setCargando] = useState(false);

  const manejarCambio = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const manejarEnvio = async (e) => {
    e.preventDefault();
    if (!formData.nombre || !formData.email || !formData.password) {
      toast.error('Todos los campos son obligatorios.');
      return;
    }

    setCargando(true);
    try {
      const token = localStorage.getItem('token');
      // Enviamos la petición POST para crear el usuario en la base de datos
      await api.post('/usuarios', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('¡Usuario dado de alta exitosamente!');
      navigate('/dashboard');
    } catch (error) {
      // Si el backend nos responde con un Error 400 (correo duplicado)
      if (error.response?.status === 400) {
        toast.error('Ese correo electrónico ya está registrado.');
      } else {
        toast.error('Error al registrar al usuario en el sistema.');
      }
      console.error(error);
      setCargando(false);
    }
  };

  // --- ESTILOS REUTILIZABLES ---
  const inputStyle = {
    width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', 
    fontSize: '0.95rem', boxSizing: 'border-box', outlineColor: '#0f766e', backgroundColor: '#f8fafc'
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
        
        {/* COLUMNA IZQUIERDA: CONTEXTO DE SEGURIDAD (Color Teal) */}
        <div style={{ flex: '1', backgroundColor: '#134e4a', padding: '40px', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>🛡️</div>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '1.8rem', fontWeight: 'bold' }}>Control de Accesos</h2>
          <p style={{ color: '#99f6e4', fontSize: '1rem', lineHeight: '1.6', marginBottom: '30px' }}>
            Alta de personal legal y administrativo a la plataforma. Las credenciales generadas aquí se encriptan mediante estándares de seguridad avanzados (Bcrypt).
          </p>
          
          <div style={{ backgroundColor: '#0f766e', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #2dd4bf' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#ccfbf1', fontSize: '0.95rem' }}>📌 Políticas de Seguridad</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#a7f3d0', fontSize: '0.9rem', lineHeight: '1.7' }}>
              <li><strong>Contraseñas:</strong> Asigna una clave temporal y pide al usuario que la resguarde.</li>
              <li><strong>Auditoría:</strong> Cada acción en el sistema quedará ligada al usuario que lo realice.</li>
            </ul>
          </div>
        </div>

        {/* COLUMNA DERECHA: FORMULARIO EN GRID */}
        <div style={{ flex: '2', padding: '50px 40px' }}>
          <form onSubmit={manejarEnvio} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Nombre Completo *</label>
                {/* CORREGIDO: value a formData.nombre y name a "nombre" */}
                <input type="text" name="nombre" value={formData.nombre} onChange={manejarCambio} placeholder="Ej. Roberto Gómez" style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>Correo Electrónico (Usuario) *</label>
                <input type="email" name="email" value={formData.email} onChange={manejarCambio} placeholder="abogado@empresa.com" style={inputStyle} required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Contraseña Temporal *</label>
                <input type="password" name="password" value={formData.password} onChange={manejarCambio} placeholder="••••••••" style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>Rol de Sistema</label>
                <select name="rol" value={formData.rol} onChange={manejarCambio} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="abogado">Abogado (Estándar)</option>
                  <option value="admin">Administrador</option>
                  <option value="viewer">Solo Lectura (Viewer)</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="submit" 
                disabled={cargando}
                style={{ 
                  padding: '14px 30px', backgroundColor: cargando ? '#94a3b8' : '#0f766e', color: '#fff', border: 'none', 
                  borderRadius: '8px', fontSize: '1.05rem', fontWeight: 'bold', cursor: cargando ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(15, 118, 110, 0.2)', transition: 'background-color 0.2s', width: '100%'
                }}
              >
                {cargando ? 'Registrando...' : 'Dar de Alta Usuario'}
              </button>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}

export default RegistrarUsuario;