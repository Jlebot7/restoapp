/**
 * RestoApp - Suite Integral de Pruebas Unitarias para el Frontend
 * Cobertura: Pedidos, Finanzas (IVA 19%), Autenticación, Catálogo de Menú y Cliente PocketFlow.
 */

import { calculateOrderDetails, formatCurrency } from '../js/pedidos.js';
import { loginUser, logoutUser, isLoggedIn, getUserSession } from '../js/auth.js';
import { getMenuItemById, validateProductPrice } from '../js/menu.js';
import { checkEngineHealth, processOrderWithPocketFlow } from '../js/pocketflow-client.js';

export function runAllTests() {
    const results = {
        total: 0,
        passed: 0,
        failed: 0,
        suites: {},
        errors: []
    };

    function recordSuite(name) {
        if (!results.suites[name]) {
            results.suites[name] = { passed: 0, failed: 0 };
        }
    }

    function assert(condition, message, suiteName = 'General') {
        results.total++;
        recordSuite(suiteName);
        if (condition) {
            results.passed++;
            results.suites[suiteName].passed++;
            console.log(`✅ [PASS] [${suiteName}] ${message}`);
        } else {
            results.failed++;
            results.suites[suiteName].failed++;
            const errorMsg = `❌ [FAIL] [${suiteName}] ${message}`;
            results.errors.push(errorMsg);
            console.error(errorMsg);
        }
    }

    function assertEquals(actual, expected, message, suiteName) {
        assert(actual === expected, `${message} (Esperado: ${expected}, Obtenido: ${actual})`, suiteName);
    }

    console.log('🧪 =========================================================');
    console.log('🧪 RESTOAPP - SUITE DE PRUEBAS DE INTEGRIDAD & REGRESIÓN');
    console.log('🧪 =========================================================\n');

    // =========================================================================
    // SUITE 1: CÁLCULOS FINANCIEROS E IVA (js/pedidos.js)
    // =========================================================================
    console.log('--- 📊 Suite 1: Cálculos Financieros e IVA (19% Colombia) ---');

    const s1 = calculateOrderDetails({ unitPrice: 15000, quantity: 2 });
    assert(s1.isValid, 'Pedido estándar válido', 'Finanzas');
    assertEquals(s1.subtotal, 30000, 'Subtotal = 15.000 x 2 = $30.000', 'Finanzas');
    assertEquals(s1.tax, 5700, 'IVA (19%) de 30.000 = $5.700', 'Finanzas');
    assertEquals(s1.total, 35700, 'Total bruto = $35.700', 'Finanzas');

    const s2 = calculateOrderDetails({ unitPrice: 8500.50, quantity: 3 });
    assert(s2.isValid, 'Cálculo con precios decimales', 'Finanzas');
    assertEquals(s2.subtotal, 25501.50, 'Subtotal redondeado a 2 decimales', 'Finanzas');
    assertEquals(s2.tax, 4845.29, 'IVA calculado con redondeo financiero', 'Finanzas');
    assertEquals(s2.total, 30346.79, 'Total financiero exacto', 'Finanzas');

    // =========================================================================
    // SUITE 2: VALIDACIONES ESTRICTAS & BORDES (js/pedidos.js)
    // =========================================================================
    console.log('\n--- 🛡️ Suite 2: Validaciones Estrictas y Casos Borde ---');

    const errEmpty = calculateOrderDetails({ unitPrice: '', quantity: '' });
    assert(!errEmpty.isValid && errEmpty.error.includes('obligatorios'), 'Rechaza campos vacíos', 'Validaciones');

    const errZeroQty = calculateOrderDetails({ unitPrice: 10000, quantity: 0 });
    assert(!errZeroQty.isValid, 'Rechaza cantidad = 0', 'Validaciones');

    const errNegQty = calculateOrderDetails({ unitPrice: 10000, quantity: -2 });
    assert(!errNegQty.isValid, 'Rechaza cantidad negativa', 'Validaciones');

    const errDecQty = calculateOrderDetails({ unitPrice: 10000, quantity: 2.7 });
    assert(!errDecQty.isValid && errDecQty.error.includes('entero'), 'Rechaza cantidad con decimales', 'Validaciones');

    const errMaxQty = calculateOrderDetails({ unitPrice: 10000, quantity: 1500 });
    assert(!errMaxQty.isValid && errMaxQty.error.includes('1.000 unidades'), 'Rechaza cantidad mayor al límite de 1.000', 'Validaciones');

    const errZeroPrice = calculateOrderDetails({ unitPrice: 0, quantity: 1 });
    assert(!errZeroPrice.isValid, 'Rechaza precio = $0', 'Validaciones');

    const errNegPrice = calculateOrderDetails({ unitPrice: -5000, quantity: 1 });
    assert(!errNegPrice.isValid, 'Rechaza precio negativo', 'Validaciones');

    const errMaxPrice = calculateOrderDetails({ unitPrice: 15000000, quantity: 1 });
    assert(!errMaxPrice.isValid && errMaxPrice.error.includes('límite máximo'), 'Rechaza precio superior a $10.000.000', 'Validaciones');

    const errNan = calculateOrderDetails({ unitPrice: 'caracteres', quantity: 2 });
    assert(!errNan.isValid, 'Rechaza caracteres no numéricos en precio', 'Validaciones');

    // =========================================================================
    // SUITE 3: FORMATEO DE MONEDA (js/pedidos.js)
    // =========================================================================
    console.log('\n--- 💲 Suite 3: Formateo de Moneda COP ---');

    const f1 = formatCurrency(35700);
    assert(f1.includes('$') && (f1.includes('35.700') || f1.includes('35,700')), 'Formatea correctamente $35.700', 'Formato Moneda');

    const f2 = formatCurrency(0);
    assert(f2.includes('$') && f2.includes('0'), 'Formatea correctamente $0', 'Formato Moneda');

    // =========================================================================
    // SUITE 4: AUTENTICACIÓN Y SESIÓN (js/auth.js)
    // =========================================================================
    console.log('\n--- 🔑 Suite 4: Autenticación y Manejo de Sesión ---');

    // Limpieza inicial
    sessionStorage.clear();
    assert(!isLoggedIn(), 'isLoggedIn() retorna false sin sesión activa', 'Autenticación');
    assertEquals(getUserSession(), null, 'getUserSession() retorna null cuando no hay sesión', 'Autenticación');

    // Validación de campos vacíos
    loginUser('', '').then(res => {
        assert(!res.success, 'Rechaza login con credenciales vacías', 'Autenticación');
    });

    // Login exitoso
    loginUser('mesero@restoapp.com', 'password123').then(res => {
        assert(res.success, 'Login exitoso genera respuesta satisfactoria', 'Autenticación');
        assert(isLoggedIn(), 'isLoggedIn() retorna true tras login exitoso', 'Autenticación');
        
        const session = getUserSession();
        assert(session && session.email === 'mesero@restoapp.com', 'Sesión almacena el email correcto', 'Autenticación');
        assert(session && session.token && session.token.startsWith('session_token_'), 'Sesión genera token válido', 'Autenticación');

        // Logout
        logoutUser().then(() => {
            assert(!isLoggedIn(), 'logoutUser() elimina la sesión correctamente', 'Autenticación');
        });
    });

    // =========================================================================
    // SUITE 5: VALIDACIÓN DE PRECIOS DEL CATÁLOGO (js/menu.js)
    // =========================================================================
    console.log('\n--- 🏷️ Suite 5: Validación de Precios del Catálogo ---');

    const vp1 = validateProductPrice(25000);
    assert(vp1.isValid && vp1.price === 25000, 'Acepta precio entero válido ($25.000)', 'Catálogo & Precios');

    const vp2 = validateProductPrice('18500.50');
    assert(vp2.isValid && vp2.price === 18500.50, 'Acepta y castea precio string decimal ($18.500,50)', 'Catálogo & Precios');

    const vpEmpty = validateProductPrice('');
    assert(!vpEmpty.isValid && vpEmpty.error.includes('obligatorio'), 'Rechaza precio vacío al editar', 'Catálogo & Precios');

    const vpZero = validateProductPrice(0);
    assert(!vpZero.isValid && vpZero.error.includes('mayor a $0'), 'Rechaza precio = $0 al editar', 'Catálogo & Precios');

    const vpNeg = validateProductPrice(-1500);
    assert(!vpNeg.isValid, 'Rechaza precio negativo al editar', 'Catálogo & Precios');

    const vpMax = validateProductPrice(20000000);
    assert(!vpMax.isValid && vpMax.error.includes('límite de seguridad'), 'Rechaza precio superior a $10.000.000', 'Catálogo & Precios');

    const vpNan = validateProductPrice('abc');
    assert(!vpNan.isValid && vpNan.error.includes('número válido'), 'Rechaza precio alfanumérico', 'Catálogo & Precios');

    // =========================================================================
    // SUITE 6: CLIENTE POCKETFLOW Y RESILIENCIA (js/pocketflow-client.js)
    // =========================================================================
    console.log('\n--- ⚡ Suite 6: Cliente PocketFlow y Resiliencia ---');

    checkEngineHealth().then(health => {
        assert(typeof health.isOnline === 'boolean', 'checkEngineHealth retorna booleano isOnline', 'PocketFlow Client');
    });

    console.log('\n=========================================================');
    console.log(`📊 TOTAL: ${results.total} Pruebas | ✅ ${results.passed} Pasadas | ❌ ${results.failed} Falladas`);
    console.log('=========================================================\n');

    return results;
}

if (typeof window === 'undefined') {
    runAllTests();
}
