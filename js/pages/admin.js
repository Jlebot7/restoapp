/**
 * RestoApp - Page Controller: Admin (admin.html)
 */

import { initLayout, showToast } from '../ui.js';
import { requireAuthentication } from '../auth.js';
import { fetchMenuData, createMenuItem, updateMenuItemPrice, validateProductPrice } from '../menu.js';
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

    tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-muted); padding: 1.5rem;">Cargando catálogo de productos...</td></tr>`;

    try {
        const products = await fetchMenuData();
        if (productCountEl) productCountEl.textContent = products.length;

        if (products.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-muted); padding: 1.5rem;">No hay productos registrados en el menú.</td></tr>`;
            return;
        }

        tableBody.innerHTML = '';
        products.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.id = `row-${item.id}`;
            renderRowDefault(tr, item, index);
            tableBody.appendChild(tr);
        });
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--danger); padding: 1.5rem;">Error al cargar productos desde Firebase.</td></tr>`;
        showToast('Error cargando el catálogo de productos.', 'error');
    }
}

/**
 * Renderiza la fila en modo visualización estándar.
 */
function renderRowDefault(tr, item, index) {
    tr.innerHTML = `
        <td><strong>#${index + 1}</strong> <span style="font-size: 0.8rem; color: var(--text-muted);">(${item.id})</span></td>
        <td><strong>${escapeHtml(item.name)}</strong></td>
        <td><span style="font-weight: 600; color: var(--primary); font-size: 1rem;">${formatCurrency(item.price)}</span></td>
        <td style="text-align: right;">
            <button type="button" class="btn btn-outline btn-edit-price" style="padding: 0.3rem 0.75rem; font-size: 0.85rem;" data-id="${item.id}">
                ✏️ Cambiar Precio
            </button>
        </td>
    `;

    const editBtn = tr.querySelector('.btn-edit-price');
    editBtn.addEventListener('click', () => {
        renderRowEditMode(tr, item, index);
    });
}

/**
 * Renderiza la fila en modo de edición de precio interactivo.
 */
function renderRowEditMode(tr, item, index) {
    tr.innerHTML = `
        <td><strong>#${index + 1}</strong> <span style="font-size: 0.8rem; color: var(--text-muted);">(${item.id})</span></td>
        <td><strong>${escapeHtml(item.name)}</strong></td>
        <td>
            <div style="display: flex; align-items: center; gap: 0.35rem;">
                <span style="font-weight: 600; color: var(--text-muted);">$</span>
                <input type="number" class="form-control edit-price-input" value="${item.price}" min="1" step="100" style="width: 140px; padding: 0.3rem 0.5rem; font-weight: 600;" required>
            </div>
            <div class="edit-error-msg" style="color: var(--danger); font-size: 0.75rem; margin-top: 0.2rem; display: none;"></div>
        </td>
        <td style="text-align: right;">
            <div style="display: inline-flex; gap: 0.4rem;">
                <button type="button" class="btn btn-success btn-save-price" style="padding: 0.3rem 0.65rem; font-size: 0.85rem;">
                    💾 Guardar
                </button>
                <button type="button" class="btn btn-outline btn-cancel-price" style="padding: 0.3rem 0.65rem; font-size: 0.85rem;">
                    ✖ Cancelar
                </button>
            </div>
        </td>
    `;

    const priceInput = tr.querySelector('.edit-price-input');
    const saveBtn = tr.querySelector('.btn-save-price');
    const cancelBtn = tr.querySelector('.btn-cancel-price');
    const errorMsg = tr.querySelector('.edit-error-msg');

    priceInput.focus();
    priceInput.select();

    // Cancelar edición
    cancelBtn.addEventListener('click', () => {
        renderRowDefault(tr, item, index);
    });

    // Guardar nuevo precio
    const executeSave = async () => {
        const rawValue = priceInput.value;
        const validation = validateProductPrice(rawValue);

        if (!validation.isValid) {
            errorMsg.textContent = validation.error;
            errorMsg.style.display = 'block';
            priceInput.focus();
            return;
        }

        errorMsg.style.display = 'none';

        try {
            saveBtn.disabled = true;
            cancelBtn.disabled = true;
            saveBtn.textContent = 'Guardando...';

            await updateMenuItemPrice(item.id, validation.price);

            showToast(`✅ Precio de "${item.name}" actualizado a ${formatCurrency(validation.price)}`, 'success');
            item.price = validation.price;
            renderRowDefault(tr, item, index);
        } catch (err) {
            errorMsg.textContent = err.message || 'Error al guardar en Firebase.';
            errorMsg.style.display = 'block';
            showToast(err.message || 'Error al actualizar el precio.', 'error');
            saveBtn.disabled = false;
            cancelBtn.disabled = false;
            saveBtn.textContent = '💾 Guardar';
        }
    };

    saveBtn.addEventListener('click', executeSave);

    priceInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            executeSave();
        } else if (e.key === 'Escape') {
            renderRowDefault(tr, item, index);
        }
    });
}

async function handleCreateProduct() {
    const nameInput = document.getElementById('new-product-name');
    const priceInput = document.getElementById('new-product-price');
    const submitBtn = document.getElementById('btn-create-product');

    const name = nameInput.value.trim();
    const rawPrice = priceInput.value;

    if (!name) {
        showToast('El nombre del producto es obligatorio.', 'error');
        nameInput.focus();
        return;
    }

    const priceValidation = validateProductPrice(rawPrice);
    if (!priceValidation.isValid) {
        showToast(priceValidation.error, 'error');
        priceInput.focus();
        return;
    }

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';

        await createMenuItem({ name, price: priceValidation.price });

        showToast(`Producto "${name}" creado exitosamente (${formatCurrency(priceValidation.price)}).`, 'success');

        nameInput.value = '';
        priceInput.value = '';

        await loadProductsTable();
    } catch (error) {
        showToast(error.message || 'Error al crear el producto en Firebase.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Guardar Producto en Firebase';
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
