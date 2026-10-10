import React, { useState } from 'react';
import { crearCliente } from '../utils/api'; // Ajusta la ruta a tu archivo

export default function FormularioCliente() {
    const [nombre, setNombre] = useState('');
    const [correo, setCorreo] = useState('');
    const [mensaje, setMensaje] = useState('');

    const manejarEnvio = async (e) => {
        e.preventDefault();
        
        try {
            // Llamamos a nuestro backend
            const nuevoCliente = await crearCliente({
                nombre_completo: nombre,
                correo: correo,
                // Si el RFC o teléfono están vacíos, no pasa nada, en FastAPI los pusimos como opcionales
            });
            
            setMensaje(`¡Éxito! Cliente guardado con el ID: ${nuevoCliente.id}`);
            // Aquí puedes limpiar el formulario o redirigir a otra pantalla
            setNombre('');
            setCorreo('');
        } catch (error) {
            setMensaje("Hubo un problema al guardar el cliente.");
            console.error(error);
        }
    };

    return (
        <form onSubmit={manejarEnvio}>
            <h2>Registrar Nuevo Cliente</h2>
            <input 
                type="text" 
                placeholder="Nombre Completo" 
                value={nombre} 
                onChange={(e) => setNombre(e.target.value)} 
                required 
            />
            <input 
                type="email" 
                placeholder="Correo Electrónico" 
                value={correo} 
                onChange={(e) => setCorreo(e.target.value)} 
            />
            <button type="submit">Guardar Cliente</button>
            
            {mensaje && <p>{mensaje}</p>}
        </form>
    );
}