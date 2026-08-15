/**
 * RestoApp - UI Shared Utilities
 * Manages global components like Header, Navigation, and Toast notifications.
 */

import { isAuthenticated, getCurrentUser, logout } from '../services/auth.js';

/**
 * Initializes shared layout components (Header & Navigation).
 * @param {string} activePage - Name of the active page ('home', 'pedido', 'login', 'admin')
 */
export function initLayout(activePage) {
    renderHeader(activePage);
    renderFooter();
}

/**
 * Renders the top Navigation Header into element with id 'main-header-placeholder' or prepends to body.
 * @param {string} activePage 
 */
function renderHeader(activePage) {
    let headerContainer = document.getElementById('main-header-placeholder');
    if (!headerContainer) {
        headerContainer = document.createElement('header');
        headerContainer.className = 'main-header';
        document.body.prepend(headerContainer);
    } else {
        headerContainer.className = 'main-header';
    }

    const user = getCurrentUser();
    const isLogged = Boolean(user);

    headerContainer.innerHTML = `
        <div class="header-container">
            <a href="index.html" class="brand-logo">
                RestoApp <span class="brand-badge">MPA v2.0</span>
            </a>
            <nav class="main-nav">
                <a href="index.html" class="nav-link ${activePage === 'home' ? 'active' : ''}">Inicio</a>
                <a href="pedido.html" class="nav-link ${activePage === 'pedido' ? 'active' : ''}">Mesero (Pedidos)</a>
                ${isLogged ? `<a href="admin.html" class="nav-link ${activePage === 'admin' ? 'active' : ''}">Administración</a>` : ''}
            </nav>
            <div class="nav-auth-status">
                ${isLogged ? `
                    <span class="user-badge">👤 ${user.username}</span>
                    <button id="btn-logout" class="btn btn-outline" style="padding: 0.35rem 0.75rem; font-size: 0.85rem;">Salir</button>
                ` : `
                    <a href="login.html" class="btn btn-primary ${activePage === 'login' ? 'active' : ''}" style="padding: 0.35rem 0.85rem; font-size: 0.85rem;">Ingresar</a>
                `}
            </div>
        </div>
    `;

    // Logout listener
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            logout();
            showToast('Sesión cerrada correctamente', 'info');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 800);
        });
    }
}

/**
 * Appends standard footer.
 */
function renderFooter() {
    let footer = document.querySelector('footer');
    if (!footer) {
        footer = document.createElement('footer');
        footer.className = 'main-footer';
        document.body.appendChild(footer);
    }
    footer.innerHTML = `
        <div style="max-width: 1100px; margin: 0 auto; padding: 0 1.5rem;">
            RestoApp © ${new Date().getFullYear()} — Sistema de Gestión para Restaurantes | Proyecto Refactorizado a MPA Modular
        </div>
    `;
}

/**
 * Displays a non-blocking toast notification message.
 * @param {string} message 
 * @param {'success'|'error'|'info'} [type='info'] 
 * @param {number} [duration=3500] 
 */
export function showToast(message, type = 'info', duration = 3500) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}
