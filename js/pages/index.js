/**
 * RestoApp - Page Controller: Home (index.html)
 */

import { initLayout } from '../ui.js';
import { fetchMenuData } from '../menu.js';

document.addEventListener('DOMContentLoaded', async () => {
    initLayout('home');
    await loadMenuStats();
});

async function loadMenuStats() {
    const totalItemsEl = document.getElementById('stat-total-items');
    if (!totalItemsEl) return;

    try {
        const items = await fetchMenuData();
        totalItemsEl.textContent = items.length;
    } catch (err) {
        totalItemsEl.textContent = 'Error';
    }
}
