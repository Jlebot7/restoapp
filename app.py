"""
RestoApp - Motor de Procesamiento y Reglas de Negocio con PocketFlow
Orquestador de validaciones, cálculo impositivo (IVA 19%) y auditoría Planner-Critic.
"""

from datetime import datetime
import uuid
from pocketflow import Node, Flow

# =====================================================================
# 1. DEFINICIÓN DE NODOS DE PROCESO (PocketFlow)
# =====================================================================

class StockNode(Node):
    """
    Nodo 1: Validación de Inventario y Límites Operativos.
    Verifica que el plato seleccionado exista y la cantidad solicitada sea válida.
    """
    def prep(self, shared: dict):
        return shared.get("order", {})

    def exec(self, order: dict):
        item_id = order.get("item_id")
        dish_name = order.get("dish_name", "Plato")
        qty = order.get("qty", 0)

        # Validación de cantidad
        if qty <= 0:
            return {"status": "error", "reason": "La cantidad solicitada debe ser mayor a 0."}
        if qty > 50:
            return {"status": "out_of_stock", "reason": f"Stock insuficiente para {qty} unidades de '{dish_name}' (Máximo 50 por pedido)."}
        
        return {
            "status": "available",
            "item_id": item_id,
            "dish_name": dish_name,
            "qty": qty,
            "max_stock": 50
        }

    def post(self, shared: dict, prep_res, exec_res: dict):
        if exec_res.get("status") == "available":
            shared["validation_results"]["stock"] = {
                "status": "OK",
                "message": f"Stock verificado ({exec_res['qty']} unidades confirmadas)",
                "timestamp": datetime.now().isoformat()
            }
            return "default"  # Avanza a TaxAndPricingNode
        else:
            reason = exec_res.get("reason", "Error de inventario no especificado")
            shared["error_log"] = reason
            shared["validation_results"]["stock"] = {
                "status": "FAILED",
                "reason": reason
            }
            return "fail"  # Detiene el flujo por fallo


class TaxAndPricingNode(Node):
    """
    Nodo 2: Cálculo Financiero e Impuestos.
    Calcula subtotal, tasa de IVA (19% Colombia) y total a pagar con redondeo estricto.
    """
    TAX_RATE = 0.19  # 19% IVA estándar Colombia

    def prep(self, shared: dict):
        return shared.get("order", {})

    def exec(self, order: dict):
        qty = int(order.get("qty", 1))
        unit_price = float(order.get("unit_price", 0.0))

        subtotal = round(qty * unit_price, 2)
        tax = round(subtotal * self.TAX_RATE, 2)
        total = round(subtotal + tax, 2)

        return {
            "unit_price": unit_price,
            "qty": qty,
            "subtotal": subtotal,
            "tax_rate": self.TAX_RATE,
            "tax_rate_percent": "19%",
            "tax": tax,
            "total": total
        }

    def post(self, shared: dict, prep_res, exec_res: dict):
        shared["billing"] = exec_res
        shared["validation_results"]["pricing"] = {
            "status": "OK",
            "message": f"Subtotal: ${exec_res['subtotal']:,.2f} + IVA (19%): ${exec_res['tax']:,.2f} = Total: ${exec_res['total']:,.2f}",
            "timestamp": datetime.now().isoformat()
        }
        return "default"  # Avanza a AuditCriticNode


class AuditCriticNode(Node):
    """
    Nodo 3: Critic de Integridad y Validación de Negocio (Patrón Planner-Critic).
    Audita que los cálculos financieros no contengan valores anómalos o fraudes.
    """
    MAX_ORDER_TOTAL = 10_000_000.0  # Límite de seguridad: $10.000.000 COP

    def prep(self, shared: dict):
        return {
            "order": shared.get("order", {}),
            "billing": shared.get("billing", {})
        }

    def exec(self, data: dict):
        billing = data.get("billing", {})
        total = billing.get("total", 0.0)
        subtotal = billing.get("subtotal", 0.0)
        unit_price = billing.get("unit_price", 0.0)

        # Reglas de auditoría
        if unit_price <= 0:
            return {"status": "rejected", "reason": "Precio unitario debe ser mayor a $0."}
        if total <= 0:
            return {"status": "rejected", "reason": "El total a cobrar es nulo o negativo."}
        if total > self.MAX_ORDER_TOTAL:
            return {"status": "rejected", "reason": f"El valor de la comanda (${total:,.2f}) excede el límite de seguridad ($10,000,000 COP)."}
        if subtotal < unit_price:
            return {"status": "rejected", "reason": "Inconsistencia financiera en el cálculo del subtotal."}

        return {"status": "approved", "audit_code": "CRITIC-PASS-200"}

    def post(self, shared: dict, prep_res, exec_res: dict):
        if exec_res.get("status") == "approved":
            shared["is_valid"] = True
            shared["validation_results"]["audit"] = {
                "status": "APPROVED",
                "audit_code": exec_res.get("audit_code"),
                "message": "Auditoría Planner-Critic completada con éxito.",
                "timestamp": datetime.now().isoformat()
            }
            return "default"  # Continúa a OrderSummaryNode
        else:
            reason = exec_res.get("reason", "Auditoría rechazada por inconsistencia.")
            shared["is_valid"] = False
            shared["error_log"] = reason
            shared["validation_results"]["audit"] = {
                "status": "REJECTED",
                "reason": reason
            }
            return "rejected"


