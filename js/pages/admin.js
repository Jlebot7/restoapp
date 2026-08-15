/**
 * RestoApp - Page Controller: Admin (admin.html)
 */

import { initLayout, showToast } from '../ui.js';
import { requireAuthentication } from '../auth.js';
import { fetchMenuData, createMenuItem } from '../menu.js';
import { formatCurrency } from '../pedidos.js';

document.addEventListener('DOMContentLoaded', () => {
    // Proteger ruta con guard de auth.js
    requireAuthentication();

    initLayout('admin');
    initAdminView();
});

async function initAdminView() {
    await loadProductsTable();

    const createProductForm = document.getElementById('create-product-form');
    createProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleCreateProduct();
    });
}

async function loadProductsTable() {
    const tableBody = document.getElementById('products-table-body');
    const productCountEl = document.getElementById('product-count');
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color: var(--text-muted);">Cargando catálogo de productos...</td></tr>`;

    try {
        const products = await fetchMenuData();
        if (productCountEl) productCountEl.textContent = products.length;

        if (products.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color: var(--text-muted);">No hay productos registrados en el menú.</td></tr>`;
            return;
        }

        tableBody.innerHTML = products.map((item, index) => `
            <tr>
                <td><strong>#${index + 1}</strong> (${item.id})</td>
                <td>${item.name}</td>
                <td><span style="font-weight: 600; color: var(--primary);">${formatCurrency(item.price)}</span></td>
            </tr>
        `).join('');
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color: var(--danger);">Error al cargar productos desde Firebase.</td></tr>`;
        showToast('Error cargando el catálogo de productos.', 'error');
    }
}

async function handleCreateProduct() {
    const nameInput = document.getElementById('new-product-name');
    const priceInput = document.getElementById('new-product-price');
    const submitBtn = document.getElementById('btn-create-product');

    const name = nameInput.value.trim();
    const price = Number(priceInput.value);

    if (!name) {
        showToast('El nombre del producto es obligatorio.', 'error');
        return;
    }

    if (isNaN(price) || price <= 0) {
        showToast('El precio debe ser un número mayor a 0.', 'error');
        return;
    }

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';

        await createMenuItem({ name, price });

        showToast(`Producto "${name}" creado exitosamente.`, 'success');

        nameInput.value = '';
        priceInput.value = '';

        await loadProductsTable();
    } catch (error) {
        showToast('Error al crear el producto en Firebase.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Guardar Producto en Firebase';
    }
}
