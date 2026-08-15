/**
 * RestoApp - Suite de Pruebas Unitarias para Pedidos y Validaciones
 * Ejecutable tanto en navegador como en Node.js (Módulos ES).
 */

import { calculateOrderDetails, formatCurrency } from '../js/pedidos.js';

// Mini Runner de Pruebas Ligero (Zero dependencies)
const results = {
    passed: 0,
    failed: 0,
    errors: []
};

function assert(condition, message) {
    if (condition) {
        results.passed++;
        console.log(`✅ [PASS] ${message}`);
    } else {
        results.failed++;
        const errorMsg = `❌ [FAIL] ${message}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
    }
}

function assertEquals(actual, expected, message) {
    const isMatch = actual === expected;
    assert(isMatch, `${message} (Esperado: ${expected}, Obtenido: ${actual})`);
}

/**
 * Ejecuta todas las pruebas unitarias del módulo de pedidos.
 */
export function runAllTests() {
    console.log('🧪 === INICIANDO PRUEBAS UNITARIAS DE RESTOAPP ===\n');

    // 1. Pruebas de Cálculos Correctos
    console.log('--- Grupo 1: Cálculos Financieros Correctos ---');
    const res1 = calculateOrderDetails({ unitPrice: 15000, quantity: 2 });
    assert(res1.isValid, 'Pedido válido con precio $15.000 y cantidad 2');
    assertEquals(res1.subtotal, 30000, 'Subtotal debe ser $30.000');
    assertEquals(res1.tax, 5700, 'IVA (19%) debe ser $5.700');
    assertEquals(res1.total, 35700, 'Total debe ser $35.700');

    const res2 = calculateOrderDetails({ unitPrice: 8500, quantity: 1 });
    assertEquals(res2.subtotal, 8500, 'Subtotal para 1 item de $8.500');
    assertEquals(res2.tax, 1615, 'IVA para $8.500');
    assertEquals(res2.total, 10115, 'Total para $8.500');

    // 2. Pruebas de Validaciones Estrictas y Casos Borde
    console.log('\n--- Grupo 2: Validaciones Estrictas y Manejo de Errores ---');
    
    const errQtyZero = calculateOrderDetails({ unitPrice: 10000, quantity: 0 });
    assert(!errQtyZero.isValid, 'Rechaza cantidad igual a 0');
    assert(errQtyZero.error.includes('entero positivo'), 'Mensaje claro para cantidad 0');

    const errQtyNegative = calculateOrderDetails({ unitPrice: 10000, quantity: -3 });
    assert(!errQtyNegative.isValid, 'Rechaza cantidad negativa');

    const errQtyDecimal = calculateOrderDetails({ unitPrice: 10000, quantity: 1.5 });
    assert(!errQtyDecimal.isValid, 'Rechaza cantidad decimal (se requieren enteros)');

    const errPriceZero = calculateOrderDetails({ unitPrice: 0, quantity: 2 });
    assert(!errPriceZero.isValid, 'Rechaza precio unitario igual a 0');

    const errPriceNegative = calculateOrderDetails({ unitPrice: -5000, quantity: 2 });
    assert(!errPriceNegative.isValid, 'Rechaza precio unitario negativo');

    const errPriceNan = calculateOrderDetails({ unitPrice: 'abc', quantity: 2 });
    assert(!errPriceNan.isValid, 'Rechaza precio no numérico');

    // 3. Pruebas de Formato de Moneda
    console.log('\n--- Grupo 3: Formateador de Moneda ---');
    const formatted = formatCurrency(35700);
    assert(formatted.includes('35.700') || formatted.includes('35,700'), 'Formatea correctamente $35.700 COP');

    console.log('\n==================================================');
    console.log(`📊 RESUMEN DE PRUEBAS: ${results.passed} Pasadas | ${results.failed} Falladas`);
    console.log('==================================================\n');

    return results;
}

// Auto-ejecución si corre en Node.js o como script directo
if (typeof window === 'undefined') {
    runAllTests();
}
