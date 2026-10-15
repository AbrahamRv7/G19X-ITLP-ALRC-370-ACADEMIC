import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './Login';
import Dashboard from './Dashboard';
import Clientes from './Clientes'; 
import NuevoContrato from './NuevoContrato';
import NuevoLitigio from './NuevoLitigio';
import NuevoCliente from './NuevoCliente';
import ActualizarJuicio from './ActualizarJuicio';
import DetalleJuicio from './DetalleJuicio';
import DetalleCliente from './DetalleCliente'; 
import RegistrarUsuario from './RegistrarUsuario';

function Layout({ children }) {
  const location = useLocation();
  
  if (location.pathname === '/') return children;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      <Toaster 
        position="top-right" 
        toastOptions={{
          duration: 3000,
          style: { background: '#333', color: '#fff', borderRadius: '8px', fontWeight: '500' },
          success: { style: { background: '#0f5132', color: '#fff' }, iconTheme: { primary: '#fff', secondary: '#0f5132' } },
          error: { style: { background: '#721c24', color: '#fff' }, iconTheme: { primary: '#fff', secondary: '#721c24' } }
        }} 
      />

      <nav style={{
        backgroundColor: '#0f172a',
        height: '70px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 40px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        width: '100%'
      }}>
        
        <Link to="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.8rem' }}>⚖️</span>
          <span style={{ color: '#ffffff', fontSize: '1.4rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>PluriOne</span>
          <span style={{ color: '#3b82f6', fontSize: '1rem', fontWeight: '500', marginLeft: '5px', borderLeft: '1px solid #334155', paddingLeft: '10px' }}>
            LegalOps
          </span>
        </Link>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <Link to="/dashboard" style={{ 
            color: location.pathname === '/dashboard' ? '#ffffff' : '#94a3b8', 
            textDecoration: 'none', fontWeight: '600', marginRight: '10px', fontSize: '0.95rem' 
          }}>
            Dashboard
          </Link>

          <Link to="/clientes" style={{ 
            color: location.pathname === '/clientes' ? '#10b981' : '#94a3b8', 
            textDecoration: 'none', fontWeight: '600', marginRight: '15px', fontSize: '0.95rem' 
          }}>
            📇 Clientes
          </Link>
          
          <Link to="/nuevo-cliente" style={{
            backgroundColor: '#10b981', color: '#ffffff', padding: '8px 18px', borderRadius: '6px', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '600', boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
          }}>
            👥 Nuevo Cliente
          </Link>

          <Link to="/nuevo-contrato" style={{
            backgroundColor: '#2563eb', color: '#ffffff', padding: '8px 18px', borderRadius: '6px', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '600', boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
          }}>
            📄 Nuevo Contrato
          </Link>
          
          <Link to="/nuevo-litigio" style={{
            backgroundColor: '#4f46e5', color: '#ffffff', padding: '8px 18px', borderRadius: '6px', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '600', boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
          }}>
            ⚖️ Nuevo Juicio
          </Link>
        </div>
      </nav>

      <div style={{ flex: 1 }}>
        {children}
      </div>
      
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/nuevo-cliente" element={<NuevoCliente />} />
          <Route path="/nuevo-contrato" element={<NuevoContrato />} />
          <Route path="/nuevo-litigio" element={<NuevoLitigio />} />
          <Route path="/actualizar-juicio/:id" element={<ActualizarJuicio />} />
          <Route path="/detalle-juicio/:id" element={<DetalleJuicio />} />
          <Route path="/detalle-cliente/:id" element={<DetalleCliente />} />
          
          <Route path="/registrar-usuario" element={<RegistrarUsuario />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
} 

export default App;