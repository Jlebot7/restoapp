"""
RestoApp - API REST con FastAPI y Motor de Orquestación PocketFlow
Servicio backend para procesamiento de comandas, validaciones y auditoría de pedidos.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from app import process_order_flow

app = FastAPI(
    title="RestoApp PocketFlow Engine API",
    description="Motor de orquestación de reglas de negocio y procesamiento de comandas para RestoApp.",
    version="1.0.0"
)

# Habilitar CORS para permitir peticiones desde cualquier origen local (ej. servidor web, archivos locales)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class OrderRequest(BaseModel):
    item_id: str = Field(..., description="ID del plato en el menú", example="-Nz1234abcd")
    dish_name: Optional[str] = Field("Plato Seleccionado", description="Nombre del plato", example="Bandeja Paisa Gourmet")
    qty: int = Field(..., gt=0, le=100, description="Cantidad de platos", example=2)
    unit_price: float = Field(..., gt=0, description="Precio unitario en COP", example=35000.0)


class OrderResponse(BaseModel):
    success: bool
    is_valid: bool
    error_log: Optional[str] = None
    validation_results: Dict[str, Any]
    billing: Dict[str, Any]
    summary: Optional[Dict[str, Any]] = None
    engine: str = "PocketFlow v0.0.3"


@app.get("/")
def root():
    return {
        "app": "RestoApp PocketFlow Engine API",
        "status": "online",
        "endpoints": {
            "health": "/api/health",
            "process_order": "/api/pedidos/procesar",
            "pipeline_info": "/api/pedidos/pipeline",
            "docs": "/docs"
        }
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "engine": "PocketFlow v0.0.3",
        "pipeline_active": True,
        "nodes": ["StockNode", "TaxAndPricingNode", "AuditCriticNode", "OrderSummaryNode"]
    }


@app.get("/api/pedidos/pipeline")
def get_pipeline_info():
    return {
        "engine": "PocketFlow v0.0.3",
        "pattern": "Declarative Flow + Planner-Critic Architecture",
        "nodes": [
            {
                "name": "StockNode",
                "type": "Validator",
                "description": "Verifica disponibilidad de inventario y límites máximos por orden."
            },
            {
                "name": "TaxAndPricingNode",
                "type": "Calculator",
                "description": "Calcula subtotal, desglose de IVA (19% Colombia) y total bruto."
            },
            {
                "name": "AuditCriticNode",
                "type": "Critic",
                "description": "Valida integridad financiera, detecta anomalías y aplica límites de seguridad."
            },
            {
                "name": "OrderSummaryNode",
                "type": "Packager",
                "description": "Genera el identificador único de comanda (ORD-...) y metadata de auditoría."
            }
        ],
        "error_handling": "Explicit branch stopping on Stock Failure or Critic Rejection"
    }


@app.post("/api/pedidos/procesar", response_model=OrderResponse)
def procesar_pedido(order: OrderRequest):
    """
    Recibe la comanda y ejecuta el grafo de PocketFlow.
    """
    order_data = {
        "item_id": order.item_id,
        "dish_name": order.dish_name,
        "qty": order.qty,
        "unit_price": order.unit_price
    }

    state = process_order_flow(order_data)

    if not state.get("is_valid", False):
        return OrderResponse(
            success=False,
            is_valid=False,
            error_log=state.get("error_log", "Error durante la validación del pedido."),
            validation_results=state.get("validation_results", {}),
            billing=state.get("billing", {}),
            summary=None
        )

    return OrderResponse(
        success=True,
        is_valid=True,
        error_log=None,
        validation_results=state.get("validation_results", {}),
        billing=state.get("billing", {}),
        summary=state.get("summary", {})
    )


# =====================================================================
# SERVICIO DE ARCHIVOS ESTÁTICOS Y PÁGINAS HTML (Evita 404 en servidor)
# =====================================================================
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Montar directorios de recursos
if os.path.exists(os.path.join(BASE_DIR, "css")):
    app.mount("/css", StaticFiles(directory=os.path.join(BASE_DIR, "css")), name="css")
if os.path.exists(os.path.join(BASE_DIR, "js")):
    app.mount("/js", StaticFiles(directory=os.path.join(BASE_DIR, "js")), name="js")
if os.path.exists(os.path.join(BASE_DIR, "tests")):
    app.mount("/tests", StaticFiles(directory=os.path.join(BASE_DIR, "tests")), name="tests")

# Rutas explícitas para las páginas de la aplicación (con y sin .html)
@app.get("/index.html")
@app.get("/index")
def serve_index():
    return FileResponse(os.path.join(BASE_DIR, "index.html"))

@app.get("/pedido.html")
@app.get("/pedido")
def serve_pedido():
    return FileResponse(os.path.join(BASE_DIR, "pedido.html"))

@app.get("/admin.html")
@app.get("/admin")
def serve_admin():
    return FileResponse(os.path.join(BASE_DIR, "admin.html"))

@app.get("/login.html")
@app.get("/login")
def serve_login():
    return FileResponse(os.path.join(BASE_DIR, "login.html"))


if __name__ == "__main__":
    import uvicorn
    print("Iniciando RestoApp PocketFlow API en http://127.0.0.1:8000 ...")
    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)
