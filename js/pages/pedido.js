/**
 * RestoApp - Page Controller: Pedido / Mesero (pedido.html)
 */

import { initLayout, showToast } from '../ui.js';
import { fetchMenuData, getMenuItemById } from '../menu.js';
import { calculateOrderDetails, formatCurrency } from '../pedidos.js';

document.addEventListener('DOMContentLoaded', () => {
    initLayout('pedido');
    initPedidoView();
});

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
        showToast('Error al conectar con Firebase.', 'error');
    }

    // 2. Autocompletar precio buscando en el caché privado de menu.js
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
    orderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleOrderSubmit();
    });
}

function handleOrderSubmit() {
    const dishSelect = document.getElementById('dish-select');
    const quantityInput = document.getElementById('quantity');
    const unitPriceInput = document.getElementById('unit-price');

    const selectedDishId = dishSelect.value;
    const quantity = quantityInput.value;
    const unitPrice = unitPriceInput.value;

    if (!selectedDishId) {
        showToast('Por favor selecciona un plato del menú.', 'error');
        return;
    }

    const item = getMenuItemById(selectedDishId);

    // Lógica financiera del módulo pedidos.js
    const result = calculateOrderDetails({
        unitPrice: unitPrice,
        quantity: quantity
    });

    if (!result.isValid) {
        showToast(result.error || 'Por favor verifica los datos ingresados.', 'error');
        return;
    }

    // Renderizar resultado en DOM
    renderOrderResult({
        dishName: item ? item.name : 'Plato Seleccionado',
        quantity: Number(quantity),
        unitPrice: Number(unitPrice),
        subtotal: result.subtotal,
        tax: result.tax,
        total: result.total
    });

    showToast('Pedido procesado exitosamente.', 'success');
}

function renderOrderResult({ dishName, quantity, unitPrice, subtotal, tax, total }) {
    const summaryContainer = document.getElementById('order-summary-box');
    if (!summaryContainer) return;

    summaryContainer.style.display = 'block';
    summaryContainer.innerHTML = `
        <h3 class="card-title" style="color: #38bdf8; border-bottom: 1px solid #334155; padding-bottom: 0.5rem;">
            🛒 Resumen del Pedido Procesado
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
