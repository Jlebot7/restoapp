/**
 * RestoApp - Page Controller: Pedido / Mesero (pedido.html)
 * Integrado con el Motor de Orquestación PocketFlow & Auditoría Planner-Critic.
 */

import { initLayout, showToast } from '../ui.js';
import { fetchMenuData, getMenuItemById } from '../menu.js';
import { calculateOrderDetails, formatCurrency } from '../pedidos.js';
import { checkEngineHealth, processOrderWithPocketFlow } from '../pocketflow-client.js';

document.addEventListener('DOMContentLoaded', () => {
    initLayout('pedido');
    initPedidoView();
    verifyPocketFlowEngine();
});

let isPocketFlowOnline = false;

async function verifyPocketFlowEngine() {
    const badge = document.getElementById('pocketflow-badge');
    const statusText = document.getElementById('pocketflow-status-text');
    if (!badge || !statusText) return;

    const health = await checkEngineHealth();
    isPocketFlowOnline = health.isOnline;

    if (health.isOnline) {
        badge.className = 'engine-badge online';
        statusText.textContent = '⚡ PocketFlow Engine: Online (4 Nodos Activos)';
    } else {
        badge.className = 'engine-badge offline';
        statusText.textContent = '⚡ PocketFlow Engine: Modo Offline / Local (Inicie python api.py)';
    }
}

async function initPedidoView() {
    const dishSelect = document.getElementById('dish-select');
    const unitPriceInput = document.getElementById('unit-price');
    const orderForm = document.getElementById('order-form');

    // 1. Cargar Menú desde el módulo ES menu.js
    try {
        dishSelect.innerHTML = '<option value="">-- Cargando platos del menú... --</option>';
        const menuItems = await fetchMenuData();
        
        dishSelect.innerHTML = '<option value="">-- Selecciona un plato --</option>';

        if (menuItems.length === 0) {
            dishSelect.innerHTML = '<option value="">No hay platos registrados</option>';
            showToast('El menú no contiene platos actualmente.', 'info');
            return;
        }

        menuItems.forEach((item) => {
            const opt = document.createElement('option');
            opt.value = item.id;
            opt.textContent = `${item.name} (${formatCurrency(item.price)})`;
            dishSelect.appendChild(opt);
        });

        showToast('Menú sincronizado.', 'success');
    } catch (error) {
        dishSelect.innerHTML = '<option value="">-- Error al cargar menú --</option>';
        showToast('Error al conectar con el catálogo de menú.', 'error');
    }

    // 2. Autocompletar precio buscando en el caché de menu.js
    dishSelect.addEventListener('change', (e) => {
        const selectedId = e.target.value;
        const item = getMenuItemById(selectedId);
        if (item) {
            unitPriceInput.value = item.price;
        } else {
            unitPriceInput.value = '';
        }
    });

    // 3. Procesar formulario de comanda
    orderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleOrderSubmit();
    });
}

