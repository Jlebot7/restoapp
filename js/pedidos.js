/**
 * RestoApp - Módulo de Pedidos & Validaciones Estrictas (js/pedidos.js)
 * Responsabilidad: Lógica de negocio pura para cálculo de comanda, IVA y formateo financiero.
 */

const DEFAULT_TAX_RATE = 0.19; // 19% IVA Colombia

/**
 * Valida estrictamente y calcula subtotal, impuesto (IVA 19%) y total para un pedido.
 * 
 * @param {Object} params
 * @param {number|string} params.unitPrice - Precio unitario del plato
 * @param {number|string} params.quantity - Cantidad solicitada
 * @param {number} [params.taxRate=0.19] - Tasa de IVA opcional (0.19 por defecto)
 * @returns {{ subtotal: number, tax: number, total: number, isValid: boolean, error?: string }}
 */
export function calculateOrderDetails({ unitPrice, quantity, taxRate = DEFAULT_TAX_RATE }) {
    // Sanitización y conversión explícita
    const rawPrice = String(unitPrice).trim();
    const rawQty = String(quantity).trim();

    if (rawPrice === '' || rawQty === '') {
        return { subtotal: 0, tax: 0, total: 0, isValid: false, error: 'Todos los campos (precio y cantidad) son obligatorios.' };
    }

    const price = Number(rawPrice);
    const qty = Number(rawQty);

    // Validaciones estrictas numéricas
    if (isNaN(price) || !isFinite(price)) {
        return { subtotal: 0, tax: 0, total: 0, isValid: false, error: 'El precio unitario ingresado debe ser un valor numérico válido.' };
    }

    if (price <= 0) {
        return { subtotal: 0, tax: 0, total: 0, isValid: false, error: 'El precio unitario debe ser mayor a $0 COP.' };
    }

    if (price > 10000000) {
        return { subtotal: 0, tax: 0, total: 0, isValid: false, error: 'El precio unitario excede el límite máximo permitido ($10.000.000 COP).' };
    }

    if (isNaN(qty) || !isFinite(qty)) {
        return { subtotal: 0, tax: 0, total: 0, isValid: false, error: 'La cantidad ingresada debe ser un valor numérico válido.' };
    }

    if (qty <= 0) {
        return { subtotal: 0, tax: 0, total: 0, isValid: false, error: 'La cantidad ingresada debe ser mayor a 0 unidades.' };
    }

    if (!Number.isInteger(qty)) {
        return { subtotal: 0, tax: 0, total: 0, isValid: false, error: 'La cantidad debe ser un número entero positivo (sin decimales).' };
    }

    if (qty > 1000) {
        return { subtotal: 0, tax: 0, total: 0, isValid: false, error: 'La cantidad máxima por pedido individual no puede exceder 1.000 unidades.' };
    }

    const subtotal = price * qty;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    return {
        subtotal: roundToTwoDecimals(subtotal),
        tax: roundToTwoDecimals(tax),
        total: roundToTwoDecimals(total),
        isValid: true
    };
}

/**
 * Sanitiza una cadena de texto eliminando etiquetas HTML para prevenir XSS.
 * @param {string} str 
 * @returns {string}
 */
export function sanitizeString(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
}

/**
 * Formatea un monto numérico a formato de moneda local COP.
 * @param {number} amount 
 * @returns {string} Ejemplo: "$ 15.000,00"
 */
export function formatCurrency(amount) {
    const value = Number(amount) || 0;
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2
    }).format(value);
}

/**
 * Redondea un número a 2 decimales para evitar imprecisiones de coma flotante.
 * @param {number} num 
 * @returns {number}
 */
function roundToTwoDecimals(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
}
