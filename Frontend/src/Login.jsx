import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';

function Login() {
  const [identificador, setIdentificador] = useState(''); // Puede ser correo o nombre
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  const manejarLogin = async (e) => {
    e.preventDefault();
    
    if (!identificador.trim() || !password.trim()) {
      alert("Por favor, llena ambos campos.");
      return;
    }

    setCargando(true);

    try {
      // FastAPI OAuth2 exige formato form-urlencoded y el campo debe llamarse "username"
      const params = new URLSearchParams();
      params.append('username', identificador);
      params.append('password', password);

      const response = await api.post('/login', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      // Guardamos el token y vamos al dashboard
      localStorage.setItem('token', response.data.access_token);
      navigate('/dashboard');
      
    } catch (error) {
      if (error.response?.status === 401) {
        alert('❌ Credenciales incorrectas. Revisa tu usuario/correo y contraseña.');
      } else if (error.response?.status === 422) {
        alert('❌ Error de formato. El servidor no entendió la petición.');
      } else {
        alert('❌ Error al conectar con el servidor. ¿Está encendido el backend?');
      }
      console.error("Error de login:", error);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f4f7f6', fontFamily: "'Segoe UI', Roboto, sans-serif" }}>
      <div style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', width: '100%', maxWidth: '400px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ margin: 0, color: '#0f172a', fontSize: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <span>⚖️</span> PluriOne
          </h1>
          <p style={{ color: '#6c757d', margin: '5px 0 0 0' }}>Acceso al sistema LegalOps</p>
        </div>

        <form onSubmit={manejarLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#2b3445', fontWeight: '600', fontSize: '0.9rem' }}>
              Usuario o Correo:
            </label>
            <input
              type="text"
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value)}
              placeholder="pepe Perez o correo@plurione.com"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '1rem', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#2b3445', fontWeight: '600', fontSize: '0.9rem' }}>
              Contraseña:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '1rem', boxSizing: 'border-box' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={cargando}
            style={{ 
              marginTop: '10px', width: '100%', padding: '14px', backgroundColor: cargando ? '#6c757d' : '#2563eb', 
              color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: cargando ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            {cargando ? 'Verificando...' : 'Entrar al Sistema'}
          </button>
        </form>

      </div>
    </div>
  );
}

export default Login;