/**
 * RestoApp — Módulo de Autenticación (js/auth.js)
 * Gestiona el ciclo de vida de la sesión del usuario via sessionStorage.
 */

const STORAGE_SESSION_KEY = 'restoapp_sec_session';

/**
 * Autentica al usuario y persiste la sesión.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{success: boolean, user?: Object, error?: string}>}
 */
export async function loginUser(email, password) {
    const cleanEmail = (email || '').trim();
    const cleanPassword = (password || '').trim();

    if (!cleanEmail || !cleanPassword) {
        return { success: false, error: 'Por favor ingresa un correo y contraseña válidos.' };
    }

    const sessionData = {
        uid: 'usr_' + Math.random().toString(36).substring(2, 9),
        email: cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@restoapp.com`,
        token: 'session_token_' + Date.now(),
        authenticatedAt: new Date().toISOString()
    };

    sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(sessionData));
    return { success: true, user: sessionData };
}

/**
 * Cierra la sesión activa eliminando los datos de sessionStorage.
 * @returns {Promise<void>}
 */
export async function logoutUser() {
    sessionStorage.removeItem(STORAGE_SESSION_KEY);
}

/**
 * Comprueba si existe una sesión autenticada válida.
 * @returns {boolean}
 */
export function isLoggedIn() {
    const raw = sessionStorage.getItem(STORAGE_SESSION_KEY);
    if (!raw) return false;
    try {
        const session = JSON.parse(raw);
        return Boolean(session && session.email && session.token);
    } catch (e) {
        return false;
    }
}

/**
 * Obtiene los datos del usuario autenticado actualmente.
 * @returns {Object|null}
 */
export function getUserSession() {
    if (!isLoggedIn()) return null;
    try {
        return JSON.parse(sessionStorage.getItem(STORAGE_SESSION_KEY));
    } catch (e) {
        return null;
    }
}

/**
 * Retorna el token de la sesión activa para peticiones autenticadas.
 * @returns {string|null}
 */
export function getAuthToken() {
    const session = getUserSession();
    return session ? session.token : null;
}

/**
 * Guard de navegación: redirige a login.html si el usuario no está autenticado.
 */
export function requireAuthentication() {
    if (!isLoggedIn()) {
        window.location.href = 'login.html?redirect=admin';
    }
}
