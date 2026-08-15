/**
 * RestoApp - Módulo de UI (js/ui.js)
 * Responsabilidad: Componentes de interfaz compartidos (Header, Nav, Footer, Toast alerts).
 */

import { isLoggedIn, getUserSession, logoutUser } from './auth.js';

/**
 * Inicializa el layout para la página activa.
 * @param {'home'|'pedido'|'login'|'admin'} activePage 
 */
export function initLayout(activePage) {
    renderHeader(activePage);
    renderFooter();
}

/**
 * Renderiza el encabezado dinámico de navegación.
 * @param {string} activePage 
 */
function renderHeader(activePage) {
    let header = document.getElementById('main-header-placeholder');
    if (!header) {
        header = document.createElement('header');
        header.className = 'main-header';
        document.body.prepend(header);
    } else {
        header.className = 'main-header';
    }

    const userSession = getUserSession();
    const authenticated = Boolean(userSession);

    header.innerHTML = `
        <div class="header-container">
            <a href="index.html" class="brand-logo">
                RestoApp <span class="brand-badge">Secured v3.0</span>
            </a>
            <nav class="main-nav">
                <a href="index.html" class="nav-link ${activePage === 'home' ? 'active' : ''}">Inicio</a>
                <a href="pedido.html" class="nav-link ${activePage === 'pedido' ? 'active' : ''}">Mesero (Pedidos)</a>
                ${authenticated ? `<a href="admin.html" class="nav-link ${activePage === 'admin' ? 'active' : ''}">Administración</a>` : ''}
            </nav>
            <div class="nav-auth-status">
                ${authenticated ? `
                    <span class="user-badge" title="${userSession.email}">👤 ${userSession.email.split('@')[0]}</span>
                    <button id="btn-logout" class="btn btn-outline" style="padding: 0.35rem 0.75rem; font-size: 0.85rem;">Salir</button>
                ` : `
                    <a href="login.html" class="btn btn-primary ${activePage === 'login' ? 'active' : ''}" style="padding: 0.35rem 0.85rem; font-size: 0.85rem;">Ingresar</a>
                `}
            </div>
        </div>
    `;

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await logoutUser();
            showToast('Sesión cerrada de forma segura', 'info');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 600);
        });
    }
}

/**
 * Renderiza el pie de página.
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
            RestoApp © ${new Date().getFullYear()} — Autenticación Segura & Reglas de Firebase Realtime DB
        </div>
    `;
}

/**
 * Muestra notificaciones flotantes (Toasts).
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
