# RestoApp - Registro de Refactorización (CHANGELOG)

Este documento detalla la transformación completa de **RestoApp** desde una arquitectura monolítica legacy (en un solo archivo `index.html`) hacia una **Multi-Page Application (MPA)** modularizada aplicando buenas prácticas de desarrollo de software.

---

## 🚀 Resumen de Cambios Principales

### 1. Conversión a Multi-Page Application (MPA)
- **Antes:** Un único archivo `index.html` que agrupaba formulario de pedido, autenticación, creación de productos y scripts incrustados.
- **Ahora:** Vista dividida en páginas HTML semánticas e independientes:
  - [`index.html`](index.html): Dashboard principal y portal de navegación del restaurante.
  - [`pedido.html`](pedido.html): Módulo dedicado para la toma de comandas por parte de meseros.
  - [`login.html`](login.html): Pantalla de autenticación desacoplada con manejo de sesión.
  - [`admin.html`](admin.html): Panel de administración protegido para agregar y listar productos del menú.

### 2. Sistema de Diseño Unificado y CSS (`css/styles.css`)
- **Antes:** Estilos incrustados en la etiqueta `<style>` con clases redundantes (`.clase_redundante_que_no_se_usa`) e IDs directos.
- **Ahora:** Archivo unificado [`css/styles.css`](css/styles.css) utilizando variables CSS (custom properties), fuentes modernas de Google Fonts (*Inter*), tarjetas responsivas, tablas estilizadas, estados hover/active claros y un sistema de notificaciones flotantes (Toasts).

### 3. Modularización de JavaScript por Responsabilidad (ES Modules)
- **Antes:** Variables globales mutables (`var items = []`, `var total_global = 0`, `var menuData = {}`, `var isLogged = false`), manejadores inline (`onclick="tomarTodo()"`), nombres crípticos (`a`, `b`, `p`) y funciones obsoletas (`funcionObsoletaCalculoAnterior`).
- **Ahora:** Estructura limpia basada exclusivamente en **Módulos ES** (`type="module"`) organizados por responsabilidad (Ejercicio 2 del taller):
  - [`js/menu.js`](js/menu.js): Carga, normalización, creación y caché privado de productos del menú en Firebase Realtime DB.
  - [`js/auth.js`](js/auth.js): Manejo de autenticación, sesión tokenizada (`sessionStorage`) y guardias de protección de ruta (`requireAuthentication()`).
  - [`js/pedidos.js`](js/pedidos.js): Lógica financiera pura (cálculo de subtotal, IVA 19%, total y formateo de moneda COP) desacoplada del DOM.
  - [`js/ui.js`](js/ui.js): Componentes de interfaz reutilizables, encabezado/navegación dinámico y notificaciones flotantes (Toasts).
  - [`js/pages/`](js/pages/): Controladores de entrada específicos por cada vista MPA (`index.js`, `pedido.js`, `login.js`, `admin.js`).

### 4. Mejora de Autenticación, Seguridad y Plantillas Firebase (Ejercicio 3)
- **Antes:** Credenciales administrativas hardcodeadas expuestas directamente en el código fuente JavaScript del cliente (`var ADMIN_USER = 'admin'`, `var ADMIN_PASS = 'admin'`), y la base de datos de Firebase permitía escrituras públicas sin autenticar.
- **Ahora:**
  - **Eliminación de Credenciales en Cliente:** Se removieron por completo todas las contraseñas y usuarios del código fuente JavaScript del cliente.
  - **Estructura Desplegada & Comentada (Plantilla Firebase Auth):**
    - Se dejó la infraestructura lista en [`js/auth.js`](js/auth.js) con los bloques comentados (`/* TODO: Ejercicio 3 ... */`) utilizando Firebase Auth SDK (`signInWithEmailAndPassword`, `getIdToken`), permitiendo que los estudiantes o desarrolladores completen sus claves reales al final del taller.
    - Se mantuvo una autenticación simulada funcional en entorno local sin credenciales quemadas.
  - **Reglas de Seguridad en Realtime Database ([`database.rules.json`](database.rules.json)):**
    - Lectura pública en menú (`".read": true`) para carga de platos por meseros.
    - Escritura restringida a solicitudes autenticadas con token (`".write": "auth != null"`).
    - Validación de esquema en servidor: Exige que cada nuevo plato contenga `name` (string) y `price` (numérico > 0).
  - **Integración con Realtime DB:** Se dejaron listos en [`js/menu.js`](js/menu.js) los comentarios `TODO` para adjuntar el parámetro `?auth=TOKEN` al desplegar las reglas de seguridad.

