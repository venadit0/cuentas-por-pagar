from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse, FileResponse
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
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
import io
from export_utils import create_invoices_excel, create_summary_excel


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
    numero_contrato: Optional[str] = None  # NUEVO CAMPO
    nombre_proveedor: str
    fecha_factura: str
    monto: float
    estado_pago: str = "pendiente"  # pendiente, pagado
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    archivo_pdf: Optional[str] = None  # Nombre único del archivo
    archivo_original: Optional[str] = None  # Nombre original del archivo
    comprobante_pago: Optional[str] = None  # Nombre único del comprobante de pago
    comprobante_original: Optional[str] = None  # Nombre original del comprobante
    archivo_xml: Optional[str] = None  # Nombre único del archivo XML
    xml_original: Optional[str] = None  # Nombre original del archivo XML

class InvoiceCreate(BaseModel):
    empresa_id: str  # Nueva relación con empresa
    numero_factura: str
    numero_contrato: Optional[str] = None  # NUEVO CAMPO
    nombre_proveedor: str
    fecha_factura: str
    monto: float

class InvoiceUpdate(BaseModel):
    estado_pago: str

class InvoiceContractUpdate(BaseModel):
    numero_contrato: Optional[str] = None

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


# ENDPOINTS DE EMPRESAS
@api_router.get("/empresas", response_model=List[Empresa])
async def get_empresas():
    """Obtiene todas las empresas"""
    try:
        empresas = await db.empresas.find({"activa": True}).to_list(1000)
        return [Empresa(**parse_from_mongo(empresa)) for empresa in empresas]
    except Exception as e:
        logging.error(f"Error obteniendo empresas: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/empresas", response_model=Empresa)
async def create_empresa(empresa: EmpresaCreate):
    """Crea una nueva empresa"""
    try:
        empresa_data = empresa.dict()
        empresa_obj = Empresa(**empresa_data)
        empresa_dict = prepare_for_mongo(empresa_obj.dict())
        
        await db.empresas.insert_one(empresa_dict)
        return empresa_obj
    except Exception as e:
        logging.error(f"Error creando empresa: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/empresas/{empresa_id}", response_model=Empresa)
