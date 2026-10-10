import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from './api';

function ActualizarJuicio() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Recuperamos los datos del juicio que nos mandó el Dashboard
  const juicio = location.state?.juicio;

  const [nuevaFase, setNuevaFase] = useState('');
  const [comentarios, setComentarios] = useState('');
  const [cargando, setCargando] = useState(false);

  // Si alguien entra a esta ruta directamente sin seleccionar un juicio, lo regresamos
  if (!juicio) {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px', fontFamily: 'sans-serif' }}>
        <h2>No se seleccionó ningún expediente.</h2>
        <button onClick={() => navigate('/dashboard')} style={{ padding: '10px 20px', cursor: 'pointer' }}>Regresar al Dashboard</button>
      </div>
    );
  }

  const manejarEnvio = async (e) => {
    e.preventDefault();
    if (!nuevaFase.trim()) {
      alert('Por favor, ingresa la nueva fase procesal.');
      return;
    }

    setCargando(true);
    try {
      const token = localStorage.getItem('token');
      
      // Enviamos el historial al backend INCLUYENDO el ID del usuario
      await api.post(`/litigios/${juicio.id}/historial`, {
        fase_anterior: juicio.fase_procesal,
        fase_nueva: nuevaFase,
        comentarios: comentarios || "Sin comentarios adicionales.",
        usuario_modificador_id: 1  // ID temporal por defecto
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      navigate('/dashboard'); // Regresamos al dashboard al terminar
    } catch (error) {
      alert('Error al registrar el avance. Revisa la consola.');
      console.error(error);
      setCargando(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#f4f7f6', minHeight: '100vh', padding: '40px 20px', fontFamily: "'Segoe UI', Roboto, sans-serif" }}>
      
      {/* Botón de regreso */}
      <div style={{ maxWidth: '900px', margin: '0 auto', marginBottom: '20px' }}>
        <button 
          onClick={() => navigate('/dashboard')}
          style={{ background: 'none', border: 'none', color: '#6c757d', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}
        >
          ← Regresar al Dashboard
        </button>
      </div>

      {/* TARJETA DIVIDIDA (SPLIT-VIEW) */}
      <div style={{ maxWidth: '900px', margin: '0 auto', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.05)', display: 'flex', overflow: 'hidden', border: '1px solid #edf2f9' }}>
        
        {/* COLUMNA IZQUIERDA: CONTEXTO DEL JUICIO */}
        <div style={{ flex: '1', backgroundColor: '#f8fafc', padding: '40px', borderRight: '1px solid #edf2f9' }}>
          <h2 style={{ margin: '0 0 20px 0', color: '#0f172a', fontSize: '1.4rem' }}>Detalles del Expediente</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <span style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Expediente</span>
              <p style={{ margin: '5px 0 0 0', fontSize: '1.1rem', color: '#0f172a', fontWeight: '600' }}>{juicio.expediente}</p>
            </div>
            
            {/* NUEVOS CAMPOS AÑADIDOS */}
            <div>
              <span style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Contraparte</span>
              <p style={{ margin: '5px 0 0 0', fontSize: '1rem', color: '#0f172a', textTransform: 'capitalize' }}>
                {juicio.contraparte || 'No registrada'}
              </p>
            </div>

            <div>
              <span style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Juzgado / Autoridad</span>
              <p style={{ margin: '5px 0 0 0', fontSize: '1rem', color: '#0f172a' }}>
                {juicio.juzgado || 'Por asignar'}
              </p>
            </div>
            {/* FIN CAMPOS NUEVOS */}
            
            <div>
              <span style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Materia Legal</span>
              <p style={{ margin: '5px 0 0 0', fontSize: '1rem', color: '#0f172a', textTransform: 'capitalize' }}>{juicio.materia}</p>
            </div>

            <div style={{ backgroundColor: '#fff3cd', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #ffc107', marginTop: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: '#856404', textTransform: 'uppercase', fontWeight: 'bold' }}>Fase Procesal Actual</span>
              <p style={{ margin: '5px 0 0 0', fontSize: '1.1rem', color: '#856404', fontWeight: 'bold', textTransform: 'capitalize' }}>{juicio.fase_procesal}</p>
            </div>

            <div>
              <span style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Riesgo Financiero</span>
              <p style={{ margin: '5px 0 0 0', fontSize: '1.1rem', color: '#dc3545', fontWeight: 'bold' }}>${juicio.monto_contingencia?.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: FORMULARIO DE ACCIÓN */}
        <div style={{ flex: '1.2', padding: '40px' }}>
          <h2 style={{ margin: '0 0 5px 0', color: '#2563eb', fontSize: '1.5rem' }}>Avanzar Fase Procesal</h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '30px', marginTop: 0 }}>Registra el nuevo estatus en la bitácora del sistema.</p>

          <form onSubmit={manejarEnvio} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#1e293b', fontWeight: '600', fontSize: '0.95rem' }}>
                Nueva Fase a la que avanza:
              </label>
              <input
                type="text"
                value={nuevaFase}
                onChange={(e) => setNuevaFase(e.target.value)}
                placeholder="Ej. Desahogo de Pruebas, Sentencia..."
                style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box', outlineColor: '#2563eb' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#1e293b', fontWeight: '600', fontSize: '0.95rem' }}>
                Comentarios de la Audiencia (Opcional):
              </label>
              <textarea
                value={comentarios}
                onChange={(e) => setComentarios(e.target.value)}
                placeholder="Describe brevemente qué sucedió en el juzgado o qué documentos se entregaron..."
                rows="5"
                style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box', outlineColor: '#2563eb', resize: 'vertical' }}
              />
            </div>

            <button 
              type="submit" 
              disabled={cargando}
              style={{ 
                marginTop: '10px', 
                width: '100%', 
                padding: '14px', 
                backgroundColor: cargando ? '#94a3b8' : '#2563eb', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '8px', 
                fontSize: '1.05rem', 
                fontWeight: 'bold', 
                cursor: cargando ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)',
                transition: 'background-color 0.2s'
              }}
            >
              {cargando ? 'Registrando...' : 'Registrar Avance en Bitácora'}
            </button>

          </form>
        </div>

      </div>
    </div>
  );
}

export default ActualizarJuicio;