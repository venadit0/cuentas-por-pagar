import React, { useState, useEffect, useCallback } from "react";
import "./App.css";
import axios from "axios";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Badge } from "./components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog";
import { Label } from "./components/ui/label";
import { Upload, FileText, DollarSign, Users, Clock, CheckCircle, Building, Plus, ArrowRight, Download, Trash2, FileSpreadsheet, Settings, Edit3, AlertTriangle, File, Receipt, Lock } from "lucide-react";
import { useToast } from "./hooks/use-toast";
import { Toaster } from "./components/ui/sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Error Boundary to catch and handle React errors gracefully
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">
              Error en la Aplicación
            </h2>
            <p className="text-slate-600 mb-6">
              Ha ocurrido un error inesperado. Por favor, recarga la página para continuar.
            </p>
            <Button 
              onClick={() => window.location.reload()} 
              className="bg-blue-600 hover:bg-blue-700"
            >
              Recargar Página
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Safe download hook that avoids DOM manipulation issues
const useDownload = () => {
  const downloadFile = useCallback((blob, filename) => {
    try {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      
      // Cleanup safely with timeout to avoid race conditions
      setTimeout(() => {
        try {
          if (document.body.contains(link)) {
            document.body.removeChild(link);
          }
          URL.revokeObjectURL(url);
        } catch (error) {
          console.warn('Cleanup already performed:', error);
        }
      }, 100);
    } catch (error) {
      console.error('Download error:', error);
    }
  }, []);

  return downloadFile;
};

