import axios from 'axios';

const API_URL = "https://plurione-backend-ur9j.onrender.com";

export const crearCliente = async (datosCliente) => {
    const respuesta = await fetch(`${API_URL}/clientes/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            // "Authorization": `Bearer ${token}` <-- Lo agregarás cuando protejas la ruta
        },
        body: JSON.stringify(datosCliente)
    });

    if (!respuesta.ok) {
        throw new Error("Error al crear el cliente en la base de datos");
    }
    return await respuesta.json();
};

export const crearExpediente = async (datosExpediente) => {
    const respuesta = await fetch(`${API_URL}/expedientes/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(datosExpediente)
    });

    if (!respuesta.ok) {
        throw new Error("Error al crear el expediente");
    }
    return await respuesta.json();
};

export default api;