#!/usr/bin/env python3
"""
Final comprehensive test for comprobante functionality
"""

import requests
import os
import tempfile

def create_test_invoice():
    """Create a test invoice by direct API call (simulating successful PDF processing)"""
    api_url = "https://payables-master.preview.emergentagent.com/api"
    
    # Use existing company
    company_id = "4d87e4d4-33f4-4f22-9c6f-a113c49038fc"
    
    # Create invoice data manually (simulating what Gemini would extract)
    invoice_data = {
        "empresa_id": company_id,
        "numero_factura": "TEST-COMPROBANTE-001",
        "nombre_proveedor": "Proveedor Test Comprobante S.A.",
        "fecha_factura": "2024-01-15",
        "monto": 1500.00
    }
    
    print("📄 Creating test invoice manually...")
    
    # We'll use the MongoDB directly via a simple script
    import tempfile
    
    # Create a simple script to insert directly into MongoDB
    script_content = f'''
import os
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import uuid
from datetime import datetime, timezone

async def create_invoice():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["test_database"]
    
    invoice_data = {{
        "id": str(uuid.uuid4()),
        "empresa_id": "{company_id}",
        "numero_factura": "TEST-COMPROBANTE-001",
        "numero_contrato": None,
        "nombre_proveedor": "Proveedor Test Comprobante S.A.",
        "fecha_factura": "2024-01-15",
        "monto": 1500.00,
        "estado_pago": "pendiente",
        "fecha_creacion": datetime.now(timezone.utc).isoformat(),
        "archivo_pdf": None,
        "archivo_original": None,
        "comprobante_pago": None,
        "comprobante_original": None
    }}
    
    result = await db.invoices.insert_one(invoice_data)
    print(f"Created invoice with ID: {{invoice_data['id']}}")
    return invoice_data['id']

if __name__ == "__main__":
    invoice_id = asyncio.run(create_invoice())
'''
    
    # Write and execute the script
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(script_content)
        script_path = f.name
    
    try:
        import subprocess
        result = subprocess.run(['python', script_path], capture_output=True, text=True, cwd='/app')
        if result.returncode == 0:
            # Extract invoice ID from output
            output_lines = result.stdout.strip().split('\n')
            for line in output_lines:
                if 'Created invoice with ID:' in line:
                    invoice_id = line.split(': ')[1]
                    print(f"✅ Created test invoice: {invoice_id}")
                    return invoice_id
        else:
            print(f"❌ Failed to create invoice: {result.stderr}")
            return None
    finally:
        os.unlink(script_path)
    
    return None