class OrderSummaryNode(Node):
    """
    Nodo 4: Cierre y Empaquetado Final de la Comanda.
    Genera el ID de transacción único y empaqueta el resumen.
    """
    def prep(self, shared: dict):
        return shared

    def exec(self, shared_data: dict):
        order = shared_data.get("order", {})
        billing = shared_data.get("billing", {})
        order_id = f"ORD-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6].upper()}"

        return {
            "order_id": order_id,
            "processed_at": datetime.now().isoformat(),
            "dish_name": order.get("dish_name", "Plato"),
            "item_id": order.get("item_id"),
            "quantity": billing.get("qty", 1),
            "unit_price": billing.get("unit_price", 0.0),
            "subtotal": billing.get("subtotal", 0.0),
            "tax": billing.get("tax", 0.0),
            "tax_rate": "19%",
            "total": billing.get("total", 0.0),
            "flow_engine": "PocketFlow v0.0.3",
            "pipeline_steps": [
                {"node": "StockNode", "name": "Validación de Stock", "status": "OK"},
                {"node": "TaxAndPricingNode", "name": "Cálculo IVA (19%) & Subtotal", "status": "OK"},
                {"node": "AuditCriticNode", "name": "Auditoría Planner-Critic", "status": "APPROVED"},
                {"node": "OrderSummaryNode", "name": "Empaquetado de Comanda", "status": "COMPLETED"}
            ]
        }

    def post(self, shared: dict, prep_res, exec_res: dict):
        shared["summary"] = exec_res
        return "completed"


# =====================================================================
# 2. CONSTRUCCIÓN DE LA TOPOLOGÍA DEL GRAFO (PocketFlow Graph)
# =====================================================================

stock_node = StockNode()
tax_node = TaxAndPricingNode()
audit_node = AuditCriticNode()
summary_node = OrderSummaryNode()

# Conexión secuencial del camino principal
stock_node >> tax_node >> audit_node >> summary_node

# Manejo explícito de ramas de error
stock_node - "fail" >> None
audit_node - "rejected" >> None

# Creación de la instancia Flow
resto_order_flow = Flow(start=stock_node)


# =====================================================================
# 3. INTERFAZ DE EJECUCIÓN (Shared Store Handler)
# =====================================================================

def process_order_flow(order_data: dict) -> dict:
    """
    Ejecuta el pipeline completo de PocketFlow para procesar un pedido.
    
    :param order_data: dict con item_id, dish_name, qty, unit_price
    :return: dict con el estado final del Shared Store
    """
    shared_store = {
        "order": {
            "item_id": str(order_data.get("item_id", "")),
            "dish_name": str(order_data.get("dish_name", "Plato")),
            "qty": int(order_data.get("qty", 1)),
            "unit_price": float(order_data.get("unit_price", 0.0))
        },
        "validation_results": {},
        "billing": {},
        "summary": {},
        "is_valid": False,
        "error_log": ""
    }

    # Ejecución del Grafo
    resto_order_flow.run(shared=shared_store)
    return shared_store


if __name__ == "__main__":
    print("==================================================")
    print(" Probando Motor PocketFlow - RestoApp Pipeline")
    print("==================================================")
    test_order = {
        "item_id": "-Nz1234abcd",
        "dish_name": "Bandeja Paisa Gourmet",
        "qty": 2,
        "unit_price": 35000.0
    }
    result = process_order_flow(test_order)
    print(f"Pedido Valido?: {result['is_valid']}")
    if result["is_valid"]:
        print(f"ID Comanda: {result['summary']['order_id']}")
        print(f"Total: ${result['summary']['total']:,.2f}")
        print("Validaciones realizadas:", result["validation_results"])
    else:
        print(f"Error: {result['error_log']}")
