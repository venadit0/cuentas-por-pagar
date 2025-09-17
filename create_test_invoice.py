#!/usr/bin/env python3
import asyncio
import os
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/backend/.env')

async def create_test_invoice():
    """Create a test invoice in the database for testing download/delete functionality"""
    
    # MongoDB connection
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Test company ID
    test_empresa_id = "f94fee4d-dc88-41b8-b4eb-d611d3c4bbb1"
    
    # Create test invoice data
    test_invoice = {
        'id': str(uuid.uuid4()),
        'empresa_id': test_empresa_id,
        'numero_factura': 'TEST-001',
        'nombre_proveedor': 'Proveedor de Prueba S.A.',
        'fecha_factura': '2024-01-15',
        'monto': 1500.00,
        'estado_pago': 'pendiente',
        'fecha_creacion': datetime.now(timezone.utc).isoformat(),
        'archivo_pdf': '5138caf6-3c9a-4073-b389-4eaa7847c868.pdf',  # Use existing PDF
        'archivo_original': 'factura_test_001.pdf'
    }
    
    try:
        # Insert the test invoice
        result = await db.invoices.insert_one(test_invoice)
        print(f"✅ Test invoice created successfully!")
        print(f"   Invoice ID: {test_invoice['id']}")
        print(f"   Company ID: {test_invoice['empresa_id']}")
        print(f"   Invoice Number: {test_invoice['numero_factura']}")
        print(f"   PDF File: {test_invoice['archivo_pdf']}")
        
        # Verify the invoice was created
        created_invoice = await db.invoices.find_one({"id": test_invoice['id']})
        if created_invoice:
            print(f"✅ Verification successful - invoice found in database")
        else:
            print(f"❌ Verification failed - invoice not found in database")
            
        return test_invoice['id']
        
    except Exception as e:
        print(f"❌ Error creating test invoice: {str(e)}")
        return None
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(create_test_invoice())