/**
 * RestoApp - Page Controller: Login (login.html)
 * Autenticación segura sin credenciales expuestas en cliente.
 */

import { initLayout, showToast } from '../ui.js';
import { loginUser, isLoggedIn } from '../auth.js';

document.addEventListener('DOMContentLoaded', () => {
    initLayout('login');

    if (isLoggedIn()) {
        window.location.href = 'admin.html';
        return;
    }

    const loginForm = document.getElementById('login-form');
    const authErrorMsg = document.getElementById('auth-error-msg');
    const loginBtn = document.getElementById('btn-login');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');

        const email = usernameInput.value;
        const pass = passwordInput.value;

        if (!email || !pass) {
            authErrorMsg.textContent = 'Por favor ingresa tu correo/usuario y contraseña.';
            authErrorMsg.style.display = 'block';
            return;
        }

        try {
            loginBtn.disabled = true;
            loginBtn.textContent = 'Verificando credenciales...';
            authErrorMsg.style.display = 'none';

            const result = await loginUser(email, pass);

            if (result.success) {
                showToast('¡Autenticado con éxito!', 'success');
                
                const urlParams = new URLSearchParams(window.location.search);
                const redirect = urlParams.get('redirect') || 'admin';
                
                setTimeout(() => {
                    window.location.href = `${redirect}.html`;
                }, 600);
            } else {
                authErrorMsg.textContent = result.error || 'Credenciales inválidas.';
                authErrorMsg.style.display = 'block';
                showToast(result.error || 'Error al iniciar sesión.', 'error');
            }
        } catch (err) {
            authErrorMsg.textContent = 'Error imprevisto durante la autenticación.';
            authErrorMsg.style.display = 'block';
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Ingresar al Sistema';
        }
    });
});
