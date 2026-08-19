"""
RestoApp - Verificador Global de Integridad y Diagnóstico del Sistema
Ejecuta la suite completa de pruebas de backend, validaciones de sintaxis y estado de módulos.
"""

import sys
import os
import py_compile
import unittest

# Asegurar que el directorio raíz esté en sys.path para importaciones
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if base_dir not in sys.path:
    sys.path.insert(0, base_dir)

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

def run_diagnostics():
    print("================================================================")
    print(" [*] RESTOAPP - DIAGNOSTICO INTEGRAL DE INTEGRIDAD DEL SISTEMA")
    print("================================================================\n")

    # 1. Verificación de Compilación de Archivos Python
    print("[+] [Paso 1/3] Verificando sintaxis de archivos Python...")
    py_files = ["app.py", "api.py", "tests/test_pocketflow_flow.py"]
    for file in py_files:
        full_path = os.path.join(base_dir, file)
        try:
            py_compile.compile(full_path, doraise=True)
            print(f"  [OK] {file}: Sintaxis Python valida.")
        except Exception as e:
            print(f"  [FAIL] {file}: Error de sintaxis: {e}")
            return False

    # 2. Verificación de existencia de archivos esenciales del frontend
    print("\n[+] [Paso 2/3] Verificando integridad de archivos frontend...")
    frontend_files = [
        "index.html", "pedido.html", "login.html", "admin.html",
        "css/styles.css", "js/ui.js", "js/menu.js", "js/auth.js",
        "js/pedidos.js", "js/pocketflow-client.js",
        "js/pages/pedido.js", "tests/run-tests.html"
    ]
    for file in frontend_files:
        full_path = os.path.join(base_dir, file)
        if os.path.exists(full_path):
            print(f"  [OK] {file}: Presente.")
        else:
            print(f"  [FAIL] {file}: Falta archivo esencial.")
            return False

    # 3. Ejecución de la Suite de Pruebas Automatizadas (PocketFlow & API)
    print("\n[+] [Paso 3/3] Ejecutando suite de pruebas unitarias (PocketFlow + FastAPI)...")
    loader = unittest.TestLoader()
    suite = loader.discover(start_dir=os.path.join(base_dir, "tests"), pattern="test_*.py", top_level_dir=base_dir)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    print("\n================================================================")
    if result.wasSuccessful():
        print(f"[EXITO] {result.testsRun} pruebas unitarias ejecutadas sin errores.")
        print("[OK] La integridad del sistema RestoApp esta 100% verificada.")
        print("================================================================")
        return True
    else:
        print(f"[FALLO] Se detectaron {len(result.failures)} fallos y {len(result.errors)} errores.")
        print("================================================================")
        return False

if __name__ == "__main__":
    success = run_diagnostics()
    sys.exit(0 if success else 1)
