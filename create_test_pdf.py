#!/usr/bin/env python3

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import os

def create_test_invoice_pdf(filename="test_invoice.pdf"):
    """Create a simple test invoice PDF"""
    
    # Create a canvas
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter
    
    # Title
    c.setFont("Helvetica-Bold", 24)
    c.drawString(200, height - 100, "FACTURA")
    
    # Invoice details
    c.setFont("Helvetica", 12)
    
    # Número de factura
    c.drawString(50, height - 150, "Número de Factura: FACT-2024-001")
    
    # Proveedor
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, height - 200, "PROVEEDOR:")
    c.setFont("Helvetica", 12)
    c.drawString(50, height - 220, "Distribuidora ABC S.A.")
    c.drawString(50, height - 240, "Av. Principal 123")
    c.drawString(50, height - 260, "Ciudad, País")
    
    # Cliente
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, height - 320, "CLIENTE:")
    c.setFont("Helvetica", 12)
    c.drawString(50, height - 340, "Mi Empresa S.A.")
    c.drawString(50, height - 360, "Calle Secundaria 456")
    
    # Fecha
    c.setFont("Helvetica-Bold", 12)
    c.drawString(400, height - 150, "Fecha: 2024-01-15")
    
    # Detalles de productos/servicios
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, height - 420, "DETALLE:")
    
    c.setFont("Helvetica", 10)
    c.drawString(50, height - 450, "Descripción")
    c.drawString(300, height - 450, "Cantidad")
    c.drawString(400, height - 450, "Precio")
    c.drawString(480, height - 450, "Total")
    
    c.line(50, height - 460, 550, height - 460)
    
    c.drawString(50, height - 480, "Servicios de consultoría")
    c.drawString(320, height - 480, "1")
    c.drawString(400, height - 480, "$2,500.00")
    c.drawString(480, height - 480, "$2,500.00")
    
    c.drawString(50, height - 500, "Gastos administrativos")
    c.drawString(320, height - 500, "1")
    c.drawString(400, height - 500, "$300.00")
    c.drawString(480, height - 500, "$300.00")
    
    # Subtotal y total
    c.line(400, height - 520, 550, height - 520)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(400, height - 540, "Subtotal: $2,800.00")
    c.drawString(400, height - 560, "IVA (21%): $588.00")
    c.drawString(400, height - 580, "TOTAL: $3,388.00")
    
    # Términos de pago
    c.setFont("Helvetica", 10)
    c.drawString(50, height - 650, "Términos de pago: 30 días")
    c.drawString(50, height - 670, "Método de pago: Transferencia bancaria")
    
    # Save the PDF
    c.save()
    print(f"✅ PDF creado: {filename}")
    return filename

if __name__ == "__main__":
    pdf_file = create_test_invoice_pdf()
    print(f"Archivo PDF de prueba creado: {pdf_file}")