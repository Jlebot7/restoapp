/**
 * RestoApp - Cliente de Integración con el Motor PocketFlow (js/pocketflow-client.js)
 * Conexión REST con el backend FastAPI / PocketFlow.
 */

const POCKETFLOW_API_BASE = 'http://127.0.0.1:8000';

/**
 * Consulta el estado de salud del motor PocketFlow.
 * @returns {Promise<{ isOnline: boolean, data?: object }>}
 */
export async function checkEngineHealth() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const response = await fetch(`${POCKETFLOW_API_BASE}/api/health`, {
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            return { isOnline: true, data };
        }
        return { isOnline: false };
    } catch (err) {
        return { isOnline: false };
    }
}

/**
 * Envía la comanda al motor PocketFlow para su orquestación y auditoría Planner-Critic.
 * 
 * @param {Object} orderData
 * @param {string} orderData.itemId
 * @param {string} orderData.dishName
 * @param {number} orderData.qty
 * @param {number} orderData.unitPrice
 * @returns {Promise<{ success: boolean, data?: object, error?: string, engine: string }>}
 */
export async function processOrderWithPocketFlow({ itemId, dishName, qty, unitPrice }) {
    try {
        const response = await fetch(`${POCKETFLOW_API_BASE}/api/pedidos/procesar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                item_id: String(itemId),
                dish_name: String(dishName),
                qty: Number(qty),
                unit_price: Number(unitPrice)
            })
        });

        const data = await response.json();

        if (response.ok && data.is_valid) {
            return {
                success: true,
                data: data,
                engine: data.engine || 'PocketFlow v0.0.3'
            };
        } else {
            return {
                success: false,
                error: data.error_log || (data.detail && data.detail[0]?.msg) || 'La comanda fue rechazada por el motor PocketFlow.',
                data: data,
                engine: data.engine || 'PocketFlow v0.0.3'
            };
        }
    } catch (error) {
        return {
            success: false,
            error: 'No fue posible conectar con el servidor backend de PocketFlow (http://127.0.0.1:8000).',
            isOffline: true
        };
    }
}