def test_complete_comprobante_workflow():
    """Test the complete comprobante workflow"""
    print("🚀 COMPREHENSIVE COMPROBANTE FUNCTIONALITY TEST")
    print("=" * 60)
    
    api_url = "https://payables-master.preview.emergentagent.com/api"
    company_id = "4d87e4d4-33f4-4f22-9c6f-a113c49038fc"
    comprobante_file = "/app/comprobante_test.pdf"
    
    # Step 1: Create test invoice
    print("\n1️⃣ Creating test invoice...")
    invoice_id = create_test_invoice()
    if not invoice_id:
        print("❌ Failed to create test invoice")
        return False
    
    # Step 2: Verify invoice exists and has comprobante fields
    print("\n2️⃣ Verifying invoice structure...")
    response = requests.get(f"{api_url}/invoices/{company_id}")
    if response.status_code == 200:
        invoices = response.json()
        test_invoice = None
        for inv in invoices:
            if inv.get('id') == invoice_id:
                test_invoice = inv
                break
        
        if test_invoice:
            print(f"   ✅ Found invoice: {test_invoice.get('numero_factura')}")
            print(f"   📎 comprobante_pago: {test_invoice.get('comprobante_pago')}")
            print(f"   📎 comprobante_original: {test_invoice.get('comprobante_original')}")
            
            if 'comprobante_pago' in test_invoice and 'comprobante_original' in test_invoice:
                print("   ✅ Invoice has comprobante fields")
            else:
                print("   ❌ Invoice missing comprobante fields")
                return False
        else:
            print("   ❌ Test invoice not found")
            return False
    else:
        print(f"   ❌ Failed to get invoices: {response.status_code}")
        return False
    
    # Step 3: Upload comprobante
    print("\n3️⃣ Uploading comprobante...")
    if not os.path.exists(comprobante_file):
        print(f"   ❌ Comprobante file not found: {comprobante_file}")
        return False
    
    try:
        with open(comprobante_file, 'rb') as f:
            files = {'file': ('comprobante_test.pdf', f, 'application/pdf')}
            response = requests.post(f"{api_url}/invoices/{invoice_id}/upload-comprobante", files=files)
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Upload successful: {data.get('message')}")
            comprobante_filename = data.get('comprobante_filename')
            if comprobante_filename:
                print(f"   📎 Filename: {comprobante_filename}")
                
                # Verify file exists
                file_path = f"/app/uploads/{comprobante_filename}"
                if os.path.exists(file_path):
                    file_size = os.path.getsize(file_path)
                    print(f"   ✅ File saved: {file_path} ({file_size} bytes)")
                else:
                    print(f"   ❌ File not found: {file_path}")
                    return False
            else:
                print("   ❌ No filename in response")
                return False
        else:
            print(f"   ❌ Upload failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Upload exception: {e}")
        return False
    
    # Step 4: Download comprobante
    print("\n4️⃣ Downloading comprobante...")
    response = requests.get(f"{api_url}/invoices/{invoice_id}/download-comprobante")
    if response.status_code == 200:
        content_length = len(response.content)
        content_type = response.headers.get('content-type', 'unknown')
        print(f"   ✅ Download successful: {content_length} bytes")
        print(f"   📄 Content-Type: {content_type}")
        
        if content_length > 0:
            print("   ✅ File has content")
        else:
            print("   ❌ Downloaded file is empty")
            return False
    else:
        print(f"   ❌ Download failed: {response.status_code} - {response.text}")
        return False
    
    # Step 5: Verify invoice updated with comprobante info
    print("\n5️⃣ Verifying invoice updated...")
    response = requests.get(f"{api_url}/invoices/{company_id}")
    if response.status_code == 200:
        invoices = response.json()
        test_invoice = None
        for inv in invoices:
            if inv.get('id') == invoice_id:
                test_invoice = inv
                break
        
        if test_invoice:
            comprobante_pago = test_invoice.get('comprobante_pago')
            comprobante_original = test_invoice.get('comprobante_original')
            
            print(f"   📎 Updated comprobante_pago: {comprobante_pago}")
            print(f"   📎 Updated comprobante_original: {comprobante_original}")
            
            if comprobante_pago and comprobante_original:
                print("   ✅ Invoice properly updated with comprobante info")
            else:
                print("   ❌ Invoice not updated with comprobante info")
                return False
        else:
            print("   ❌ Test invoice not found after update")
            return False
    else:
        print(f"   ❌ Failed to get updated invoices: {response.status_code}")
        return False
    
    # Step 6: Test file cleanup on deletion
    print("\n6️⃣ Testing file cleanup on deletion...")
    
    # Get current comprobante filename
    comprobante_filename = test_invoice.get('comprobante_pago')
    if comprobante_filename:
        file_path = f"/app/uploads/{comprobante_filename}"
        file_exists_before = os.path.exists(file_path)
        print(f"   📁 File before deletion: {file_exists_before}")
        
        # Delete invoice
        response = requests.delete(f"{api_url}/invoices/{invoice_id}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Deletion successful: {data.get('message')}")
            
            # Check file cleanup
            file_exists_after = os.path.exists(file_path)
            print(f"   📁 File after deletion: {file_exists_after}")
            
            if file_exists_before and not file_exists_after:
                print("   ✅ File properly cleaned up")
            elif not file_exists_before:
                print("   ⚠️  No file to clean up")
            else:
                print("   ❌ File not cleaned up")
                return False
        else:
            print(f"   ❌ Deletion failed: {response.status_code} - {response.text}")
            return False
    else:
        print("   ⚠️  No comprobante file to test cleanup")
    
    print("\n" + "=" * 60)
    print("🎉 ALL COMPROBANTE FUNCTIONALITY TESTS PASSED!")
    print("✅ Upload comprobante: SUCCESS")
    print("✅ Download comprobante: SUCCESS") 
    print("✅ Invoice fields updated: SUCCESS")
    print("✅ File management: SUCCESS")
    print("✅ File cleanup on deletion: SUCCESS")
    
    return True

if __name__ == "__main__":
    success = test_complete_comprobante_workflow()
    exit(0 if success else 1)