async function handleOrderSubmit() {
    const dishSelect = document.getElementById('dish-select');
    const quantityInput = document.getElementById('quantity');
    const unitPriceInput = document.getElementById('unit-price');
    const submitBtn = document.getElementById('btn-process-order');

    const selectedDishId = dishSelect.value;
    const quantity = Number(quantityInput.value);
    const unitPrice = Number(unitPriceInput.value);

    if (!selectedDishId) {
        showToast('Por favor selecciona un plato del menú.', 'error');
        return;
    }

    if (!quantity || quantity <= 0) {
        showToast('La cantidad debe ser mayor a 0 unidades.', 'error');
        return;
    }

    if (!unitPrice || unitPrice <= 0) {
        showToast('El precio unitario debe ser mayor a $0.', 'error');
        return;
    }

    const item = getMenuItemById(selectedDishId);
    const dishName = item ? item.name : 'Plato Seleccionado';

    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Procesando en Grafo PocketFlow...';

    try {
        // Intento de procesamiento en backend PocketFlow
        const pocketResult = await processOrderWithPocketFlow({
            itemId: selectedDishId,
            dishName: dishName,
            qty: quantity,
            unitPrice: unitPrice
        });

        if (pocketResult.success) {
            // Procesado con éxito por PocketFlow
            const { summary, validation_results } = pocketResult.data;
            renderPocketFlowResult({
                orderId: summary.order_id,
                dishName: summary.dish_name,
                quantity: summary.quantity,
                unitPrice: summary.unit_price,
                subtotal: summary.subtotal,
                tax: summary.tax,
                total: summary.total,
                validationResults: validation_results,
                engine: pocketResult.engine
            });
            showToast(`✅ Pedido ${summary.order_id} procesado y auditado con éxito.`, 'success');
            verifyPocketFlowEngine();
        } else if (!pocketResult.isOffline) {
            // El servidor respondió y rechazó la comanda por reglas de negocio
            showToast(`❌ Rechazado por PocketFlow: ${pocketResult.error}`, 'error');
            renderRejectedResult(pocketResult.error, pocketResult.data?.validation_results);
        } else {
            // Servidor offline: Fallback local con módulo pedidos.js
            const localResult = calculateOrderDetails({ unitPrice, quantity });
            if (!localResult.isValid) {
                showToast(localResult.error || 'Error en validación local.', 'error');
                return;
            }

            renderOrderResultFallback({
                dishName,
                quantity,
                unitPrice,
                subtotal: localResult.subtotal,
                tax: localResult.tax,
                total: localResult.total
            });
            showToast('Pedido procesado con cálculo local (Backend offline).', 'warning');
            verifyPocketFlowEngine();
        }
    } catch (err) {
        showToast('Error inesperado al procesar el pedido.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '⚡ PROCESAR PEDIDO CON POCKETFLOW';
    }
}

function renderPocketFlowResult({ orderId, dishName, quantity, unitPrice, subtotal, tax, total, validationResults, engine }) {
    const summaryContainer = document.getElementById('order-summary-box');
    if (!summaryContainer) return;

    summaryContainer.style.display = 'block';
    summaryContainer.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 0.5rem; margin-bottom: 1rem;">
            <h3 class="card-title" style="color: #38bdf8; margin: 0;">
                🛒 Comanda Confirmada (${orderId})
            </h3>
            <span style="font-size: 0.75rem; background: #0284c7; color: white; padding: 0.2rem 0.5rem; border-radius: 4px;">
                ${engine}
            </span>
        </div>

        <div class="summary-row">
            <span>Plato:</span>
            <strong>${dishName}</strong>
        </div>
        <div class="summary-row">
            <span>Cantidad:</span>
            <span>${quantity} unidad(es)</span>
        </div>
        <div class="summary-row">
            <span>Precio Unitario:</span>
            <span>${formatCurrency(unitPrice)}</span>
        </div>
        <div class="summary-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(subtotal)}</span>
        </div>
        <div class="summary-row">
            <span>IVA (19%):</span>
            <span>${formatCurrency(tax)}</span>
        </div>
        <div class="summary-row total">
            <span>TOTAL A COBRAR:</span>
            <span>${formatCurrency(total)}</span>
        </div>

        <div class="pipeline-card">
            <div style="font-weight: 600; font-size: 0.85rem; margin-bottom: 0.5rem; color: #1e293b;">
                🔍 Traza de Auditoría del Grafo PocketFlow:
            </div>
            <div class="pipeline-step">
                <span class="step-icon ok">✔</span>
                <span><strong>StockNode:</strong> ${validationResults?.stock?.message || 'Stock disponible verificado'}</span>
            </div>
            <div class="pipeline-step">
                <span class="step-icon ok">✔</span>
                <span><strong>TaxAndPricingNode:</strong> ${validationResults?.pricing?.message || 'IVA 19% calculado'}</span>
            </div>
            <div class="pipeline-step">
                <span class="step-icon critic">🛡️</span>
                <span><strong>AuditCriticNode:</strong> ${validationResults?.audit?.message || 'Aprobado por Critic'} [${validationResults?.audit?.audit_code || 'PASS'}]</span>
            </div>
        </div>
    `;

    summaryContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderRejectedResult(reason, validationResults) {
    const summaryContainer = document.getElementById('order-summary-box');
    if (!summaryContainer) return;

    summaryContainer.style.display = 'block';
    summaryContainer.innerHTML = `
        <h3 class="card-title" style="color: #ef4444; border-bottom: 1px solid #fee2e2; padding-bottom: 0.5rem;">
            ⛔ Pedido Rechazado por PocketFlow
        </h3>
        <p style="color: #991b1b; margin: 1rem 0; font-weight: 500;">
            ${reason}
        </p>
        <div class="pipeline-card" style="background: #fef2f2; border-color: #fecaca;">
            <div style="font-weight: 600; font-size: 0.85rem; color: #991b1b; margin-bottom: 0.35rem;">
                Resultado de Validación:
            </div>
            <div class="pipeline-step" style="color: #b91c1c;">
                <span>❌ El flujo se detuvo en las reglas de seguridad o inventario.</span>
            </div>
        </div>
    `;
    summaryContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderOrderResultFallback({ dishName, quantity, unitPrice, subtotal, tax, total }) {
    const summaryContainer = document.getElementById('order-summary-box');
    if (!summaryContainer) return;

    summaryContainer.style.display = 'block';
    summaryContainer.innerHTML = `
        <h3 class="card-title" style="color: #38bdf8; border-bottom: 1px solid #334155; padding-bottom: 0.5rem;">
            🛒 Resumen del Pedido (Cálculo Local)
        </h3>
        <div class="summary-row">
            <span>Plato:</span>
            <strong>${dishName}</strong>
        </div>
        <div class="summary-row">
            <span>Cantidad:</span>
            <span>${quantity} unidad(es)</span>
        </div>
        <div class="summary-row">
            <span>Precio Unitario:</span>
            <span>${formatCurrency(unitPrice)}</span>
        </div>
        <div class="summary-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(subtotal)}</span>
        </div>
        <div class="summary-row">
            <span>IVA (19%):</span>
            <span>${formatCurrency(tax)}</span>
        </div>
        <div class="summary-row total">
            <span>TOTAL:</span>
            <span>${formatCurrency(total)}</span>
        </div>
    `;

    summaryContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
