/**
 * RestoApp - Módulo de Menú (js/menu.js)
 * Responsabilidad: Gestión del menú y comunicación con Firebase Realtime DB.
 * 
 * 📌 BUENAS PRÁCTICAS (EJERCICIO 5):
 * - Separación estricta: Este módulo NO realiza ninguna manipulación del DOM.
 * - Manejo de errores robusto: Controla errores de red, respuestas HTTP no OK y formato JSON.
 */

import { getAuthToken } from './auth.js';

const API_BASE_URL = 'https://stock-flow-2e23e-default-rtdb.firebaseio.com/menu.json';

// Caché de menú privado en el módulo (Sin variables globales)
let cachedMenuMap = new Map();

/**
 * Obtiene el menú desde Firebase DB (Lectura pública).
 * Pura gestión de datos, sin manipulación de elementos del DOM.
 * 
 * @returns {Promise<Array<{id: string, name: string, price: number}>>}
 */
export async function fetchMenuData() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

        const response = await fetch(API_BASE_URL, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Error en servidor Firebase (HTTP ${response.status}: ${response.statusText})`);
        }

        const rawData = await response.json();
        const normalized = normalizeData(rawData);

        // Actualizar caché interno
        cachedMenuMap.clear();
        normalized.forEach(item => cachedMenuMap.set(item.id, item));

        return normalized;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('[Menu Module] La solicitud a Firebase superó el tiempo de espera (Timeout).');
            throw new Error('Tiempo de espera agotado al conectar con el servidor.');
        }
        console.error('[Menu Module] Error al cargar menú desde Firebase:', error);
        throw error;
    }
}

/**
 * Busca un producto en el caché local por su ID.
 * @param {string} id 
 * @returns {{id: string, name: string, price: number}|undefined}
 */
export function getMenuItemById(id) {
    return cachedMenuMap.get(String(id));
}

/**
 * Crea un nuevo producto en Firebase DB.
 * Pura llamada API sin modificar el DOM.
 * 
 * @param {{ name: string, price: number }} newItem 
 * @returns {Promise<Object>}
 */
export async function createMenuItem(newItem) {
    if (!newItem || !newItem.name || typeof newItem.price !== 'number' || newItem.price <= 0) {
        throw new Error('Datos de producto inválidos. Nombre obligatorio y precio mayor a $0.');
    }

    const token = getAuthToken();

    // ========================================================================
    // TODO: EJERCICIO 3 - ADJUNTAR ID TOKEN AL PUBLICAR REGLAS DATABASE.RULES.JSON
    // ========================================================================
    /*
    const writeUrl = token ? `${API_BASE_URL}?auth=${encodeURIComponent(token)}` : API_BASE_URL;
    */
    const writeUrl = API_BASE_URL;

    try {
        const response = await fetch(writeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: newItem.name.trim(),
                price: newItem.price
            })
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error('No autorizado: La base de datos requiere autenticación para crear productos.');
            }
            throw new Error(`Error en servidor Firebase (HTTP ${response.status})`);
        }

        return await response.json();
    } catch (error) {
        console.error('[Menu Module] Error al guardar producto:', error);
        throw error;
    }
}

/**
 * Normaliza objetos o arreglos provenientes de Firebase DB.
 * @param {Object|Array} data 
 * @returns {Array<{id: string, name: string, price: number}>}
 */
function normalizeData(data) {
    if (!data) return [];
    const items = [];

    if (Array.isArray(data)) {
        data.forEach((item, index) => {
            if (item) {
                items.push({
                    id: String(item.id || index),
                    name: item.name || `Plato ${index}`,
                    price: Number(item.price || item.precio || 0)
                });
            }
        });
    } else if (typeof data === 'object') {
        Object.keys(data).forEach(key => {
            const item = data[key] || {};
            items.push({
                id: key,
                name: item.name || key,
                price: Number(item.price || item.precio || 0)
            });
        });
    }

    return items;
}