async def get_empresa(empresa_id: str):
    """Obtiene una empresa específica"""
    try:
        empresa = await db.empresas.find_one({"id": empresa_id, "activa": True})
        if not empresa:
            raise HTTPException(status_code=404, detail="Empresa no encontrada")
        return Empresa(**parse_from_mongo(empresa))
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error obteniendo empresa: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.put("/empresas/{empresa_id}", response_model=Empresa)
async def update_empresa(empresa_id: str, empresa_update: EmpresaCreate):
    """Actualiza una empresa"""
    try:
        result = await db.empresas.update_one(
            {"id": empresa_id, "activa": True},
            {"$set": empresa_update.dict(exclude_unset=True)}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Empresa no encontrada")
        
        empresa = await db.empresas.find_one({"id": empresa_id})
        return Empresa(**parse_from_mongo(empresa))
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error actualizando empresa: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/upload-pdf/{empresa_id}")
async def upload_pdf(empresa_id: str, file: UploadFile = File(...)):
    """Procesa un PDF y extrae datos de la factura usando Gemini 2.5 Pro"""
    try:
        # Verificar que la empresa existe
        empresa = await db.empresas.find_one({"id": empresa_id, "activa": True})
        if not empresa:
            raise HTTPException(status_code=404, detail="Empresa no encontrada")
        
        # Verificar que es un PDF
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF")
        
        # Crear nombre único para el archivo
        file_id = str(uuid.uuid4())
        file_extension = ".pdf"
        unique_filename = f"{file_id}{file_extension}"
        upload_path = f"/app/uploads/{unique_filename}"
        
        # Guardar archivo permanentemente
        with open(upload_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Guardar temporalmente para procesamiento con Gemini
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            temp_file.write(content)
            temp_file_path = temp_file.name

        try:
            # Configurar Gemini para extraer datos
            chat = LlmChat(
                api_key=os.environ['EMERGENT_LLM_KEY'],
                session_id=f"pdf-extract-{uuid.uuid4()}",
                system_message="Eres un experto en extracción de datos de facturas. Extrae la información solicitada de manera precisa."
            ).with_model("gemini", "gemini-2.0-flash")

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
                    'empresa_id': empresa_id,  # Asociar con la empresa
                    'numero_factura': str(extracted_data['numero_factura']),
                    'numero_contrato': None,  # Se agregará manualmente
                    'nombre_proveedor': str(extracted_data['nombre_proveedor']),
                    'fecha_factura': str(extracted_data['fecha_factura']),
                    'monto': float(extracted_data['monto']),
                    'estado_pago': 'pendiente',
                    'fecha_creacion': datetime.now(timezone.utc),
                    'archivo_pdf': unique_filename,  # Guardar nombre único del archivo
                    'archivo_original': file.filename  # Guardar nombre original
                }
                
                # Preparar para MongoDB
                invoice_data = prepare_for_mongo(invoice_data)
                
                # Insertar en la base de datos
                await db.invoices.insert_one(invoice_data)
                
                # Crear respuesta sin objetos datetime
                response_data = {
                    "id": invoice_data['id'],
                    "empresa_id": invoice_data['empresa_id'],
                    "numero_factura": invoice_data['numero_factura'],
                    "numero_contrato": invoice_data['numero_contrato'],  # NUEVO CAMPO
                    "nombre_proveedor": invoice_data['nombre_proveedor'],
                    "fecha_factura": invoice_data['fecha_factura'],
                    "monto": invoice_data['monto'],
                    "estado_pago": invoice_data['estado_pago'],
                    "archivo_pdf": invoice_data['archivo_pdf'],
                    "archivo_original": invoice_data['archivo_original']
                }
                
                return JSONResponse(content={
                    "success": True,
                    "message": "PDF procesado exitosamente",
                    "data": response_data
                })
                
            except json.JSONDecodeError:
                # Si falla el procesamiento de IA, eliminar el archivo guardado
                if os.path.exists(upload_path):
                    os.unlink(upload_path)
                raise HTTPException(status_code=500, detail="Error al procesar la respuesta de IA")
                
        finally:
            # Limpiar archivo temporal
            os.unlink(temp_file_path)
            
    except Exception as e:
        logging.error(f"Error procesando PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error procesando el PDF: {str(e)}")


@api_router.get("/invoices/{empresa_id}", response_model=List[Invoice])
async def get_invoices(empresa_id: str, estado: Optional[str] = None, proveedor: Optional[str] = None):
    """Obtiene todas las facturas de una empresa con filtros opcionales"""
    try:
        # Verificar que la empresa existe
        empresa = await db.empresas.find_one({"id": empresa_id, "activa": True})
        if not empresa:
            raise HTTPException(status_code=404, detail="Empresa no encontrada")
        
        filter_query = {"empresa_id": empresa_id}
        
        if estado:
            filter_query['estado_pago'] = estado
        if proveedor:
            filter_query['nombre_proveedor'] = {"$regex": proveedor, "$options": "i"}
        
        invoices = await db.invoices.find(filter_query).to_list(1000)
        return [Invoice(**parse_from_mongo(invoice)) for invoice in invoices]
        
    except HTTPException:
        raise
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


@api_router.put("/invoices/{invoice_id}/contrato")
async def update_invoice_contract(invoice_id: str, update: InvoiceContractUpdate):
    """Actualiza el número de contrato de una factura"""
    try:
        result = await db.invoices.update_one(
            {"id": invoice_id},
            {"$set": {"numero_contrato": update.numero_contrato}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Factura no encontrada")
        
        return {
            "success": True, 
            "message": "Número de contrato actualizado correctamente",
            "numero_contrato": update.numero_contrato
        }
        
    except Exception as e:
        logging.error(f"Error actualizando número de contrato: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/invoices/{invoice_id}/upload-comprobante")
async def upload_comprobante_pago(invoice_id: str, file: UploadFile = File(...)):
    """Sube un comprobante de pago para una factura"""
    try:
        # Verificar que la factura existe
        invoice = await db.invoices.find_one({"id": invoice_id})
        if not invoice:
            raise HTTPException(status_code=404, detail="Factura no encontrada")
        
        # Verificar que es un PDF
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF")
        
        # Crear nombre único para el archivo
        unique_filename = f"comprobante_{uuid.uuid4()}_{file.filename}"
        file_path = f"/app/uploads/{unique_filename}"
        
        # Guardar archivo
        content = await file.read()
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        # Actualizar la factura con la información del comprobante
        result = await db.invoices.update_one(
            {"id": invoice_id},
            {"$set": {
                "comprobante_pago": unique_filename,
                "comprobante_original": file.filename
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Factura no encontrada")
        
        return {
            "success": True,
            "message": "Comprobante de pago subido correctamente",
            "comprobante_filename": unique_filename
        }
        
    except Exception as e:
        logging.error(f"Error subiendo comprobante: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/invoices/{invoice_id}/upload-xml")
async def upload_xml_file(invoice_id: str, file: UploadFile = File(...)):
    """Sube un archivo XML para una factura"""
    try:
        # Verificar que la factura existe
        invoice = await db.invoices.find_one({"id": invoice_id})
        if not invoice:
            raise HTTPException(status_code=404, detail="Factura no encontrada")
        
        # Verificar que es un archivo XML
        if not file.filename.lower().endswith('.xml'):
            raise HTTPException(status_code=400, detail="Solo se permiten archivos XML")
        
        # Crear nombre único para el archivo
        unique_filename = f"xml_{uuid.uuid4()}_{file.filename}"
        file_path = f"/app/uploads/{unique_filename}"
        
        # Guardar archivo
        content = await file.read()
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        # Actualizar la factura con la información del XML
        result = await db.invoices.update_one(
            {"id": invoice_id},
            {"$set": {
                "archivo_xml": unique_filename,
                "xml_original": file.filename
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Factura no encontrada")
        
        return {
            "success": True,
            "message": "Archivo XML subido correctamente",
            "xml_filename": unique_filename
        }
        
    except Exception as e:
        logging.error(f"Error subiendo XML: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/invoices/{invoice_id}/download")
async def download_invoice_pdf(invoice_id: str):
    """Descarga el archivo PDF de una factura"""
    try:
        # Buscar la factura en la base de datos
        invoice = await db.invoices.find_one({"id": invoice_id})
        if not invoice:
            raise HTTPException(status_code=404, detail="Factura no encontrada")
        
        # Verificar que tiene archivo PDF
        if not invoice.get('archivo_pdf'):
            raise HTTPException(status_code=404, detail="No hay archivo PDF asociado a esta factura")
        
        # Construir la ruta del archivo
        file_path = f"/app/uploads/{invoice['archivo_pdf']}"
        
        # Verificar que el archivo existe
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Archivo PDF no encontrado en el servidor")
        
        # Obtener el nombre original o usar uno por defecto
        filename = invoice.get('archivo_original', f"factura_{invoice['numero_factura']}.pdf")
        
        # Retornar el archivo para descarga
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type='application/pdf'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error descargando PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error descargando el PDF: {str(e)}")


@api_router.get("/invoices/{invoice_id}/download-comprobante")
async def download_comprobante_pago(invoice_id: str):
    """Descarga el comprobante de pago de una factura"""
    try:
        # Buscar la factura en la base de datos
        invoice = await db.invoices.find_one({"id": invoice_id})
        if not invoice:
            raise HTTPException(status_code=404, detail="Factura no encontrada")
        
        # Verificar que tiene comprobante de pago
        if not invoice.get('comprobante_pago'):
            raise HTTPException(status_code=404, detail="No hay comprobante de pago asociado a esta factura")
        
        # Construir la ruta del archivo
        file_path = f"/app/uploads/{invoice['comprobante_pago']}"
        
        # Verificar que el archivo existe
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Archivo de comprobante no encontrado en el servidor")
        
        # Obtener el nombre original o usar uno por defecto
        filename = invoice.get('comprobante_original', f"comprobante_{invoice['numero_factura']}.pdf")
        
        # Retornar el archivo para descarga
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type='application/pdf'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error descargando comprobante: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error descargando el comprobante: {str(e)}")


@api_router.get("/invoices/{invoice_id}/download-xml")
async def download_xml_file(invoice_id: str):
    """Descarga el archivo XML de una factura"""
    try:
        # Buscar la factura en la base de datos
        invoice = await db.invoices.find_one({"id": invoice_id})
        if not invoice:
            raise HTTPException(status_code=404, detail="Factura no encontrada")
        
        # Verificar que tiene archivo XML
        if not invoice.get('archivo_xml'):
            raise HTTPException(status_code=404, detail="No hay archivo XML asociado a esta factura")
        
        # Construir la ruta del archivo
        file_path = f"/app/uploads/{invoice['archivo_xml']}"
        
        # Verificar que el archivo existe
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Archivo XML no encontrado en el servidor")
        
        # Obtener el nombre original o usar uno por defecto
        filename = invoice.get('xml_original', f"xml_{invoice['numero_factura']}.xml")
        
        # Retornar el archivo para descarga
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type='application/xml'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error descargando XML: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error descargando el XML: {str(e)}")


@api_router.delete("/invoices/{invoice_id}/delete-comprobante")
async def delete_comprobante_pago(invoice_id: str):
    """Elimina el comprobante de pago de una factura"""
    try:
        # Buscar la factura en la base de datos
        invoice = await db.invoices.find_one({"id": invoice_id})
        if not invoice:
            raise HTTPException(status_code=404, detail="Factura no encontrada")
        
        # Verificar que tiene comprobante de pago
        if not invoice.get('comprobante_pago'):
            raise HTTPException(status_code=404, detail="No hay comprobante de pago asociado a esta factura")
        
        # Eliminar el archivo del servidor si existe
        file_path = f"/app/uploads/{invoice['comprobante_pago']}"
        if os.path.exists(file_path):
            try:
                os.unlink(file_path)
                logging.info(f"Comprobante eliminado del servidor: {file_path}")
            except Exception as e:
                logging.warning(f"No se pudo eliminar el archivo del comprobante: {str(e)}")
        
        # Actualizar la factura para remover la información del comprobante
        result = await db.invoices.update_one(
            {"id": invoice_id},
            {"$unset": {
                "comprobante_pago": "",
                "comprobante_original": ""
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Factura no encontrada")
        
        return {
            "success": True,
            "message": "Comprobante de pago eliminado correctamente"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error eliminando comprobante: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error eliminando el comprobante: {str(e)}")


@api_router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str):
    """Elimina una factura y su archivo PDF asociado"""
    try:
        # Buscar la factura en la base de datos
        invoice = await db.invoices.find_one({"id": invoice_id})
        if not invoice:
            raise HTTPException(status_code=404, detail="Factura no encontrada")
        
        # Eliminar el archivo PDF si existe
        if invoice.get('archivo_pdf'):
            file_path = f"/app/uploads/{invoice['archivo_pdf']}"
            if os.path.exists(file_path):
                try:
                    os.unlink(file_path)
                    logging.info(f"Archivo PDF eliminado: {file_path}")
                except Exception as e:
                    logging.warning(f"No se pudo eliminar el archivo PDF: {str(e)}")
        
        # Eliminar el comprobante de pago si existe
        if invoice.get('comprobante_pago'):
            comprobante_path = f"/app/uploads/{invoice['comprobante_pago']}"
            if os.path.exists(comprobante_path):
                try:
                    os.unlink(comprobante_path)
                    logging.info(f"Comprobante eliminado: {comprobante_path}")
                except Exception as e:
                    logging.warning(f"No se pudo eliminar el comprobante: {str(e)}")
        
        # Eliminar la factura de la base de datos
        result = await db.invoices.delete_one({"id": invoice_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Factura no encontrada")
        
        return {"success": True, "message": "Factura eliminada correctamente"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error eliminando factura: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error eliminando la factura: {str(e)}")


@api_router.get("/resumen/proveedor/{empresa_id}", response_model=List[ResumenProveedor])
async def get_resumen_por_proveedor(empresa_id: str):
    """Obtiene resumen de deuda agrupado por proveedor para una empresa"""
    try:
        # Verificar que la empresa existe
        empresa = await db.empresas.find_one({"id": empresa_id, "activa": True})
        if not empresa:
            raise HTTPException(status_code=404, detail="Empresa no encontrada")
        
        pipeline = [
            {"$match": {"empresa_id": empresa_id}},
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
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error obteniendo resumen por proveedor: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/resumen/general/{empresa_id}", response_model=ResumenGeneral)
async def get_resumen_general(empresa_id: str):
    """Obtiene resumen general de todas las deudas de una empresa"""
    try:
        # Verificar que la empresa existe
        empresa = await db.empresas.find_one({"id": empresa_id, "activa": True})
        if not empresa:
            raise HTTPException(status_code=404, detail="Empresa no encontrada")
        
        # Obtener estadísticas generales
        total_stats = await db.invoices.aggregate([
            {"$match": {"empresa_id": empresa_id}},
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
        proveedores = await get_resumen_por_proveedor(empresa_id)
        
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
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error obteniendo resumen general: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/estado-cuenta/pagadas/{empresa_id}", response_model=EstadoCuentaPagadas)
async def get_estado_cuenta_pagadas(empresa_id: str):
    """Obtiene el estado de cuenta de todas las facturas pagadas de una empresa"""
    try:
        # Verificar que la empresa existe
        empresa = await db.empresas.find_one({"id": empresa_id, "activa": True})
        if not empresa:
            raise HTTPException(status_code=404, detail="Empresa no encontrada")
        
        # Obtener todas las facturas pagadas de la empresa
        facturas_pagadas = await db.invoices.find({"empresa_id": empresa_id, "estado_pago": "pagado"}).to_list(1000)
        facturas_pagadas_obj = [Invoice(**parse_from_mongo(factura)) for factura in facturas_pagadas]
        
        # Calcular total pagado
        total_pagado = sum(factura.monto for factura in facturas_pagadas_obj)
        
        # Obtener resumen por proveedor solo para facturas pagadas
        pipeline_pagadas = [
            {"$match": {"empresa_id": empresa_id, "estado_pago": "pagado"}},
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
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error obteniendo estado de cuenta pagadas: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# NUEVOS ENDPOINTS PARA EXPORTAR A EXCEL
@api_router.get("/export/facturas-pendientes/{empresa_id}")
async def export_facturas_pendientes_excel(empresa_id: str):
    """Exporta facturas pendientes a Excel"""
    try:
        # Verificar que la empresa existe
        empresa = await db.empresas.find_one({"id": empresa_id, "activa": True})
        if not empresa:
            raise HTTPException(status_code=404, detail="Empresa no encontrada")
        
        # Obtener facturas pendientes
        facturas = await db.invoices.find({"empresa_id": empresa_id, "estado_pago": "pendiente"}).to_list(1000)
        
        # Crear archivo Excel
        excel_buffer = create_invoices_excel(facturas, "pendientes", empresa['nombre'])
        
        # Crear nombre de archivo
        fecha_actual = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"facturas_pendientes_{empresa['nombre'].replace(' ', '_')}_{fecha_actual}.xlsx"
        
        # Crear archivo temporal
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as temp_file:
            temp_file.write(excel_buffer.getvalue())
            temp_file_path = temp_file.name
        
        # Retornar archivo para descarga
        return FileResponse(
            path=temp_file_path,
            filename=filename,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error exportando facturas pendientes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error exportando facturas pendientes: {str(e)}")


@api_router.get("/export/facturas-pagadas/{empresa_id}")
async def export_facturas_pagadas_excel(empresa_id: str):
    """Exporta facturas pagadas a Excel"""
    try:
        # Verificar que la empresa existe
        empresa = await db.empresas.find_one({"id": empresa_id, "activa": True})
        if not empresa:
            raise HTTPException(status_code=404, detail="Empresa no encontrada")
        
        # Obtener facturas pagadas
        facturas = await db.invoices.find({"empresa_id": empresa_id, "estado_pago": "pagado"}).to_list(1000)
        
        # Crear archivo Excel
        excel_buffer = create_invoices_excel(facturas, "pagadas", empresa['nombre'])
        
        # Crear nombre de archivo
        fecha_actual = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"facturas_pagadas_{empresa['nombre'].replace(' ', '_')}_{fecha_actual}.xlsx"
        
        # Crear archivo temporal
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as temp_file:
            temp_file.write(excel_buffer.getvalue())
            temp_file_path = temp_file.name
        
        # Retornar archivo para descarga
        return FileResponse(
            path=temp_file_path,
            filename=filename,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error exportando facturas pagadas: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error exportando facturas pagadas: {str(e)}")


@api_router.get("/export/resumen-general/{empresa_id}")
async def export_resumen_general_excel(empresa_id: str):
    """Exporta resumen general a Excel"""
    try:
        # Verificar que la empresa existe
        empresa = await db.empresas.find_one({"id": empresa_id, "activa": True})
        if not empresa:
            raise HTTPException(status_code=404, detail="Empresa no encontrada")
        
        # Obtener resumen general (reutilizar función existente)
        resumen = await get_resumen_general(empresa_id)
        resumen_dict = resumen.dict()
        
        # Crear archivo Excel
        excel_buffer = create_summary_excel(resumen_dict, empresa['nombre'])
        
        # Crear nombre de archivo
        fecha_actual = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"resumen_general_{empresa['nombre'].replace(' ', '_')}_{fecha_actual}.xlsx"
        
        # Crear archivo temporal
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as temp_file:
            temp_file.write(excel_buffer.getvalue())
            temp_file_path = temp_file.name
        
        # Retornar archivo para descarga
        return FileResponse(
            path=temp_file_path,
            filename=filename,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error exportando resumen general: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error exportando resumen general: {str(e)}")


# ENDPOINT PARA ELIMINAR EMPRESA (SOFT DELETE)
@api_router.delete("/empresas/{empresa_id}")
async def delete_empresa(empresa_id: str):
    """Elimina una empresa (soft delete) y todas sus facturas"""
    try:
        # Verificar que la empresa existe
        empresa = await db.empresas.find_one({"id": empresa_id, "activa": True})
        if not empresa:
            raise HTTPException(status_code=404, detail="Empresa no encontrada")
        
        # Contar facturas asociadas
        facturas_count = await db.invoices.count_documents({"empresa_id": empresa_id})
        
        # Eliminar todas las facturas de la empresa y sus archivos PDF
        facturas = await db.invoices.find({"empresa_id": empresa_id}).to_list(1000)
        for factura in facturas:
            # Eliminar archivo PDF si existe
            if factura.get('archivo_pdf'):
                file_path = f"/app/uploads/{factura['archivo_pdf']}"
                if os.path.exists(file_path):
                    try:
                        os.unlink(file_path)
                        logging.info(f"Archivo PDF eliminado: {file_path}")
                    except Exception as e:
                        logging.warning(f"No se pudo eliminar el archivo PDF: {str(e)}")
        
        # Eliminar todas las facturas de la empresa
        await db.invoices.delete_many({"empresa_id": empresa_id})
        
        # Marcar empresa como inactiva (soft delete)
        result = await db.empresas.update_one(
            {"id": empresa_id},
            {"$set": {"activa": False, "fecha_eliminacion": datetime.now(timezone.utc)}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Empresa no encontrada")
        
        return {
            "success": True, 
            "message": f"Empresa eliminada correctamente. Se eliminaron {facturas_count} facturas asociadas.",
            "facturas_eliminadas": facturas_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error eliminando empresa: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error eliminando la empresa: {str(e)}")


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