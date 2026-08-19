"""
RestoApp - Suite Exhaustiva de Pruebas de Integridad: PocketFlow Engine & REST API
Cubre: Happy path, límites de stock, Planner-Critic, resiliencia ante datos malformados y API REST.
"""

import unittest
from app import process_order_flow, resto_order_flow, StockNode, TaxAndPricingNode, AuditCriticNode, OrderSummaryNode
from fastapi.testclient import TestClient
from api import app


class TestPocketFlowEngineIntegrity(unittest.TestCase):
    """Pruebas de integridad del motor PocketFlow y los nodos del grafo."""

    def test_happy_path_standard_order(self):
        """Caso 1: Pedido estándar con cálculo exacto de IVA (19%)."""
        order = {
            "item_id": "dish-101",
            "dish_name": "Ajiaco Santafereño",
            "qty": 2,
            "unit_price": 30000.0
        }
        result = process_order_flow(order)
        
        self.assertTrue(result["is_valid"], "El pedido válido debe ser aprobado.")
        self.assertEqual(result["error_log"], "")
        
        # Subtotal: 60,000 | IVA (19%): 11,400 | Total: 71,400
        billing = result["billing"]
        self.assertEqual(billing["subtotal"], 60000.0)
        self.assertEqual(billing["tax"], 11400.0)
        self.assertEqual(billing["total"], 71400.0)
        
        # Validación de traza del grafo
        self.assertEqual(result["validation_results"]["stock"]["status"], "OK")
        self.assertEqual(result["validation_results"]["pricing"]["status"], "OK")
        self.assertEqual(result["validation_results"]["audit"]["status"], "APPROVED")

        # Estructura del resumen empaquetado
        summary = result["summary"]
        self.assertTrue(summary["order_id"].startswith("ORD-"))
        self.assertEqual(len(summary["pipeline_steps"]), 4)

    def test_happy_path_single_unit_cents(self):
        """Caso 2: Pedido de 1 unidad con centavos para verificar precisión de redondeo."""
        order = {
            "item_id": "dish-102",
            "dish_name": "Café Especial Colombiano",
            "qty": 1,
            "unit_price": 5450.50
        }
        result = process_order_flow(order)
        self.assertTrue(result["is_valid"])
        # Subtotal: 5450.50 | IVA (19%): 1035.60 | Total: 6486.10
        self.assertEqual(result["billing"]["subtotal"], 5450.50)
        self.assertEqual(result["billing"]["tax"], 1035.60)
        self.assertEqual(result["billing"]["total"], 6486.10)

    def test_stock_node_zero_quantity(self):
        """Caso 3: Rechazo inmediato por cantidad = 0."""
        order = {"item_id": "d-1", "dish_name": "Empanada", "qty": 0, "unit_price": 3000.0}
        result = process_order_flow(order)
        self.assertFalse(result["is_valid"])
        self.assertIn("mayor a 0", result["error_log"])
        self.assertEqual(result["validation_results"]["stock"]["status"], "FAILED")

    def test_stock_node_negative_quantity(self):
        """Caso 4: Rechazo por cantidad negativa."""
        order = {"item_id": "d-2", "dish_name": "Jugo Natural", "qty": -5, "unit_price": 6000.0}
        result = process_order_flow(order)
        self.assertFalse(result["is_valid"])
        self.assertIn("mayor a 0", result["error_log"])

    def test_stock_node_exceeds_max_capacity(self):
        """Caso 5: Rechazo por superar límite de stock operativo (máximo 50 unidades)."""
        order = {"item_id": "d-3", "dish_name": "Bandeja Paisa", "qty": 51, "unit_price": 35000.0}
        result = process_order_flow(order)
        self.assertFalse(result["is_valid"])
        self.assertIn("Stock insuficiente", result["error_log"])
        self.assertIn("Máximo 50", result["error_log"])
        self.assertEqual(result.get("summary"), {})

    def test_audit_critic_zero_unit_price(self):
        """Caso 6: Rechazo en AuditCriticNode por precio unitario = $0."""
        order = {"item_id": "d-4", "dish_name": "Plato Gratis Malicioso", "qty": 2, "unit_price": 0.0}
        result = process_order_flow(order)
        self.assertFalse(result["is_valid"])
        self.assertEqual(result["validation_results"]["audit"]["status"], "REJECTED")
        self.assertIn("Precio unitario debe ser mayor a $0", result["error_log"])

    def test_audit_critic_negative_unit_price(self):
        """Caso 7: Rechazo en AuditCriticNode por precio unitario negativo."""
        order = {"item_id": "d-5", "dish_name": "Inyección Negativa", "qty": 2, "unit_price": -20000.0}
        result = process_order_flow(order)
        self.assertFalse(result["is_valid"])
        self.assertEqual(result["validation_results"]["audit"]["status"], "REJECTED")

    def test_audit_critic_anti_fraud_max_limit(self):
        """Caso 8: Rechazo por regla antifraude al superar $10,000,000 COP."""
        order = {"item_id": "d-6", "dish_name": "Vino Premium Gran Reserva", "qty": 40, "unit_price": 300000.0}
        result = process_order_flow(order)
        self.assertFalse(result["is_valid"])
        self.assertIn("excede el límite de seguridad", result["error_log"])
        self.assertEqual(result["validation_results"]["audit"]["status"], "REJECTED")