### 5. Limpieza de Código y Pruebas Unitarias Automatizadas (Ejercicio 4)
- **Antes:** Presencia de código muerto en el HTML original (`funcionObsoletaCalculoAnterior`), selectores CSS obsoletos (`.clase_redundante_que_no_se_usa`), validaciones débiles sin control de tipos o rangos, y falta de pruebas automatizadas.
- **Ahora:**
  - **Depuración Completa de Código Muerto:** Eliminación de funciones en desuso y limpieza de estilos redundantes.
  - **Validaciones Estrictas & Sanitización:**
    - Verificación estricta en [`js/pedidos.js`](js/pedidos.js) para cantidades (deben ser enteros positivos > 0 y <= 1.000).
    - Validación de precios (deben ser números mayores a $0 COP y dentro de límites razonables).
    - Sanitización de cadenas (`sanitizeString`) para prevenir ataques de inyección de código (XSS).
    - Mensajes de error amigables, claros y específicos dirigidos al usuario mediante componentes Toast.
  - **Suite de Pruebas Unitarias ([`tests/pedidos.test.js`](tests/pedidos.test.js)):**
    - Pruebas automatizadas zero-dependencies que ejecutan aserciones sobre cálculos de subtotal, IVA 19%, totales redondeados, rechazo de números negativos, decimales en cantidades y formateo de divisa.
  - **Ejecutor Web Interactivo ([`tests/run-tests.html`](tests/run-tests.html)):**
    - Interfaz gráfica para ejecutar la suite de pruebas desde cualquier navegador web y visualizar resultados en tiempo real.

### 6. Aplicación de Buenas Prácticas y Desacoplamiento Lógica-DOM (Ejercicio 5)
- **Desacoplamiento Estricto:**
  - Los módulos [`js/pedidos.js`](js/pedidos.js), [`js/menu.js`](js/menu.js) y [`js/auth.js`](js/auth.js) son 100% independientes del DOM. Reciben valores primitivos/objetos y retornan datos calculados o respuestas de API sin invocar `document.getElementById` ni modificar elementos HTML.
  - La manipulación del DOM y captura de eventos se encuentra contenida exclusivamente en los controladores de página ([`js/pages/`](js/pages/)).
- **Manejo de Errores Robusto:**
  - Control de timeouts en llamadas de red HTTP a Firebase mediante `AbortController` (8 segundos).
  - Bloqueo y deshabilitación visual de botones durante peticiones asíncronas para evitar doble envío (`disabled = true`).
  - Captura y reporte claro de errores de red, permisos de Firebase (401/403) o datos de entrada erróneos.
- **Feedback al Usuario Continuo:**
  - Notificaciones flotantes (Toasts) informativas para estados de éxito, advertencia y error.
  - Indicadores de carga dentro de selecciones y tablas mientras se sincronizan los datos con el servidor.

---

## 🛠️ Malas Prácticas Corregidas

| Mala Práctica Legacy | Solución Implementada | Archivos Involucrados |
| :--- | :--- | :--- |
| **Variables Globales Mutables** (`window.menuData`, etc.) | Encapsulamiento en estado local privado de Módulos ES (`export`/`import`) | `js/menu.js`, `js/auth.js`, `js/pedidos.js` |
| **Credenciales hardcodeadas en JS** (`var ADMIN_PASS = 'admin'`) | Eliminación de credenciales del cliente + plantilla estructurada de Firebase Auth | `js/auth.js`, `login.html` |
| **Escritura pública no protegida en Firebase** | Archivo `database.rules.json` con `.write: "auth != null"` + bloques para enviar `?auth=TOKEN` | `database.rules.json`, `js/menu.js` |
| **Código Muerto (`funcionObsoletaCalculoAnterior`)** | Eliminación de código no utilizado y funciones en desuso | `index.html` refactorizado |
| **Validaciones laxas / Conversión débil (`Number(b)`)** | Validaciones numéricas strictly typed con `Number.isInteger()`, rangos de seguridad y sanitización | `js/pedidos.js` |
| **Falta de Pruebas Automatizadas** | Creación de suite de pruebas unitarias y ejecutor web interactivo | `tests/pedidos.test.js`, `tests/run-tests.html` |
| **Nombres crípticos (`a`, `b`, `p`)** | Identificadores descriptivos (`dishSelect`, `quantity`, `unitPrice`, `calculateOrderDetails`) | `js/pedidos.js`, `js/pages/pedido.js` |
| **Acoplamiento Lógica-DOM** | Separación estricta entre funciones puras de cálculo (`js/pedidos.js`, `js/menu.js`) y controladores de vista (`js/pages/`) | `js/pedidos.js`, `js/menu.js` |
| **Manejo Frágil de Peticiones** | Controladores con `AbortController` (timeout 8s), estados de carga (`disabled = true`) y capturas `try-catch` | `js/menu.js`, `js/pages/admin.js` |
| **Alertas emergentes intrusivas (`alert()`)** | Notificaciones Toast no bloqueantes y accesibles | `js/ui.js` |
| **Falta de accesibilidad y SEO** | Etiquetas semánticas HTML5 (`header`, `main`, `section`, `article`, `nav`, `footer`), títulos y meta tags | Todos los archivos `.html` |

---

## 🧪 Instrucciones de Verificación

1. Abrir `index.html` en el navegador y hacer clic en **Ejecutar Pruebas** (o abrir [`tests/run-tests.html`](tests/run-tests.html)).
2. Confirmar que la suite de pruebas unitarias ejecute todas las verificaciones y marque **✅ TODAS EXITOSAS**.
3. Navegar a **Mesero (Pedidos)** (`pedido.html`):
   - Verificar la separación de responsabilidades entre los módulos `pedidos.js` y `pedido.js`.
   - Probar casos de borde en el formulario para validar las notificaciones Toast de feedback al usuario.
4. Navegar a **Administración** (`admin.html`):
   - Al crear un producto, verificar el estado del botón (**Guardando...** / `disabled`) y el manejo de errores ante posibles problemas de red.
