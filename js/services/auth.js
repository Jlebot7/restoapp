/**
 * RestoApp - Authentication Service
 * Manages user session state via sessionStorage
 */

const SESSION_KEY = 'restoapp_auth_session';

// Credenciales para la demostración del taller
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin'
};

/**
 * Validates user credentials and initializes a session.
 * @param {string} username 
 * @param {string} password 
 * @returns {boolean} True if login successful
 */
export function login(username, password) {
    const cleanUser = (username || '').trim();
    const cleanPass = (password || '').trim();

    if (cleanUser === ADMIN_CREDENTIALS.username && cleanPass === ADMIN_CREDENTIALS.password) {
        const sessionData = {
            username: cleanUser,
            role: 'Administrator',
            loginTime: new Date().toISOString()
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        return true;
    }
    return false;
}

/**
 * Ends the active session.
 */
export function logout() {
    sessionStorage.removeItem(SESSION_KEY);
}

/**
 * Checks whether a valid session exists.
 * @returns {boolean}
 */
export function isAuthenticated() {
    const rawSession = sessionStorage.getItem(SESSION_KEY);
    if (!rawSession) return false;
    try {
        const session = JSON.parse(rawSession);
        return Boolean(session && session.username);
    } catch (e) {
        return false;
    }
}

/**
 * Gets active session data or null.
 * @returns {Object|null}
 */
export function getCurrentUser() {
    if (!isAuthenticated()) return null;
    try {
        return JSON.parse(sessionStorage.getItem(SESSION_KEY));
    } catch (e) {
        return null;
    }
}

/**
 * Guard function for protected pages (e.g. admin.html).
 * Redirects to login.html if not authenticated.
 */
export function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html?redirect=admin';
    }
}