class TestFastAPIRoutesIntegrity(unittest.TestCase):
    """Pruebas de endpoints, esquemas y códigos de estado HTTP de la API."""

    def setUp(self):
        self.client = TestClient(app)

    def test_root_endpoint(self):
        """Caso 9: Endpoint raíz con catálogo de endpoints."""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "online")
        self.assertIn("health", data["endpoints"])

    def test_health_check(self):
        """Caso 10: Health check reporta 4 nodos activos en el pipeline."""
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(len(data["nodes"]), 4)

    def test_pipeline_metadata(self):
        """Caso 11: Inspección de arquitectura y metadatos de los nodos."""
        response = self.client.get("/api/pedidos/pipeline")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["engine"], "PocketFlow v0.0.3")
        self.assertTrue(any(n["name"] == "AuditCriticNode" for n in data["nodes"]))

    def test_process_order_endpoint_success(self):
        """Caso 12: POST /api/pedidos/procesar con payload válido."""
        payload = {
            "item_id": "dish-77",
            "dish_name": "Sobrebarriga en Salsa",
            "qty": 3,
            "unit_price": 28000.0
        }
        response = self.client.post("/api/pedidos/procesar", json=payload)
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["success"])
        self.assertTrue(body["is_valid"])
        self.assertIsNone(body["error_log"])
        self.assertEqual(body["billing"]["subtotal"], 84000.0)
        self.assertEqual(body["billing"]["total"], 99960.0)

    def test_process_order_endpoint_business_rejection(self):
        """Caso 13: POST /api/pedidos/procesar con cantidad > 50 debe responder 200 con success=false y razón clara."""
        payload = {
            "item_id": "dish-77",
            "dish_name": "Sobrebarriga en Salsa",
            "qty": 55,
            "unit_price": 28000.0
        }
        response = self.client.post("/api/pedidos/procesar", json=payload)
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertFalse(body["success"])
        self.assertFalse(body["is_valid"])
        self.assertIn("Stock insuficiente", body["error_log"])

    def test_process_order_schema_validation_error(self):
        """Caso 14: POST /api/pedidos/procesar con tipos incorrectos debe responder 422 Unprocessable Entity."""
        payload = {
            "item_id": "dish-77",
            "dish_name": "Sobrebarriga",
            "qty": "cantidad_no_numerica",  # Tipo inválido
            "unit_price": 28000.0
        }
        response = self.client.post("/api/pedidos/procesar", json=payload)
        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
