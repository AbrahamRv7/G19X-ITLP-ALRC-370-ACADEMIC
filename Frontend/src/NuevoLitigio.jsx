import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import toast from 'react-hot-toast';

function NuevoLitigio() {
  const navigate = useNavigate();

  // Estados del formulario para Litigios
  const [formData, setFormData] = useState({
    expediente: '',
    materia: '',
    contraparte: '',
    juzgado: '',
    fase_procesal: 'Presentación de Demanda',
    probabilidad_exito: 'Media',
    monto_contingencia: '',
    usuario_responsable_id: 1 
  }); 

  const [cargando, setCargando] = useState(false);

  const manejarCambio = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const manejarEnvio = async (e) => {
    e.preventDefault();
    if (!formData.expediente || !formData.materia) {
      toast.error('El número de expediente y la materia son obligatorios.');
      return;
    }

    setCargando(true);
    const datosLimpios = { ...formData };
    if (!datosLimpios.monto_contingencia) datosLimpios.monto_contingencia = 0; // Si está vacío, mandamos 0
    try {
      const token = localStorage.getItem('token');
      // Enviamos la petición POST al endpoint de litigios
      await api.post('/litigios', formData, datosLimpios, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('¡Litigio registrado exitosamente!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Error al guardar el litigio. Verifica los datos.');
      console.error(error);
      setCargando(false);
    }
  };

  // --- ESTILOS REUTILIZABLES ---
  const inputStyle = {
    width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', 
    fontSize: '0.95rem', boxSizing: 'border-box', outlineColor: '#4f46e5', backgroundColor: '#f8fafc'
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
        
        {/* COLUMNA IZQUIERDA: GUÍAS Y CONTEXTO (Morado Corporativo para diferenciar de Contratos) */}
        <div style={{ flex: '1', backgroundColor: '#1e1b4b', padding: '40px', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>⚖️</div>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '1.8rem', fontWeight: 'bold' }}>Registro de Litigio</h2>
          <p style={{ color: '#a5b4fc', fontSize: '1rem', lineHeight: '1.6', marginBottom: '30px' }}>
            Registra los detalles clave del nuevo expediente legal (litigio o juicio) para integrarlo al panel de control de LegalOps.
          </p>
          
          <div style={{ backgroundColor: '#312e81', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #6366f1' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#e0e7ff', fontSize: '0.95rem' }}>📌 Directrices de Registro</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#c7d2fe', fontSize: '0.9rem', lineHeight: '1.7' }}>
              <li><strong>Materia:</strong> Define con precisión la materia (ej. Laboral, Mercantil).</li>
              <li><strong>Riesgo:</strong> Registra el monto total en contingencia exigido por la contraparte.</li>
              <li><strong>Juzgado:</strong> Si ya tiene juzgado asignado, por favor ingrésalo para facilitar su seguimiento.</li>
            </ul>
          </div>
        </div>

        {/* COLUMNA DERECHA: FORMULARIO EN GRID */}
        <div style={{ flex: '2', padding: '50px 40px' }}>
          <form onSubmit={manejarEnvio} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* FILA 1: Expediente y Materia */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Expediente *</label>
                <input type="text" name="expediente" value={formData.expediente} onChange={manejarCambio} placeholder="Ej. 145/2026" style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>Materia *</label>
                <input type="text" name="materia" value={formData.materia} onChange={manejarCambio} placeholder="Ej. Laboral, Civil, Mercantil..." style={inputStyle} required />
              </div>
            </div>

            {/* FILA 2: Contraparte y Juzgado */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Contraparte</label>
                <input type="text" name="contraparte" value={formData.contraparte} onChange={manejarCambio} placeholder="Nombre del actor o demandado" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Juzgado / Autoridad</label>
                <input type="text" name="juzgado" value={formData.juzgado} onChange={manejarCambio} placeholder="Ej. Junta Local de Conciliación..." style={inputStyle} />
              </div>
            </div>

            {/* FILA 3: Fase y Probabilidad */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Fase Procesal Inicial</label>
                <input type="text" name="fase_procesal" value={formData.fase_procesal} onChange={manejarCambio} placeholder="Ej. Presentación de Demanda" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Probabilidad de Éxito</label>
                <select name="probabilidad_exito" value={formData.probabilidad_exito} onChange={manejarCambio} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="Alta">Alta</option>
                  <option value="Media">Media</option>
                  <option value="Baja">Baja</option>
                </select>
              </div>
            </div>

            {/* FILA 4: Monto */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Monto en Contingencia ($)</label>
                <input type="number" name="monto_contingencia" value={formData.monto_contingencia} onChange={manejarCambio} placeholder="0.00" style={inputStyle} />
              </div>
              {/* Espacio en blanco para cuadrar el grid, o puedes poner el ID de abogado aquí si lo deseas oculto o visible */}
              <div>
                <label style={labelStyle}>ID Abogado Responsable</label>
                <input type="number" name="usuario_id" value={formData.usuario_id} readOnly style={{...inputStyle, backgroundColor: '#e2e8f0', color: '#64748b'}} />
              </div>
            </div>

            {/* BOTÓN DE GUARDAR */}
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="submit" 
                disabled={cargando}
                style={{ 
                  padding: '14px 30px', backgroundColor: cargando ? '#94a3b8' : '#4f46e5', color: '#fff', border: 'none', 
                  borderRadius: '8px', fontSize: '1.05rem', fontWeight: 'bold', cursor: cargando ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)', transition: 'background-color 0.2s', width: '100%'
                }}
              >
                {cargando ? 'Registrando...' : 'Registrar Nuevo Litigio'}
              </button>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}

export default NuevoLitigio;