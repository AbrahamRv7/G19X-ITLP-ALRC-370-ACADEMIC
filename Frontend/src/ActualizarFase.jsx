import React, { useState } from 'react';
import axios from 'axios';

const ActualizarFaseLitigio = ({ litigioId, faseActual, alActualizar }) => {
    // Estados para guardar lo que el abogado elija escribir
    const [nuevaFase, setNuevaFase] = useState(faseActual);
    const [comentarios, setComentarios] = useState('');
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');

    const handleGuardarCambio = async (e) => {
        e.preventDefault();
        
        // Verificamos que realmente haya un cambio para no hacer peticiones en vano
        if (nuevaFase === faseActual) {
            setError('Debes seleccionar una fase diferente a la actual.');
            return;
        }

        setCargando(true);
        setError('');

        try {
            // Recuperamos el token que guardaste al hacer Login
            const token = localStorage.getItem('token'); 

            // Hacemos la petición PUT al backend
            const response = await axios.put(
                `http://localhost:8000/litigios/${litigioId}/fase`, 
                {
                    nueva_fase: nuevaFase,
                    comentarios: comentarios
                },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`, // ¡Clave para saber quién lo modificó!
                        'Content-Type': 'application/json'
                    }
                }
            );

            alert('Fase actualizada y guardada en el historial con éxito');
            
            // Si pasaste una función para recargar la tabla/vista, la llamamos aquí
            if (alActualizar) alActualizar(); 

        } catch (err) {
            console.error('Error al actualizar fase:', err);
            // Mostramos el error si es que FastAPI se queja de algo (ej. el 422)
            setError(err.response?.data?.detail || 'Ocurrió un error al guardar el cambio');
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="p-4 border rounded shadow-sm bg-white">
            <h3 className="text-lg font-bold mb-3">Actualizar Estado Procesal</h3>
            
            {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

            <form onSubmit={handleGuardarCambio}>
                {/* Selector de la Nueva Fase */}
                <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700">Nueva Fase Procesal:</label>
                    <select 
                        className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                        value={nuevaFase} 
                        onChange={(e) => setNuevaFase(e.target.value)}
                    >
                        <option value="Presentación de Demanda">Presentación de Demanda</option>
                        <option value="Contestación">Contestación</option>
                        <option value="Ofrecimiento de Pruebas">Ofrecimiento de Pruebas</option>
                        <option value="Alegatos">Alegatos</option>
                        <option value="Sentencia">Sentencia</option>
                        <option value="Amparo">Amparo</option>
                    </select>
                </div>

                {/* Campo opcional para justificar el cambio */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Comentarios (Opcional):</label>
                    <textarea 
                        className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                        rows="2"
                        placeholder="Ej. Se difirió la audiencia por falta de notificación..."
                        value={comentarios}
                        onChange={(e) => setComentarios(e.target.value)}
                    />
                </div>

                {/* Botón de Guardar */}
                <button 
                    type="submit" 
                    disabled={cargando}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                    {cargando ? 'Guardando...' : 'Registrar Avance'}
                </button>
            </form>
        </div>
    );
};

export default ActualizarFaseLitigio;