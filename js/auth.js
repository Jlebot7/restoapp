/**
 * RestoApp - Módulo de Autenticación & Seguridad (js/auth.js)
 * 
 * 📌 TALLER DE REFACTORIZACIÓN - EJERCICIO 3:
 * En este módulo se eliminan las credenciales quemadas del cliente y se estructura
 * la integración con Firebase Auth. Se dejan los bloques comentados y marcados con TODO
 * para completarlos con las credenciales finales de la consola de Firebase.
 */

// ============================================================================
// TODO: EJERCICIO 3 - CONFIGURACIÓN DE FIREBASE AUTH
// Descomentar e importar SDK oficial de Firebase cuando se configuren las claves reales.
// ============================================================================
/*
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

const firebaseConfig = {
    apiKey: "TU_API_KEY_DE_FIREBASE_CONSOLE",
    authDomain: "tu-proyecto.firebaseapp.com",
    databaseURL: "https://tu-proyecto-default-rtdb.firebaseio.com",
    projectId: "tu-proyecto",
    storageBucket: "tu-proyecto.appspot.com"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
*/

const STORAGE_SESSION_KEY = 'restoapp_sec_session';

/**
 * Autentica al usuario de forma segura.
 * 
 * TODO: Para conectar Firebase Auth real al final del taller:
 * 1. Descomentar el bloque try {...} con signInWithEmailAndPassword(auth, email, password)
 * 2. Obtener el ID Token del usuario autenticado: await user.getIdToken()
 * 
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

    // ========================================================================
    // BLOQUE PARA COMPLETAR CON FIREBASE AUTH REAL AL FINAL DEL TALLER:
    // ========================================================================
    /*
    try {
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        const user = userCredential.user;
        const token = await user.getIdToken();

        const sessionData = {
            uid: user.uid,
            email: user.email,
            token: token,
            authenticatedAt: new Date().toISOString()
        };

        sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(sessionData));
        return { success: true, user: sessionData };
    } catch (error) {
        console.error('[Firebase Auth Error]:', error);
        return { success: false, error: 'Error de autenticación en Firebase: ' + error.message };
    }
    */

    // Modo de desarrollo/taller activo (Sin credenciales quemadas en cliente)
    // Simula una autenticación tokenizada segura mientras se agregan las claves finales de Firebase
    const sessionData = {
        uid: 'usr_' + Math.random().toString(36).substring(2, 9),
        email: cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@restoapp.com`,
        token: 'firebase_token_taller_' + Date.now(),
        authenticatedAt: new Date().toISOString()
    };

    sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(sessionData));
    return { success: true, user: sessionData };
}

/**
 * Cierra la sesión activa.
 * 
 * TODO (Al finalizar): Descomentar await signOut(auth);
 * @returns {Promise<void>}
 */
export async function logoutUser() {
    /*
    if (auth) {
        try {
            await signOut(auth);
        } catch (e) {}
    }
    */
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
 * Retorna el token de autenticación para ser enviado en peticiones a Firebase Realtime DB (?auth=TOKEN).
 * @returns {string|null}
 */
export function getAuthToken() {
    const session = getUserSession();
    return session ? session.token : null;
}

/**
 * Guard de navegación: Redirige a login.html si el usuario no está autenticado.
 */
export function requireAuthentication() {
    if (!isLoggedIn()) {
        window.location.href = 'login.html?redirect=admin';
    }
}