// Password confirmation dialog component
const PasswordDialog = ({ isOpen, onClose, onConfirm, title, description }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handlePasswordSubmit = () => {
    if (password === 'MAURO') {
      onConfirm();
      handleClose();
    } else {
      setError('Contraseña incorrecta');
      handleClose();
    }
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    onClose();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlePasswordSubmit();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-yellow-600" />
            Confirmar con Contraseña
          </DialogTitle>
          <DialogDescription>
            <span className="font-semibold">{title}</span>
            <br />
            {description}
            <br /><br />
            <span className="text-red-600 font-semibold">🔒 Ingresa la contraseña para continuar:</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Contraseña de Seguridad</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ingresa contraseña..."
              className="mt-2"
              autoFocus
            />
            {error && (
              <p className="text-sm text-red-600 mt-2">{error}</p>
            )}
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={handlePasswordSubmit}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              Confirmar Eliminación
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Company management component
const CompanyManager = ({ 
  empresas, 
  onSelectEmpresa, 
  onCreateEmpresa, 
  onEditEmpresa, 
  onDeleteEmpresa 
}) => {
  const [showNewEmpresa, setShowNewEmpresa] = useState(false);
  const [showEditEmpresa, setShowEditEmpresa] = useState(false);
  const [showDeleteEmpresa, setShowDeleteEmpresa] = useState(false);
  const [empresaForm, setEmpresaForm] = useState({
    nombre: "", rut_cuit: "", direccion: "", telefono: "", email: ""
  });
  const [editingEmpresa, setEditingEmpresa] = useState(null);
  const [deletingEmpresa, setDeletingEmpresa] = useState(null);

  // Password confirmation for deletions
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const openNewEmpresa = () => {
    setEmpresaForm({ nombre: "", rut_cuit: "", direccion: "", telefono: "", email: "" });
    setShowNewEmpresa(true);
  };

  const openEditEmpresa = (emp) => {
    setEditingEmpresa(emp);
    setEmpresaForm({
      nombre: emp.nombre || "",
      rut_cuit: emp.rut_cuit || "",
      direccion: emp.direccion || "",
      telefono: emp.telefono || "",
      email: emp.email || ""
    });
    setShowEditEmpresa(true);
  };

  const openDeleteEmpresa = (emp) => {
    setDeletingEmpresa(emp);
    setShowDeleteEmpresa(true);
  };

  const handleCreateEmpresa = () => {
    onCreateEmpresa(empresaForm);
    setShowNewEmpresa(false);
    setEmpresaForm({ nombre: "", rut_cuit: "", direccion: "", telefono: "", email: "" });
  };

  const handleEditEmpresa = () => {
    onEditEmpresa(editingEmpresa.id, empresaForm);
    setShowEditEmpresa(false);
    setEditingEmpresa(null);
  };

  const handleDeleteEmpresa = () => {
    // Primer paso: cerrar diálogo de confirmación y abrir diálogo de contraseña
    setShowDeleteEmpresa(false);
    setPendingAction(() => () => {
      onDeleteEmpresa(deletingEmpresa.id);
      setDeletingEmpresa(null);
    });
    setShowPasswordDialog(true);
  };

  const handlePasswordConfirm = async () => {
    if (pendingAction) {
      try {
        await pendingAction();
      } catch (error) {
        console.error('Error in pending action:', error);
      }
      setPendingAction(null);
    }
  };

  const handlePasswordCancel = () => {
    setPendingAction(null);
    setDeletingEmpresa(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-slate-800 mb-4">Panel de Gestión Empresarial</h1>
          <p className="text-slate-600 text-xl">Gestiona las cuentas por pagar de todas tus empresas</p>
        </div>

        <div className="mb-8 text-center">
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700" onClick={openNewEmpresa}>
            <Plus className="h-5 w-5 mr-2" />
            Nueva Empresa
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {empresas.map((emp) => (
            <Card key={`empresa-${emp.id}`} className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-blue-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Building className="h-8 w-8 text-blue-600" />
                  <ArrowRight className="h-5 w-5 text-slate-400" />
                </div>
                <CardTitle className="text-xl">{emp.nombre}</CardTitle>
                {emp.rut_cuit && <CardDescription>RUT/CUIT: {emp.rut_cuit}</CardDescription>}
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-slate-600">
                  {emp.direccion && <p>📍 {emp.direccion}</p>}
                  {emp.telefono && <p>📞 {emp.telefono}</p>}
                  {emp.email && <p>📧 {emp.email}</p>}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button className="flex-1" variant="outline" onClick={() => onSelectEmpresa(emp)}>
                    Gestionar Cuentas
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEditEmpresa(emp)} className="text-blue-600">
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openDeleteEmpresa(emp)} className="text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {empresas.length === 0 && (
          <div className="text-center py-12">
            <Building className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-slate-600 mb-2">No hay empresas registradas</h3>
            <p className="text-slate-500 mb-6">Crea tu primera empresa para comenzar</p>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <Dialog open={showNewEmpresa} onOpenChange={setShowNewEmpresa}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nueva Empresa</DialogTitle>
            <DialogDescription>Ingresa los datos de la nueva empresa.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre de la Empresa *</Label>
              <Input
                value={empresaForm.nombre}
                onChange={(e) => setEmpresaForm({...empresaForm, nombre: e.target.value})}
                placeholder="Ej: Mi Empresa S.A."
              />
            </div>
            <div>
              <Label>RUT/CUIT</Label>
              <Input
                value={empresaForm.rut_cuit}
                onChange={(e) => setEmpresaForm({...empresaForm, rut_cuit: e.target.value})}
                placeholder="Ej: 20-12345678-9"
              />
            </div>
            <div>
              <Label>Dirección</Label>
              <Input
                value={empresaForm.direccion}
                onChange={(e) => setEmpresaForm({...empresaForm, direccion: e.target.value})}
                placeholder="Ej: Av. Principal 123"
              />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input
                value={empresaForm.telefono}
                onChange={(e) => setEmpresaForm({...empresaForm, telefono: e.target.value})}
                placeholder="Ej: +54 11 1234-5678"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={empresaForm.email}
                onChange={(e) => setEmpresaForm({...empresaForm, email: e.target.value})}
                placeholder="Ej: contacto@miempresa.com"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowNewEmpresa(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleCreateEmpresa} className="flex-1">
                Crear Empresa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditEmpresa} onOpenChange={setShowEditEmpresa}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Editar Empresa
            </DialogTitle>
            <DialogDescription>Modifica los datos de {editingEmpresa?.nombre}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre de la Empresa *</Label>
              <Input
                value={empresaForm.nombre}
                onChange={(e) => setEmpresaForm({...empresaForm, nombre: e.target.value})}
              />
            </div>
            <div>
              <Label>RUT/CUIT</Label>
              <Input
                value={empresaForm.rut_cuit}
                onChange={(e) => setEmpresaForm({...empresaForm, rut_cuit: e.target.value})}
              />
            </div>
            <div>
              <Label>Dirección</Label>
              <Input
                value={empresaForm.direccion}
                onChange={(e) => setEmpresaForm({...empresaForm, direccion: e.target.value})}
              />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input
                value={empresaForm.telefono}
                onChange={(e) => setEmpresaForm({...empresaForm, telefono: e.target.value})}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={empresaForm.email}
                onChange={(e) => setEmpresaForm({...empresaForm, email: e.target.value})}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowEditEmpresa(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleEditEmpresa} className="flex-1">
                Actualizar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteEmpresa} onOpenChange={setShowDeleteEmpresa}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Confirmar Eliminación
            </DialogTitle>
            <DialogDescription>
              ¿Eliminar empresa <strong>{deletingEmpresa?.nombre}</strong>?
              <br /><br />
              <span className="text-red-600 font-semibold">⚠️ ADVERTENCIA:</span>
              <br />
              • Se eliminará la empresa y todos sus datos
              <br />
              • Se eliminarán todas las facturas asociadas
              <br />
              • Esta acción NO se puede deshacer
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteEmpresa(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleDeleteEmpresa} className="flex-1 bg-red-600 hover:bg-red-700">
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PasswordDialog
        isOpen={showPasswordDialog}
        onClose={() => {
          setShowPasswordDialog(false);
          handlePasswordCancel();
        }}
        onConfirm={handlePasswordConfirm}
        title="Eliminar Empresa"
        description={`Se eliminará permanentemente la empresa "${deletingEmpresa?.nombre}" y todas sus facturas asociadas.`}
      />
    </div>
  );
};

// Invoice management component
const InvoiceManager = ({ 
  empresa, 
  invoices, 
  resumen, 
  estadoPagadas,
  onBackToEmpresas,
  onUploadPDF,
  onUpdateInvoiceStatus,
  onUpdateContract,
  onDeleteInvoice,
  onDownloadPDF,
  onUploadComprobante,
  onDownloadComprobante,
  onDeleteComprobante,
  onExportPendientes,
  onExportPagadas,
  onExportResumen
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [filterEstado, setFilterEstado] = useState("todos");
  const [filterProveedor, setFilterProveedor] = useState("");
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  
  // Contract editing
  const [showContractEdit, setShowContractEdit] = useState(false);
  const [contractForm, setContractForm] = useState("");
  const [editingInvoice, setEditingInvoice] = useState(null);
  
  // Delete invoice
  const [showDeleteInvoice, setShowDeleteInvoice] = useState(false);
  const [deletingInvoice, setDeletingInvoice] = useState(null);

  // Upload comprobante
  const [showComprobanteUpload, setShowComprobanteUpload] = useState(false);
  const [uploadingComprobante, setUploadingComprobante] = useState(false);
  const [comprobanteFile, setComprobanteFile] = useState(null);
  const [uploadingInvoice, setUploadingInvoice] = useState(null);

  // Delete comprobante
  const [showDeleteComprobante, setShowDeleteComprobante] = useState(false);
  const [deletingComprobante, setDeletingComprobante] = useState(null);

  // Password confirmation for all deletions
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [passwordDialogInfo, setPasswordDialogInfo] = useState({ title: '', description: '' });

  const { toast } = useToast();

  // Filter invoices
  useEffect(() => {
    let filtered = [...invoices];
    if (filterEstado !== "todos") {
      filtered = filtered.filter(inv => inv.estado_pago === filterEstado);
    }
    if (filterProveedor) {
      filtered = filtered.filter(inv => 
        inv.nombre_proveedor.toLowerCase().includes(filterProveedor.toLowerCase())
      );
    }
    setFilteredInvoices(filtered);
  }, [invoices, filterEstado, filterProveedor]);

  const formatCurrency = (amount) => new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS"
  }).format(amount);

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString("es-AR");

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
    } else {
      toast({ title: "Error", description: "Selecciona un archivo PDF válido", variant: "destructive" });
    }
  };

  const uploadPDF = async () => {
    if (!selectedFile || !empresa) return;
    setUploading(true);
    
    try {
      await onUploadPDF(selectedFile);
      setSelectedFile(null);
      const fileInput = document.getElementById("pdf-upload");
      if (fileInput) fileInput.value = "";
    } finally {
      setUploading(false);
    }
  };

  const openContractEdit = (invoice) => {
    setEditingInvoice(invoice);
    setContractForm(invoice.numero_contrato || "");
    setShowContractEdit(true);
  };

  const openDeleteInvoice = (invoice) => {
    setDeletingInvoice(invoice);
    setShowDeleteInvoice(true);
  };

  const handleUpdateContract = async () => {
    if (!editingInvoice) return;
    await onUpdateContract(editingInvoice.id, contractForm);
    setShowContractEdit(false);
    setEditingInvoice(null);
    setContractForm("");
  };

  const handleDeleteInvoice = async () => {
    if (!deletingInvoice) return;
    // Primer paso: cerrar diálogo de confirmación y abrir diálogo de contraseña
    setShowDeleteInvoice(false);
    setPendingAction(() => async () => {
      await onDeleteInvoice(deletingInvoice.id);
      setDeletingInvoice(null);
    });
    setPasswordDialogInfo({
      title: "Eliminar Factura",
      description: `Se eliminará permanentemente la factura "${deletingInvoice.numero_factura}" de "${deletingInvoice.nombre_proveedor}" y su archivo PDF asociado.`
    });
    setShowPasswordDialog(true);
  };

  const openComprobanteUpload = (invoice) => {
    setUploadingInvoice(invoice);
    setComprobanteFile(null);
    setShowComprobanteUpload(true);
  };

  const handleComprobanteFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type === "application/pdf") {
      setComprobanteFile(file);
    } else {
      toast({ title: "Error", description: "Selecciona un archivo PDF válido", variant: "destructive" });
    }
  };

  const handleUploadComprobante = async () => {
    if (!comprobanteFile || !uploadingInvoice) return;
    
    setUploadingComprobante(true);
    try {
      await onUploadComprobante(uploadingInvoice.id, comprobanteFile);
      setShowComprobanteUpload(false);
      setUploadingInvoice(null);
      setComprobanteFile(null);
    } finally {
      setUploadingComprobante(false);
    }
  };

  const openDeleteComprobante = (invoice) => {
    setDeletingComprobante(invoice);
    setShowDeleteComprobante(true);
  };

  const handleDeleteComprobante = async () => {
    if (!deletingComprobante) return;
    // Primer paso: cerrar diálogo de confirmación y abrir diálogo de contraseña
    setShowDeleteComprobante(false);
    setPendingAction(() => async () => {
      await onDeleteComprobante(deletingComprobante.id);
      setDeletingComprobante(null);
    });
    setPasswordDialogInfo({
      title: "Eliminar Comprobante de Pago",
      description: `Se eliminará permanentemente el comprobante de pago de la factura "${deletingComprobante.numero_factura}".`
    });
    setShowPasswordDialog(true);
  };

  const handlePasswordConfirm = async () => {
    if (pendingAction) {
      try {
        await pendingAction();
      } catch (error) {
        console.error('Error in pending action:', error);
      }
      setPendingAction(null);
    }
  };

  const handlePasswordCancel = () => {
    setPendingAction(null);
    setDeletingInvoice(null);
    setDeletingComprobante(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Button variant="outline" onClick={onBackToEmpresas} className="mb-4">
              ← Volver a Empresas
            </Button>
            <h1 className="text-4xl font-bold text-slate-800 mb-2">{empresa?.nombre}</h1>
            <p className="text-slate-600 text-lg">Gestión de Cuentas por Pagar</p>
            {empresa?.rut_cuit && <p className="text-slate-500">RUT/CUIT: {empresa.rut_cuit}</p>}
          </div>
        </div>

        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="upload">Subir PDF</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="facturas">Facturas</TabsTrigger>
            <TabsTrigger value="pagadas">Facturas Pagadas</TabsTrigger>
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <Card className="max-w-2xl mx-auto">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <Upload className="h-6 w-6" />
                  Subir Factura PDF
                </CardTitle>
                <CardDescription>Selecciona un PDF para extraer datos automáticamente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                  <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <Input
                    id="pdf-upload"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="mb-4"
                  />
                  {selectedFile && (
                    <p className="text-sm text-slate-600 mb-4">
                      Archivo: {selectedFile.name}
                    </p>
                  )}
                </div>
                <Button 
                  onClick={uploadPDF} 
                  disabled={!selectedFile || uploading}
                  className="w-full"
                  size="lg"
                >
                  {uploading ? "Procesando..." : "Procesar PDF"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dashboard">
            {resumen && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Deuda Total</CardTitle>
                    <DollarSign className="h-4 w-4 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {formatCurrency(resumen.total_deuda_global)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Facturas</CardTitle>
                    <FileText className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{resumen.total_facturas}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
                    <Clock className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{resumen.facturas_pendientes}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pagadas</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{resumen.facturas_pagadas}</div>
                  </CardContent>
                </Card>
              </div>
            )}

            {resumen && resumen.proveedores && resumen.proveedores.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Resumen por Proveedor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Proveedor</TableHead>
                        <TableHead>Deuda Pendiente</TableHead>
                        <TableHead>Pendientes</TableHead>
                        <TableHead>Pagadas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resumen.proveedores.map((prov, idx) => (
                        <TableRow key={`prov-${idx}-${prov.proveedor}`}>
                          <TableCell className="font-medium">{prov.proveedor}</TableCell>
                          <TableCell className="font-semibold text-orange-600">
                            {formatCurrency(prov.total_deuda)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="destructive">{prov.facturas_pendientes}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{prov.facturas_pagadas}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="facturas">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Lista de Facturas</CardTitle>
                  <Button onClick={onExportPendientes} variant="outline" className="text-green-600">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Exportar a Excel
                  </Button>
                </div>
                <div className="flex gap-4 mt-4">
                  <Select value={filterEstado} onValueChange={setFilterEstado}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filtrar por estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="pendiente">Pendientes</SelectItem>
                      <SelectItem value="pagado">Pagadas</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Buscar proveedor..."
                    value={filterProveedor}
                    onChange={(e) => setFilterProveedor(e.target.value)}
                    className="w-64"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº Factura</TableHead>
                      <TableHead>Nº Contrato</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((inv) => (
                      <TableRow key={`inv-${inv.id}`}>
                        <TableCell className="font-medium">{inv.numero_factura}</TableCell>
                        <TableCell>
                          {inv.numero_contrato || "N/A"}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openContractEdit(inv)}
                            className="ml-2 h-6 w-6 p-0 text-blue-600"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                        <TableCell>{inv.nombre_proveedor}</TableCell>
                        <TableCell>{formatDate(inv.fecha_factura)}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(inv.monto)}</TableCell>
                        <TableCell>
                          <Badge variant={inv.estado_pago === "pagado" ? "secondary" : "destructive"}>
                            {inv.estado_pago}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {inv.estado_pago === "pendiente" ? (
                              <Button
                                size="sm"
                                onClick={() => onUpdateInvoiceStatus(inv.id, "pagado")}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Marcar Pagado
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onUpdateInvoiceStatus(inv.id, "pendiente")}
                              >
                                Marcar Pendiente
                              </Button>
                            )}
                            {inv.archivo_pdf && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onDownloadPDF(inv.id, inv.numero_factura)}
                                className="text-blue-600"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            {inv.estado_pago === "pendiente" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openComprobanteUpload(inv)}
                                className="text-purple-600"
                                title="Subir Comprobante de Pago"
                              >
                                <Receipt className="h-4 w-4" />
                              </Button>
                            )}
                            {inv.comprobante_pago && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onDownloadComprobante(inv.id, inv.numero_factura)}
                                  className="text-green-600"
                                  title="Descargar Comprobante de Pago"
                                >
                                  <Receipt className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openDeleteComprobante(inv)}
                                  className="text-red-500"
                                  title="Eliminar Comprobante de Pago"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDeleteInvoice(inv)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredInvoices.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    No se encontraron facturas
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pagadas">
            <div className="space-y-6">
              {estadoPagadas && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pagado</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(estadoPagadas.total_pagado)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Facturas Pagadas</CardTitle>
                        <FileText className="h-4 w-4 text-blue-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                          {estadoPagadas.cantidad_facturas_pagadas}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Proveedores</CardTitle>
                        <Users className="h-4 w-4 text-purple-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-purple-600">
                          {estadoPagadas.facturas_por_proveedor ? estadoPagadas.facturas_por_proveedor.length : 0}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {estadoPagadas.facturas_pagadas && estadoPagadas.facturas_pagadas.length > 0 && (
                    <Card>
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5" />
                            Detalle de Facturas Pagadas
                          </CardTitle>
                          <Button onClick={onExportPagadas} variant="outline" className="text-green-600">
                            <FileSpreadsheet className="h-4 w-4 mr-2" />
                            Exportar a Excel
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nº Factura</TableHead>
                              <TableHead>Nº Contrato</TableHead>
                              <TableHead>Proveedor</TableHead>
                              <TableHead>Fecha</TableHead>
                              <TableHead>Monto</TableHead>
                              <TableHead>Archivo</TableHead>
                              <TableHead>Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {estadoPagadas.facturas_pagadas.map((fac) => (
                              <TableRow key={`paid-${fac.id}`}>
                                <TableCell className="font-medium">{fac.numero_factura}</TableCell>
                                <TableCell>{fac.numero_contrato || "N/A"}</TableCell>
                                <TableCell>{fac.nombre_proveedor}</TableCell>
                                <TableCell>{formatDate(fac.fecha_factura)}</TableCell>
                                <TableCell className="font-semibold text-green-600">
                                  {formatCurrency(fac.monto)}
                                </TableCell>
                                <TableCell>{fac.archivo_original || fac.archivo_pdf || "N/A"}</TableCell>
                                <TableCell>
                                  {fac.archivo_pdf && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => onDownloadPDF(fac.id, fac.numero_factura)}
                                      className="text-blue-600"
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}

                  {(!estadoPagadas.facturas_pagadas || estadoPagadas.facturas_pagadas.length === 0) && (
                    <Card>
                      <CardContent className="text-center py-8">
                        <CheckCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-600 mb-2">No hay facturas pagadas</h3>
                        <p className="text-slate-500">Las facturas pagadas aparecerán aquí</p>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="resumen">
            {resumen && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Resumen Financiero General</CardTitle>
                      <Button onClick={onExportResumen} variant="outline" className="text-green-600">
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Exportar a Excel
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <p className="text-sm text-slate-600">Deuda Total Pendiente</p>
                        <p className="text-3xl font-bold text-orange-600">
                          {formatCurrency(resumen.total_deuda_global)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-slate-600">Total de Facturas</p>
                        <p className="text-3xl font-bold text-slate-800">{resumen.total_facturas}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6 pt-4 border-t">
                      <div className="space-y-2">
                        <p className="text-sm text-slate-600">Facturas Pendientes</p>
                        <p className="text-2xl font-semibold text-red-600">{resumen.facturas_pendientes}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-slate-600">Facturas Pagadas</p>
                        <p className="text-2xl font-semibold text-green-600">{resumen.facturas_pagadas}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {resumen.proveedores && resumen.proveedores.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Detalle por Proveedor</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {resumen.proveedores.map((prov, idx) => (
                          <div key={`detail-${idx}-${prov.proveedor}`} className="flex justify-between items-center p-4 border rounded-lg">
                            <div>
                              <h3 className="font-semibold text-slate-800">{prov.proveedor}</h3>
                              <p className="text-sm text-slate-600">
                                {prov.facturas_pendientes} pendientes, {prov.facturas_pagadas} pagadas
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-orange-600">
                                {formatCurrency(prov.total_deuda)}
                              </p>
                              <p className="text-sm text-slate-600">deuda pendiente</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Contract Edit Dialog */}
      <Dialog open={showContractEdit} onOpenChange={setShowContractEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <File className="h-5 w-5" />
              Editar Número de Contrato
            </DialogTitle>
            <DialogDescription>
              Factura <strong>{editingInvoice?.numero_factura}</strong> de <strong>{editingInvoice?.nombre_proveedor}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Número de Contrato</Label>
              <Input
                value={contractForm}
                onChange={(e) => setContractForm(e.target.value)}
                placeholder="Ej: CT-2024-001"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowContractEdit(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleUpdateContract} className="flex-1">
                Actualizar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Invoice Dialog */}
      <Dialog open={showDeleteInvoice} onOpenChange={setShowDeleteInvoice}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Eliminar factura <strong>{deletingInvoice?.numero_factura}</strong> de <strong>{deletingInvoice?.nombre_proveedor}</strong>?
              <br /><br />
              Esta acción eliminará también el archivo PDF asociado.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteInvoice(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleDeleteInvoice} className="flex-1 bg-red-600 hover:bg-red-700">
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Comprobante Dialog */}
      <Dialog open={showComprobanteUpload} onOpenChange={setShowComprobanteUpload}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Subir Comprobante de Pago
            </DialogTitle>
            <DialogDescription>
              Factura <strong>{uploadingInvoice?.numero_factura}</strong> de <strong>{uploadingInvoice?.nombre_proveedor}</strong>
              <br />
              <strong>Monto: {uploadingInvoice && formatCurrency(uploadingInvoice.monto)}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Comprobante de Pago (PDF)</Label>
              <Input
                type="file"
                accept=".pdf"
                onChange={handleComprobanteFileSelect}
                className="mt-2"
              />
              {comprobanteFile && (
                <p className="text-sm text-slate-600 mt-2">
                  Archivo: {comprobanteFile.name}
                </p>
              )}
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowComprobanteUpload(false)} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={handleUploadComprobante} 
                disabled={!comprobanteFile || uploadingComprobante}
                className="flex-1"
              >
                {uploadingComprobante ? "Subiendo..." : "Subir Comprobante"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Delete Comprobante Dialog */}
      <Dialog open={showDeleteComprobante} onOpenChange={setShowDeleteComprobante}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Eliminar Comprobante de Pago
            </DialogTitle>
            <DialogDescription>
              ¿Eliminar el comprobante de pago de la factura <strong>{deletingComprobante?.numero_factura}</strong>?
              <br /><br />
              <span className="text-red-600 font-semibold">⚠️ Esta acción:</span>
              <br />
              • Eliminará permanentemente el archivo del comprobante
              <br />
              • NO eliminará la factura, solo el comprobante
              <br />
              • NO se puede deshacer
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteComprobante(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleDeleteComprobante} className="flex-1 bg-red-600 hover:bg-red-700">
              Eliminar Comprobante
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PasswordDialog
        isOpen={showPasswordDialog}
        onClose={() => {
          setShowPasswordDialog(false);
          handlePasswordCancel();
        }}
        onConfirm={handlePasswordConfirm}
        title={passwordDialogInfo.title}
        description={passwordDialogInfo.description}
      />
    </div>
  );
};

// Main App component
function App() {
  const [view, setView] = useState("empresas");
  const [empresa, setEmpresa] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [estadoPagadas, setEstadoPagadas] = useState(null);

  const { toast } = useToast();
  const downloadFile = useDownload();

  // Load empresas on mount
  useEffect(() => {
    loadEmpresas();
  }, []);

  // Load empresa data when selected
  useEffect(() => {
    if (empresa && view === "empresa-detail") {
      loadInvoices();
      loadResumen();
      loadEstadoPagadas();
    }
  }, [empresa, view]);

  // API Functions
  const loadEmpresas = async () => {
    try {
      const res = await axios.get(`${API}/empresas`);
      setEmpresas(res.data);
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar las empresas", variant: "destructive" });
    }
  };

  const loadInvoices = async () => {
    if (!empresa) return;
    try {
      const res = await axios.get(`${API}/invoices/${empresa.id}`);
      setInvoices(res.data);
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar las facturas", variant: "destructive" });
    }
  };

  const loadResumen = async () => {
    if (!empresa) return;
    try {
      const res = await axios.get(`${API}/resumen/general/${empresa.id}`);
      setResumen(res.data);
    } catch (error) {
      console.error("Error loading resumen:", error);
    }
  };

  const loadEstadoPagadas = async () => {
    if (!empresa) return;
    try {
      const res = await axios.get(`${API}/estado-cuenta/pagadas/${empresa.id}`);
      setEstadoPagadas(res.data);
    } catch (error) {
      console.error("Error loading estado pagadas:", error);
    }
  };

  // Company actions
  const selectEmpresa = (emp) => {
    setEmpresa(emp);
    setView("empresa-detail");
    setInvoices([]);
    setResumen(null);
    setEstadoPagadas(null);
  };

  const backToEmpresas = () => {
    setView("empresas");
    setEmpresa(null);
  };

  const createEmpresa = async (empresaForm) => {
    if (!empresaForm.nombre.trim()) {
      toast({ title: "Error", description: "El nombre es requerido", variant: "destructive" });
      return;
    }
    try {
      await axios.post(`${API}/empresas`, empresaForm);
      toast({ title: "Éxito", description: "Empresa creada correctamente" });
      loadEmpresas();
    } catch (error) {
      toast({ title: "Error", description: "No se pudo crear la empresa", variant: "destructive" });
    }
  };

  const editEmpresa = async (empresaId, empresaForm) => {
    if (!empresaForm.nombre.trim()) return;
    try {
      await axios.put(`${API}/empresas/${empresaId}`, empresaForm);
      toast({ title: "Éxito", description: "Empresa actualizada" });
      loadEmpresas();
      if (empresa && empresa.id === empresaId) {
        setEmpresa({...empresa, ...empresaForm});
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudo actualizar", variant: "destructive" });
    }
  };

  const deleteEmpresa = async (empresaId) => {
    try {
      const res = await axios.delete(`${API}/empresas/${empresaId}`);
      toast({ 
        title: "Empresa eliminada", 
        description: `Empresa eliminada. ${res.data.facturas_eliminadas} facturas eliminadas.` 
      });
      loadEmpresas();
      if (empresa && empresa.id === empresaId) {
        backToEmpresas();
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    }
  };

  // Invoice actions
  const uploadPDF = async (file) => {
    if (!file || !empresa) return;
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      await axios.post(`${API}/upload-pdf/${empresa.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast({ title: "Éxito", description: "PDF procesado correctamente" });
      loadInvoices();
      loadResumen();
      loadEstadoPagadas();
    } catch (error) {
      toast({ 
        title: "Error", 
        description: error.response?.data?.detail || "Error procesando PDF",
        variant: "destructive" 
      });
    }
  };

  const updateInvoiceStatus = async (invoiceId, newStatus) => {
    try {
      await axios.put(`${API}/invoices/${invoiceId}/estado`, { estado_pago: newStatus });
      toast({ title: "Actualizado", description: `Factura marcada como ${newStatus}` });
      loadInvoices();
      loadResumen();
      loadEstadoPagadas();
    } catch (error) {
      toast({ title: "Error", description: "No se pudo actualizar", variant: "destructive" });
    }
  };

  const updateContract = async (invoiceId, contractNumber) => {
    try {
      await axios.put(`${API}/invoices/${invoiceId}/contrato`, {
        numero_contrato: contractNumber || null
      });
      toast({ title: "Actualizado", description: "Número de contrato actualizado" });
      loadInvoices();
    } catch (error) {
      toast({ title: "Error", description: "No se pudo actualizar", variant: "destructive" });
    }
  };

  const deleteInvoice = async (invoiceId) => {
    try {
      await axios.delete(`${API}/invoices/${invoiceId}`);
      toast({ title: "Eliminada", description: "Factura eliminada correctamente" });
      loadInvoices();
      loadResumen();
      loadEstadoPagadas();
    } catch (error) {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    }
  };

  // Comprobante functions
  const uploadComprobante = async (invoiceId, file) => {
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      await axios.post(`${API}/invoices/${invoiceId}/upload-comprobante`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast({ title: "Éxito", description: "Comprobante subido correctamente" });
      loadInvoices(); // Refresh invoice list to show comprobante icon
    } catch (error) {
      toast({ 
        title: "Error", 
        description: error.response?.data?.detail || "Error subiendo comprobante",
        variant: "destructive" 
      });
    }
  };

  const downloadComprobante = async (invoiceId, numeroFactura) => {
    try {
      const res = await axios.get(`${API}/invoices/${invoiceId}/download-comprobante`, { responseType: 'blob' });
      downloadFile(res.data, `comprobante_${numeroFactura}.pdf`);
      toast({ title: "Descarga iniciada", description: `Comprobante de factura ${numeroFactura}` });
    } catch (error) {
      toast({ title: "Error", description: "No se pudo descargar el comprobante", variant: "destructive" });
    }
  };
  const deleteComprobante = async (invoiceId) => {
    try {
      await axios.delete(`${API}/invoices/${invoiceId}/delete-comprobante`);
      toast({ title: "Eliminado", description: "Comprobante eliminado correctamente" });
      loadInvoices(); // Refresh invoice list to remove comprobante icon
    } catch (error) {
      toast({ 
        title: "Error", 
        description: error.response?.data?.detail || "No se pudo eliminar el comprobante",
        variant: "destructive" 
      });
    }
  };

  // Download functions using the safe download hook
  const downloadPDF = async (invoiceId, numeroFactura) => {
    try {
      const res = await axios.get(`${API}/invoices/${invoiceId}/download`, { responseType: 'blob' });
      downloadFile(res.data, `factura_${numeroFactura}.pdf`);
      toast({ title: "Descarga iniciada", description: `PDF de factura ${numeroFactura}` });
    } catch (error) {
      toast({ title: "Error", description: "No se pudo descargar", variant: "destructive" });
    }
  };

  const exportPendientes = async () => {
    if (!empresa) return;
    try {
      const res = await axios.get(`${API}/export/facturas-pendientes/${empresa.id}`, { responseType: 'blob' });
      downloadFile(res.data, `facturas_pendientes_${empresa.nombre.replace(/\s+/g, '_')}.xlsx`);
      toast({ title: "Exportado", description: "Excel de facturas pendientes descargado" });
    } catch (error) {
      toast({ title: "Error", description: "No se pudo exportar", variant: "destructive" });
    }
  };

  const exportPagadas = async () => {
    if (!empresa) return;
    try {
      const res = await axios.get(`${API}/export/facturas-pagadas/${empresa.id}`, { responseType: 'blob' });
      downloadFile(res.data, `facturas_pagadas_${empresa.nombre.replace(/\s+/g, '_')}.xlsx`);
      toast({ title: "Exportado", description: "Excel de facturas pagadas descargado" });
    } catch (error) {
      toast({ title: "Error", description: "No se pudo exportar", variant: "destructive" });
    }
  };

  const exportResumen = async () => {
    if (!empresa) return;
    try {
      const res = await axios.get(`${API}/export/resumen-general/${empresa.id}`, { responseType: 'blob' });
      downloadFile(res.data, `resumen_general_${empresa.nombre.replace(/\s+/g, '_')}.xlsx`);
      toast({ title: "Exportado", description: "Excel de resumen general descargado" });
    } catch (error) {
      toast({ title: "Error", description: "No se pudo exportar", variant: "destructive" });
    }
  };

  // Render appropriate view
  if (view === "empresas") {
    return (
      <>
        <CompanyManager
          empresas={empresas}
          onSelectEmpresa={selectEmpresa}
          onCreateEmpresa={createEmpresa}
          onEditEmpresa={editEmpresa}
          onDeleteEmpresa={deleteEmpresa}
        />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <InvoiceManager
        empresa={empresa}
        invoices={invoices}
        resumen={resumen}
        estadoPagadas={estadoPagadas}
        onBackToEmpresas={backToEmpresas}
        onUploadPDF={uploadPDF}
        onUpdateInvoiceStatus={updateInvoiceStatus}
        onUpdateContract={updateContract}
        onDeleteInvoice={deleteInvoice}
        onDownloadPDF={downloadPDF}
        onUploadComprobante={uploadComprobante}
        onDownloadComprobante={downloadComprobante}
        onDeleteComprobante={deleteComprobante}
        onExportPendientes={exportPendientes}
        onExportPagadas={exportPagadas}
        onExportResumen={exportResumen}
      />
      <Toaster />
    </>
  );
}

// Wrap the App with ErrorBoundary to prevent red error screens
const AppWithErrorBoundary = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

export default AppWithErrorBoundary;