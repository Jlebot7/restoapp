/**
 * RestoApp - API Service
 * Handles communication with Firebase Realtime Database
 */

const API_BASE_URL = 'https://stock-flow-72a8a-default-rtdb.firebaseio.com/menu.json';

/**
 * Fetches the current menu items from Firebase.
 * @returns {Promise<Array<{id: string, name: string, price: number}>>} Normalized array of menu items
 */
export async function fetchMenu() {
    try {
        const response = await fetch(API_BASE_URL);
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return normalizeMenuData(data);
    } catch (error) {
        console.error('[API Service] Error al cargar el menú:', error);
        throw error;
    }
}

/**
 * Adds a new product item to the menu in Firebase.
 * @param {{ name: string, price: number }} product 
 * @returns {Promise<Object>} Created product response
 */
export async function createProduct(product) {
    if (!product || !product.name || typeof product.price !== 'number' || product.price <= 0) {
        throw new Error('Datos de producto inválidos. Se requiere nombre y un precio mayor a 0.');
    }

    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: product.name.trim(),
                price: product.price
            })
        });

        if (!response.ok) {
            throw new Error(`Error al guardar en base de datos: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('[API Service] Error al crear producto:', error);
        throw error;
    }
}

/**
 * Normalizes array or key-object response from Firebase into a standard list.
 * @param {Array|Object} data 
 * @returns {Array<{id: string, name: string, price: number}>}
 */
function normalizeMenuData(data) {
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
        Object.keys(data).forEach((key) => {
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
