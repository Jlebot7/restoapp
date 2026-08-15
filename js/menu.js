/**
 * RestoApp — Módulo de Menú (js/menu.js)
 * Gestión del catálogo de productos y comunicación con Firebase Realtime DB.
 * No realiza ninguna manipulación del DOM.
 */

const API_BASE_URL = 'https://stock-flow-72a8a-default-rtdb.firebaseio.com/menu.json';

let cachedMenuMap = new Map();

/**
 * Obtiene el menú desde Firebase Realtime DB.
 * @returns {Promise<Array<{id: string, name: string, price: number}>>}
 */
export async function fetchMenuData() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(API_BASE_URL, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Error en servidor Firebase (HTTP ${response.status}: ${response.statusText})`);
        }

        const rawData = await response.json();
        const normalized = normalizeData(rawData);

        cachedMenuMap.clear();
        normalized.forEach(item => cachedMenuMap.set(item.id, item));

        return normalized;
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('Tiempo de espera agotado al conectar con el servidor.');
        }
        console.error('[Menu] Error al cargar menú desde Firebase:', error);
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
 * Crea un nuevo producto en Firebase Realtime DB.
 * @param {{ name: string, price: number }} newItem
 * @returns {Promise<Object>}
 */
export async function createMenuItem(newItem) {
    if (!newItem || !newItem.name || typeof newItem.price !== 'number' || newItem.price <= 0) {
        throw new Error('Datos de producto inválidos. Nombre obligatorio y precio mayor a $0.');
    }

    try {
        const response = await fetch(API_BASE_URL, {
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
        console.error('[Menu] Error al guardar producto:', error);
        throw error;
    }
}

/**
 * Normaliza la respuesta de Firebase (objeto clave-valor o array) a un array estándar.
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
