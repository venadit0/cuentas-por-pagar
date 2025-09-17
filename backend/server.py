from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
import tempfile
import json


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class Empresa(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nombre: str
    rut_cuit: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    activa: bool = True

class EmpresaCreate(BaseModel):
    nombre: str
    rut_cuit: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None

class Invoice(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str  # Nueva relación con empresa
    numero_factura: str
    nombre_proveedor: str
    fecha_factura: str
    monto: float
    estado_pago: str = "pendiente"  # pendiente, pagado
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    archivo_pdf: Optional[str] = None

class InvoiceCreate(BaseModel):
    empresa_id: str  # Nueva relación con empresa
    numero_factura: str
    nombre_proveedor: str
    fecha_factura: str
    monto: float

class InvoiceUpdate(BaseModel):
    estado_pago: str

class ResumenProveedor(BaseModel):
    proveedor: str
    total_deuda: float
    facturas_pendientes: int
    facturas_pagadas: int

class ResumenGeneral(BaseModel):
    total_deuda_global: float
    total_facturas: int
    facturas_pendientes: int
    facturas_pagadas: int
    proveedores: List[ResumenProveedor]

class EstadoCuentaPagadas(BaseModel):
    total_pagado: float
    cantidad_facturas_pagadas: int
    facturas_por_proveedor: List[ResumenProveedor]
    facturas_pagadas: List[Invoice]


# Helper function to prepare data for MongoDB
def prepare_for_mongo(data):
    if isinstance(data, dict):
        if 'fecha_creacion' in data and isinstance(data['fecha_creacion'], datetime):
            data['fecha_creacion'] = data['fecha_creacion'].isoformat()
    return data

def parse_from_mongo(item):
    if 'fecha_creacion' in item and isinstance(item['fecha_creacion'], str):
        item['fecha_creacion'] = datetime.fromisoformat(item['fecha_creacion'])
    return item


# Routes
@api_router.get("/")
async def root():
    return {"message": "API de Cuentas por Pagar"}


@api_router.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """Procesa un PDF y extrae datos de la factura usando Gemini 2.5 Pro"""
    try:
        # Verificar que es un PDF
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF")
        
        # Guardar temporalmente el archivo
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name

        try:
            # Configurar Gemini para extraer datos
            chat = LlmChat(
                api_key=os.environ['EMERGENT_LLM_KEY'],
                session_id=f"pdf-extract-{uuid.uuid4()}",
                system_message="Eres un experto en extracción de datos de facturas. Extrae la información solicitada de manera precisa."
            ).with_model("gemini", "gemini-1.5-flash")

            # Crear el objeto de archivo para Gemini
            pdf_file = FileContentWithMimeType(
                file_path=temp_file_path,
                mime_type="application/pdf"
            )

            # Prompt para extraer datos específicos
            prompt = """
            Analiza este PDF de factura y extrae exactamente estos datos en formato JSON:
            
            {
                "numero_factura": "número de factura encontrado",
                "nombre_proveedor": "nombre del proveedor/empresa que emite la factura",
                "fecha_factura": "fecha de la factura en formato YYYY-MM-DD",
                "monto": "monto total a pagar como número decimal"
            }
            
            IMPORTANTE:
            - Devuelve SOLO el JSON sin texto adicional
            - Si no encuentras algún dato, usa null
            - El monto debe ser un número sin símbolos de moneda
            - La fecha debe estar en formato YYYY-MM-DD
            """

            user_message = UserMessage(
                text=prompt,
                file_contents=[pdf_file]
            )

            # Obtener respuesta de Gemini
            response = await chat.send_message(user_message)
            
            # Procesar la respuesta
            try:
                # Extraer JSON de la respuesta
                response_text = response.strip()
                if response_text.startswith('```json'):
                    response_text = response_text.replace('```json', '').replace('```', '').strip()
                
                extracted_data = json.loads(response_text)
                
                # Validar datos extraídos
                required_fields = ['numero_factura', 'nombre_proveedor', 'fecha_factura', 'monto']
                for field in required_fields:
                    if field not in extracted_data or extracted_data[field] is None:
                        raise HTTPException(status_code=400, detail=f"No se pudo extraer: {field}")
                
                # Crear factura en la base de datos
                invoice_data = {
                    'id': str(uuid.uuid4()),
                    'numero_factura': str(extracted_data['numero_factura']),
                    'nombre_proveedor': str(extracted_data['nombre_proveedor']),
                    'fecha_factura': str(extracted_data['fecha_factura']),
                    'monto': float(extracted_data['monto']),
                    'estado_pago': 'pendiente',
                    'fecha_creacion': datetime.now(timezone.utc),
                    'archivo_pdf': file.filename
                }
                
                # Preparar para MongoDB
                invoice_data = prepare_for_mongo(invoice_data)
                
                # Insertar en la base de datos
                await db.invoices.insert_one(invoice_data)
                
                # Crear respuesta sin objetos datetime
                response_data = {
                    "id": invoice_data['id'],
                    "numero_factura": invoice_data['numero_factura'],
                    "nombre_proveedor": invoice_data['nombre_proveedor'],
                    "fecha_factura": invoice_data['fecha_factura'],
                    "monto": invoice_data['monto'],
                    "estado_pago": invoice_data['estado_pago'],
                    "archivo_pdf": invoice_data['archivo_pdf']
                }
                
                return JSONResponse(content={
                    "success": True,
                    "message": "PDF procesado exitosamente",
                    "data": response_data
                })
                
            except json.JSONDecodeError:
                raise HTTPException(status_code=500, detail="Error al procesar la respuesta de IA")
                
        finally:
            # Limpiar archivo temporal
            os.unlink(temp_file_path)
            
    except Exception as e:
        logging.error(f"Error procesando PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error procesando el PDF: {str(e)}")


@api_router.get("/invoices", response_model=List[Invoice])
async def get_invoices(estado: Optional[str] = None, proveedor: Optional[str] = None):
    """Obtiene todas las facturas con filtros opcionales"""
    try:
        filter_query = {}
        
        if estado:
            filter_query['estado_pago'] = estado
        if proveedor:
            filter_query['nombre_proveedor'] = {"$regex": proveedor, "$options": "i"}
        
        invoices = await db.invoices.find(filter_query).to_list(1000)
        return [Invoice(**parse_from_mongo(invoice)) for invoice in invoices]
        
    except Exception as e:
        logging.error(f"Error obteniendo facturas: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.put("/invoices/{invoice_id}/estado")
async def update_invoice_status(invoice_id: str, update: InvoiceUpdate):
    """Actualiza el estado de pago de una factura"""
    try:
        result = await db.invoices.update_one(
            {"id": invoice_id},
            {"$set": {"estado_pago": update.estado_pago}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Factura no encontrada")
        
        return {"success": True, "message": "Estado actualizado correctamente"}
        
    except Exception as e:
        logging.error(f"Error actualizando estado: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/resumen/proveedor", response_model=List[ResumenProveedor])
async def get_resumen_por_proveedor():
    """Obtiene resumen de deuda agrupado por proveedor"""
    try:
        pipeline = [
            {
                "$group": {
                    "_id": "$nombre_proveedor",
                    "total_deuda": {
                        "$sum": {
                            "$cond": [
                                {"$eq": ["$estado_pago", "pendiente"]},
                                "$monto",
                                0
                            ]
                        }
                    },
                    "facturas_pendientes": {
                        "$sum": {
                            "$cond": [
                                {"$eq": ["$estado_pago", "pendiente"]},
                                1,
                                0
                            ]
                        }
                    },
                    "facturas_pagadas": {
                        "$sum": {
                            "$cond": [
                                {"$eq": ["$estado_pago", "pagado"]},
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            {
                "$project": {
                    "proveedor": "$_id",
                    "total_deuda": 1,
                    "facturas_pendientes": 1,
                    "facturas_pagadas": 1,
                    "_id": 0
                }
            },
            {
                "$sort": {"total_deuda": -1}
            }
        ]
        
        result = await db.invoices.aggregate(pipeline).to_list(1000)
        return [ResumenProveedor(**item) for item in result]
        
    except Exception as e:
        logging.error(f"Error obteniendo resumen por proveedor: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/resumen/general", response_model=ResumenGeneral)
async def get_resumen_general():
    """Obtiene resumen general de todas las deudas"""
    try:
        # Obtener estadísticas generales
        total_stats = await db.invoices.aggregate([
            {
                "$group": {
                    "_id": None,
                    "total_deuda_global": {
                        "$sum": {
                            "$cond": [
                                {"$eq": ["$estado_pago", "pendiente"]},
                                "$monto",
                                0
                            ]
                        }
                    },
                    "total_facturas": {"$sum": 1},
                    "facturas_pendientes": {
                        "$sum": {
                            "$cond": [
                                {"$eq": ["$estado_pago", "pendiente"]},
                                1,
                                0
                            ]
                        }
                    },
                    "facturas_pagadas": {
                        "$sum": {
                            "$cond": [
                                {"$eq": ["$estado_pago", "pagado"]},
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]).to_list(1)
        
        # Obtener resumen por proveedor
        proveedores = await get_resumen_por_proveedor()
        
        stats = total_stats[0] if total_stats else {
            "total_deuda_global": 0,
            "total_facturas": 0,
            "facturas_pendientes": 0,
            "facturas_pagadas": 0
        }
        
        return ResumenGeneral(
            total_deuda_global=stats["total_deuda_global"],
            total_facturas=stats["total_facturas"],
            facturas_pendientes=stats["facturas_pendientes"],
            facturas_pagadas=stats["facturas_pagadas"],
            proveedores=proveedores
        )
        
    except Exception as e:
        logging.error(f"Error obteniendo resumen general: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/estado-cuenta/pagadas", response_model=EstadoCuentaPagadas)
async def get_estado_cuenta_pagadas():
    """Obtiene el estado de cuenta de todas las facturas pagadas"""
    try:
        # Obtener todas las facturas pagadas
        facturas_pagadas = await db.invoices.find({"estado_pago": "pagado"}).to_list(1000)
        facturas_pagadas_obj = [Invoice(**parse_from_mongo(factura)) for factura in facturas_pagadas]
        
        # Calcular total pagado
        total_pagado = sum(factura.monto for factura in facturas_pagadas_obj)
        
        # Obtener resumen por proveedor solo para facturas pagadas
        pipeline_pagadas = [
            {"$match": {"estado_pago": "pagado"}},
            {
                "$group": {
                    "_id": "$nombre_proveedor",
                    "total_pagado": {"$sum": "$monto"},
                    "facturas_pagadas": {"$sum": 1}
                }
            },
            {
                "$project": {
                    "proveedor": "$_id",
                    "total_deuda": "$total_pagado",  # Usando el mismo campo para consistencia
                    "facturas_pendientes": {"$literal": 0},
                    "facturas_pagadas": 1,
                    "_id": 0
                }
            },
            {
                "$sort": {"total_deuda": -1}
            }
        ]
        
        proveedores_pagadas = await db.invoices.aggregate(pipeline_pagadas).to_list(1000)
        proveedores_obj = [ResumenProveedor(**item) for item in proveedores_pagadas]
        
        return EstadoCuentaPagadas(
            total_pagado=total_pagado,
            cantidad_facturas_pagadas=len(facturas_pagadas_obj),
            facturas_por_proveedor=proveedores_obj,
            facturas_pagadas=facturas_pagadas_obj
        )
        
    except Exception as e:
        logging.error(f"Error obteniendo estado de cuenta pagadas: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()