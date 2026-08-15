/**
 * RestoApp - Order Calculator Module
 * Pure business logic for financial and order calculations.
 */

const DEFAULT_TAX_RATE = 0.19; // 19% IVA

/**
 * Calculates subtotal, tax and total for an item order.
 * @param {Object} params
 * @param {number} params.unitPrice - Price per unit
 * @param {number} params.quantity - Number of units
 * @param {number} [params.taxRate=0.19] - Tax percentage in decimal (e.g. 0.19)
 * @returns {{ subtotal: number, tax: number, total: number, isValid: boolean, error?: string }}
 */
export function calculateOrder({ unitPrice, quantity, taxRate = DEFAULT_TAX_RATE }) {
    const price = Number(unitPrice);
    const qty = Number(quantity);

    if (isNaN(price) || price <= 0) {
        return { subtotal: 0, tax: 0, total: 0, isValid: false, error: 'El precio unitario debe ser mayor a 0.' };
    }

    if (isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
        return { subtotal: 0, tax: 0, total: 0, isValid: false, error: 'La cantidad debe ser un número entero positivo.' };
    }

    const subtotal = price * qty;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    return {
        subtotal: roundCurrency(subtotal),
        tax: roundCurrency(tax),
        total: roundCurrency(total),
        isValid: true
    };
}

/**
 * Formats a numeric amount to standard COP/USD currency string.
 * @param {number} amount 
 * @returns {string} Formatted currency e.g. "$ 15,000.00"
 */
export function formatCurrency(amount) {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2
    }).format(num);
}

/**
 * Utility to round a float to 2 decimal places.
 * @param {number} num 
 * @returns {number}
 */
function roundCurrency(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
}
