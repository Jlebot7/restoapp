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
 * Valida que un precio cumpla con las reglas de negocio.
 * @param {any} price 
 * @returns {{isValid: boolean, price?: number, error?: string}}
 */
export function validateProductPrice(price) {
    if (price === undefined || price === null || String(price).trim() === '') {
        return { isValid: false, error: 'El precio es un campo obligatorio.' };
    }

    const num = Number(price);
    if (isNaN(num) || !isFinite(num)) {
        return { isValid: false, error: 'El precio debe ser un número válido.' };
    }

    if (num <= 0) {
        return { isValid: false, error: 'El precio debe ser mayor a $0.' };
    }

    if (num > 10000000) {
        return { isValid: false, error: 'El precio no puede exceder el límite de seguridad ($10.000.000 COP).' };
    }

    return {
        isValid: true,
        price: Math.round(num * 100) / 100
    };
}

/**
 * Crea un nuevo producto en Firebase Realtime DB.
 * @param {{ name: string, price: number }} newItem
 * @returns {Promise<Object>}
 */
export async function createMenuItem(newItem) {
    if (!newItem || !newItem.name || typeof newItem.name !== 'string' || !newItem.name.trim()) {
        throw new Error('El nombre del producto es obligatorio.');
    }

    const priceValidation = validateProductPrice(newItem.price);
    if (!priceValidation.isValid) {
        throw new Error(priceValidation.error);
    }

    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: newItem.name.trim(),
                price: priceValidation.price
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
 * Actualiza el precio de un producto existente en Firebase Realtime DB.
 * @param {string} id - Identificador del producto
 * @param {number|string} newPrice - Nuevo valor de precio
 * @returns {Promise<{success: boolean, id: string, price: number}>}
 */
export async function updateMenuItemPrice(id, newPrice) {
    if (!id || typeof id !== 'string' && typeof id !== 'number') {
        throw new Error('El identificador del producto es obligatorio.');
    }

    const validation = validateProductPrice(newPrice);
    if (!validation.isValid) {
        throw new Error(validation.error);
    }

    const targetUrl = `https://stock-flow-72a8a-default-rtdb.firebaseio.com/menu/${encodeURIComponent(id)}.json`;

    try {
        const response = await fetch(targetUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                price: validation.price
            })
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error('No autorizado para modificar precios en Firebase.');
            }
            throw new Error(`Error del servidor al actualizar precio (HTTP ${response.status})`);
        }

        // Actualizar caché local
        if (cachedMenuMap.has(String(id))) {
            const cachedItem = cachedMenuMap.get(String(id));
            cachedItem.price = validation.price;
        }

        return {
            success: true,
            id: String(id),
            price: validation.price
        };
    } catch (error) {
        console.error(`[Menu] Error al actualizar precio del plato ${id}:`, error);
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
