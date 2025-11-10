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
import { Upload, FileText, DollarSign, Users, Clock, CheckCircle, Building, Plus, ArrowRight, Download, Trash2, FileSpreadsheet, Settings, Edit3, AlertTriangle, File, Receipt, Lock, X, LogOut, User } from "lucide-react";
import { useToast } from "./hooks/use-toast";
import { Toaster } from "./components/ui/sonner";
import { useAuth } from "./contexts/AuthContext";
import Login from "./components/Login";

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

// ULTRA-SAFE download using native browser API
const useDownload = () => {
  const downloadFile = useCallback((blob, filename) => {
    // Use requestAnimationFrame to ensure we're outside React's render cycle
    requestAnimationFrame(() => {
      try {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.style.display = 'none'; // Completely hidden
        link.href = url;
        link.download = filename;
        
        // Use click() instead of dispatchEvent for maximum compatibility
        link.click();
        
        // Cleanup after a safe delay
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 100);
      } catch (error) {
        console.error('Download error:', error);
      }
    });
  }, []);

  return downloadFile;
};

// Dialog Manager Hook - prevents multiple dialogs from being open simultaneously
const useDialogManager = () => {
  const [activeDialog, setActiveDialog] = useState(null);
  const [dialogData, setDialogData] = useState(null);

  const openDialog = useCallback((dialogName, data = null) => {
    // Close any existing dialog first (mutex pattern)
    setActiveDialog(null);
    // Use microtask to ensure clean state transition
    Promise.resolve().then(() => {
      setActiveDialog(dialogName);
      setDialogData(data);
    });
  }, []);

  const closeDialog = useCallback(() => {
    setActiveDialog(null);
    setDialogData(null);
  }, []);

  const isDialogOpen = useCallback((dialogName) => {
    return activeDialog === dialogName;
  }, [activeDialog]);

  return {
    activeDialog,
    dialogData,
    openDialog,
    closeDialog,
    isDialogOpen
  };
};

// Password confirmation dialog component - Memoized to prevent unnecessary rerenders
const PasswordDialog = React.memo(({ isOpen, onClose, onConfirm, title, description }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handlePasswordSubmit = useCallback(() => {
    try {
      if (password === 'MAURO') {
        onConfirm();
        handleClose();
      } else {
        setError('Contraseña incorrecta');
        handleClose();
      }
    } catch (error) {
      console.error('Error in password submit:', error);
      handleClose();
    }
  }, [password, onConfirm]);

  const handleClose = useCallback(() => {
    setPassword('');
    setError('');
    onClose();
  }, [onClose]);

  const handleKeyPress = useCallback((e) => {
    try {
      if (e.key === 'Enter') {
        e.preventDefault();
        handlePasswordSubmit();
      }
    } catch (error) {
      console.error('Error in key press:', error);
    }
  }, [handlePasswordSubmit]);

  // Reset internal state when dialog closes
  React.useEffect(() => {
    if (!isOpen) {
      setPassword('');
      setError('');
    }
  }, [isOpen]);

  // Only render when actually open to prevent portal issues
  if (!isOpen) return null;

  return (
    <Dialog key="password-dialog" open={isOpen} onOpenChange={handleClose}>
      <DialogContent key="password-dialog-content">
        <DialogHeader key="password-dialog-header">
          <DialogTitle key="password-dialog-title" className="flex items-center gap-2">
            <Lock key="password-dialog-icon" className="h-5 w-5 text-yellow-600" />
            Confirmar con Contraseña
          </DialogTitle>
          <DialogDescription key="password-dialog-desc">
            <span key="password-dialog-title-text" className="font-semibold">{title}</span>
            <br key="password-dialog-br1" />
            {description}
            <br key="password-dialog-br2" /><br key="password-dialog-br3" />
            <span key="password-dialog-prompt" className="text-red-600 font-semibold">🔒 Ingresa la contraseña para continuar:</span>
          </DialogDescription>
        </DialogHeader>
        <div key="password-dialog-body" className="space-y-4">
          <div key="password-dialog-input-wrapper">
            <Label key="password-dialog-label">Contraseña de Seguridad</Label>
            <Input
              key="password-dialog-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ingresa contraseña..."
              className="mt-2"
              autoFocus
            />
            {error && (
              <p key="password-dialog-error" className="text-sm text-red-600 mt-2">{error}</p>
            )}
          </div>
          <div key="password-dialog-buttons" className="flex gap-3 pt-4">
            <Button key="password-dialog-cancel" variant="outline" onClick={handleClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              key="password-dialog-confirm"
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
});

// Company management component - Using Dialog Manager for safe dialog handling
const CompanyManager = ({ 
  empresas, 
  onSelectEmpresa, 
  onCreateEmpresa, 
  onEditEmpresa, 
  onDeleteEmpresa,
  user,
  onLogout 
}) => {
  // Use Dialog Manager to prevent multiple dialogs from being open simultaneously
  const dialogManager = useDialogManager();
  
  const [empresaForm, setEmpresaForm] = useState({
    nombre: "", rut_cuit: "", direccion: "", telefono: "", email: ""
  });
  const [editingEmpresa, setEditingEmpresa] = useState(null);
  const [deletingEmpresa, setDeletingEmpresa] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);

  const openNewEmpresa = useCallback(() => {
    setEmpresaForm({ nombre: "", rut_cuit: "", direccion: "", telefono: "", email: "" });
    dialogManager.openDialog('newEmpresa');
  }, [dialogManager]);

  const openEditEmpresa = useCallback((emp) => {
    setEditingEmpresa(emp);
    setEmpresaForm({
      nombre: emp.nombre || "",
      rut_cuit: emp.rut_cuit || "",
      direccion: emp.direccion || "",
      telefono: emp.telefono || "",
      email: emp.email || ""
    });
    dialogManager.openDialog('editEmpresa');
  }, [dialogManager]);

  const openDeleteEmpresa = useCallback((emp) => {
    setDeletingEmpresa(emp);
    dialogManager.openDialog('deleteEmpresa');
  }, [dialogManager]);

  const handleCreateEmpresa = useCallback(() => {
    onCreateEmpresa(empresaForm);
    dialogManager.closeDialog();
    setEmpresaForm({ nombre: "", rut_cuit: "", direccion: "", telefono: "", email: "" });
  }, [empresaForm, onCreateEmpresa, dialogManager]);

  const handleEditEmpresa = useCallback(() => {
    onEditEmpresa(editingEmpresa.id, empresaForm);
    dialogManager.closeDialog();
    setEditingEmpresa(null);
  }, [editingEmpresa, empresaForm, onEditEmpresa, dialogManager]);

  const handleDeleteEmpresa = useCallback(() => {
    // Close current dialog and open password dialog
    setPendingAction(() => () => {
      onDeleteEmpresa(deletingEmpresa.id);
      setDeletingEmpresa(null);
    });
    dialogManager.openDialog('password', {
      title: 'Eliminar Empresa',
      description: `Se eliminará permanentemente la empresa "${deletingEmpresa?.nombre}" y todas sus facturas asociadas.`
    });
  }, [deletingEmpresa, onDeleteEmpresa, dialogManager]);

  const handlePasswordConfirm = useCallback(async () => {
    if (pendingAction) {
      try {
        await pendingAction();
      } catch (error) {
        console.error('Error in pending action:', error);
      }
      setPendingAction(null);
    }
    dialogManager.closeDialog();
  }, [pendingAction, dialogManager]);

  const handlePasswordCancel = useCallback(() => {
    setPendingAction(null);
    setDeletingEmpresa(null);
    dialogManager.closeDialog();
  }, [dialogManager]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* User Header */}
        <div className="flex justify-between items-center mb-8 bg-white rounded-lg shadow-sm px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">{user?.username}</p>
              <p className="text-sm text-slate-500 capitalize">{user?.role === 'admin' ? 'Administrador' : 'Solo Lectura'}</p>
            </div>
          </div>
          <Button variant="outline" onClick={onLogout} className="text-red-600 hover:text-red-700 hover:bg-red-50">
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-slate-800 mb-4">Panel de Gestión Empresarial</h1>
          <p className="text-slate-600 text-xl">Gestiona las cuentas por pagar de todas tus empresas</p>
        </div>

        <div className="mb-8 text-center">
          {user?.role === 'admin' && (
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700" onClick={openNewEmpresa}>
              <Plus className="h-5 w-5 mr-2" />
              Nueva Empresa
            </Button>
          )}
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

      {/* Dialogs - Using Dialog Manager to prevent concurrent dialogs */}
      <Dialog key="new-empresa-dialog" open={dialogManager.isDialogOpen('newEmpresa')} onOpenChange={() => dialogManager.closeDialog()}>
        <DialogContent key="new-empresa-content">
          <DialogHeader key="new-empresa-header">
            <DialogTitle key="new-empresa-title">Crear Nueva Empresa</DialogTitle>
            <DialogDescription key="new-empresa-desc">Ingresa los datos de la nueva empresa.</DialogDescription>
          </DialogHeader>
          <div key="new-empresa-body" className="space-y-4">
            <div key="new-empresa-nombre">
              <Label key="new-empresa-nombre-label">Nombre de la Empresa *</Label>
              <Input
                key="new-empresa-nombre-input"
                value={empresaForm.nombre}
                onChange={(e) => setEmpresaForm({...empresaForm, nombre: e.target.value})}
                placeholder="Ej: Mi Empresa S.A."
              />
            </div>
            <div key="new-empresa-rut">
              <Label key="new-empresa-rut-label">RUT/CUIT</Label>
              <Input
                key="new-empresa-rut-input"
                value={empresaForm.rut_cuit}
                onChange={(e) => setEmpresaForm({...empresaForm, rut_cuit: e.target.value})}
                placeholder="Ej: 20-12345678-9"
              />
            </div>
            <div key="new-empresa-dir">
              <Label key="new-empresa-dir-label">Dirección</Label>
              <Input
                key="new-empresa-dir-input"
                value={empresaForm.direccion}
                onChange={(e) => setEmpresaForm({...empresaForm, direccion: e.target.value})}
                placeholder="Ej: Av. Principal 123"
              />
            </div>
            <div key="new-empresa-tel">
              <Label key="new-empresa-tel-label">Teléfono</Label>
              <Input
                key="new-empresa-tel-input"
                value={empresaForm.telefono}
                onChange={(e) => setEmpresaForm({...empresaForm, telefono: e.target.value})}
                placeholder="Ej: +54 11 1234-5678"
              />
            </div>
            <div key="new-empresa-email">
              <Label key="new-empresa-email-label">Email</Label>
              <Input
                key="new-empresa-email-input"
                type="email"
                value={empresaForm.email}
                onChange={(e) => setEmpresaForm({...empresaForm, email: e.target.value})}
                placeholder="Ej: contacto@miempresa.com"
              />
            </div>
            <div key="new-empresa-buttons" className="flex gap-3 pt-4">
              <Button key="new-empresa-cancel" variant="outline" onClick={() => dialogManager.closeDialog()} className="flex-1">
                Cancelar
              </Button>
              <Button key="new-empresa-submit" onClick={handleCreateEmpresa} className="flex-1">
                Crear Empresa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog key="edit-empresa-dialog" open={dialogManager.isDialogOpen('editEmpresa')} onOpenChange={() => dialogManager.closeDialog()}>
        <DialogContent key="edit-empresa-content">
          <DialogHeader key="edit-empresa-header">
            <DialogTitle key="edit-empresa-title" className="flex items-center gap-2">
              <Settings key="edit-empresa-icon" className="h-5 w-5" />
              Editar Empresa
            </DialogTitle>
            <DialogDescription key="edit-empresa-desc">Modifica los datos de {editingEmpresa?.nombre}</DialogDescription>
          </DialogHeader>
          <div key="edit-empresa-body" className="space-y-4">
            <div key="edit-empresa-nombre">
              <Label key="edit-empresa-nombre-label">Nombre de la Empresa *</Label>
              <Input
                key="edit-empresa-nombre-input"
                value={empresaForm.nombre}
                onChange={(e) => setEmpresaForm({...empresaForm, nombre: e.target.value})}
              />
            </div>
            <div key="edit-empresa-rut">
              <Label key="edit-empresa-rut-label">RUT/CUIT</Label>
              <Input
                key="edit-empresa-rut-input"
                value={empresaForm.rut_cuit}
                onChange={(e) => setEmpresaForm({...empresaForm, rut_cuit: e.target.value})}
              />
            </div>
            <div key="edit-empresa-dir">
              <Label key="edit-empresa-dir-label">Dirección</Label>
              <Input
                key="edit-empresa-dir-input"
                value={empresaForm.direccion}
                onChange={(e) => setEmpresaForm({...empresaForm, direccion: e.target.value})}
              />
            </div>
            <div key="edit-empresa-tel">
              <Label key="edit-empresa-tel-label">Teléfono</Label>
              <Input
                key="edit-empresa-tel-input"
                value={empresaForm.telefono}
                onChange={(e) => setEmpresaForm({...empresaForm, telefono: e.target.value})}
              />
            </div>
            <div key="edit-empresa-email">
              <Label key="edit-empresa-email-label">Email</Label>
              <Input
                key="edit-empresa-email-input"
                value={empresaForm.email}
                onChange={(e) => setEmpresaForm({...empresaForm, email: e.target.value})}
              />
            </div>
            <div key="edit-empresa-buttons" className="flex gap-3 pt-4">
              <Button key="edit-empresa-cancel" variant="outline" onClick={() => dialogManager.closeDialog()} className="flex-1">
                Cancelar
              </Button>
              <Button key="edit-empresa-submit" onClick={handleEditEmpresa} className="flex-1">
                Actualizar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog key="delete-empresa-dialog" open={dialogManager.isDialogOpen('deleteEmpresa')} onOpenChange={() => dialogManager.closeDialog()}>
        <DialogContent key="delete-empresa-content">
          <DialogHeader key="delete-empresa-header">
            <DialogTitle key="delete-empresa-title" className="flex items-center gap-2">
              <AlertTriangle key="delete-empresa-icon" className="h-5 w-5 text-red-600" />
              Confirmar Eliminación
            </DialogTitle>
            <DialogDescription key="delete-empresa-desc">
              ¿Eliminar empresa <strong key="delete-empresa-name">{deletingEmpresa?.nombre}</strong>?
              <br key="delete-empresa-br1" /><br key="delete-empresa-br2" />
              <span key="delete-empresa-warning" className="text-red-600 font-semibold">⚠️ ADVERTENCIA:</span>
              <br key="delete-empresa-br3" />
              • Se eliminará la empresa y todos sus datos
              <br key="delete-empresa-br4" />
              • Se eliminarán todas las facturas asociadas
              <br key="delete-empresa-br5" />
              • Esta acción NO se puede deshacer
            </DialogDescription>
          </DialogHeader>
          <div key="delete-empresa-buttons" className="flex gap-3 pt-4">
            <Button key="delete-empresa-cancel" variant="outline" onClick={() => dialogManager.closeDialog()} className="flex-1">
              Cancelar
            </Button>
            <Button key="delete-empresa-submit" onClick={handleDeleteEmpresa} className="flex-1 bg-red-600 hover:bg-red-700">
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PasswordDialog
        key="empresa-password-dialog"
        isOpen={dialogManager.isDialogOpen('password')}
        onClose={handlePasswordCancel}
        onConfirm={handlePasswordConfirm}
        title={dialogManager.dialogData?.title || "Eliminar Empresa"}
        description={dialogManager.dialogData?.description || `Se eliminará permanentemente la empresa "${deletingEmpresa?.nombre}" y todas sus facturas asociadas.`}
      />
    </div>
  );
});

// Invoice management component - Using Dialog Manager for safe dialog handling
const InvoiceManager = React.memo(({ 
  empresa, 
  invoices, 
  resumen, 
  estadoPagadas,
  onBackToEmpresas,
  onUploadPDF,
  onUpdateInvoiceStatus,
  onUpdateContract,
  onUpdateProvider,
  onUpdateInvoiceNumber,
  onDeleteInvoice,
  onDownloadPDF,
  onUploadComprobante,
  onDownloadComprobante,
  onDeleteComprobante,
  onUploadXml,
  onDownloadXml,
  onExportPendientes,
  onExportPagadas,
  onExportResumen,
  user,
  onLogout
}) => {
  // Use Dialog Manager to prevent multiple dialogs from being open simultaneously
  const dialogManager = useDialogManager();
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [filterEstado, setFilterEstado] = useState("todos");
  const [filterProveedor, setFilterProveedor] = useState("");
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  
  // Contract editing
  const [contractForm, setContractForm] = useState("");
  const [editingInvoice, setEditingInvoice] = useState(null);
  
  // Delete invoice
  const [deletingInvoice, setDeletingInvoice] = useState(null);

  // Upload comprobante
  const [uploadingComprobante, setUploadingComprobante] = useState(false);
  const [comprobanteFile, setComprobanteFile] = useState(null);
  const [uploadingInvoice, setUploadingInvoice] = useState(null);

  // Delete comprobante
  const [deletingComprobante, setDeletingComprobante] = useState(null);

  // Upload XML
  const [uploadingXml, setUploadingXml] = useState(false);
  const [xmlFile, setXmlFile] = useState(null);
  const [uploadingXmlInvoice, setUploadingXmlInvoice] = useState(null);

  // Edit provider
  const [providerForm, setProviderForm] = useState("");
  const [editingProviderInvoice, setEditingProviderInvoice] = useState(null);

  // Edit invoice number
  const [invoiceNumberForm, setInvoiceNumberForm] = useState("");
  const [editingNumberInvoice, setEditingNumberInvoice] = useState(null);

  // Password confirmation for all deletions
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

  const openContractEdit = useCallback((invoice) => {
    setEditingInvoice(invoice);
    setContractForm(invoice.numero_contrato || "");
    dialogManager.openDialog('contractEdit');
  }, [dialogManager]);

  const openDeleteInvoice = useCallback((invoice) => {
    setDeletingInvoice(invoice);
    dialogManager.openDialog('deleteInvoice');
  }, [dialogManager]);

  const handleUpdateContract = useCallback(async () => {
    if (!editingInvoice) return;
    await onUpdateContract(editingInvoice.id, contractForm);
    dialogManager.closeDialog();
    setEditingInvoice(null);
    setContractForm("");
  }, [editingInvoice, contractForm, onUpdateContract, dialogManager]);

  const handleDeleteInvoice = useCallback(async () => {
    if (!deletingInvoice) return;
    // Primer paso: cerrar diálogo de confirmación y abrir diálogo de contraseña
    setPendingAction(() => async () => {
      await onDeleteInvoice(deletingInvoice.id);
      setDeletingInvoice(null);
    });
    setPasswordDialogInfo({
      title: "Eliminar Factura",
      description: `Se eliminará permanentemente la factura "${deletingInvoice.numero_factura}" de "${deletingInvoice.nombre_proveedor}" y su archivo PDF asociado.`
    });
    dialogManager.openDialog('password');
  }, [deletingInvoice, onDeleteInvoice, dialogManager]);

  const openComprobanteUpload = useCallback((invoice) => {
    setUploadingInvoice(invoice);
    setComprobanteFile(null);
    dialogManager.openDialog('comprobanteUpload');
  }, [dialogManager]);

  const handleComprobanteFileSelect = useCallback((event) => {
    const file = event.target.files[0];
    if (file && file.type === "application/pdf") {
      setComprobanteFile(file);
    } else {
      toast({ title: "Error", description: "Selecciona un archivo PDF válido", variant: "destructive" });
    }
  }, [toast]);

  const handleUploadComprobante = useCallback(async () => {
    if (!comprobanteFile || !uploadingInvoice) return;
    
    setUploadingComprobante(true);
    try {
      await onUploadComprobante(uploadingInvoice.id, comprobanteFile);
      dialogManager.closeDialog();
      setUploadingInvoice(null);
      setComprobanteFile(null);
    } finally {
      setUploadingComprobante(false);
    }
  }, [comprobanteFile, uploadingInvoice, onUploadComprobante, dialogManager]);

  const openDeleteComprobante = useCallback((invoice) => {
    setDeletingComprobante(invoice);
    dialogManager.openDialog('deleteComprobante');
  }, [dialogManager]);

  const handleDeleteComprobante = useCallback(async () => {
    if (!deletingComprobante) return;
    // Primer paso: cerrar diálogo de confirmación y abrir diálogo de contraseña
    setPendingAction(() => async () => {
      await onDeleteComprobante(deletingComprobante.id);
      setDeletingComprobante(null);
    });
    setPasswordDialogInfo({
      title: "Eliminar Comprobante de Pago",
      description: `Se eliminará permanentemente el comprobante de pago de la factura "${deletingComprobante.numero_factura}".`
    });
    dialogManager.openDialog('password');
  }, [deletingComprobante, onDeleteComprobante, dialogManager]);

  const handlePasswordConfirm = useCallback(async () => {
    if (pendingAction) {
      try {
        await pendingAction();
      } catch (error) {
        console.error('Error in pending action:', error);
      }
      setPendingAction(null);
    }
    dialogManager.closeDialog();
  }, [pendingAction, dialogManager]);

  const handlePasswordCancel = useCallback(() => {
    setPendingAction(null);
    setDeletingInvoice(null);
    setDeletingComprobante(null);
    dialogManager.closeDialog();
  }, [dialogManager]);

  const openXmlUpload = useCallback((invoice) => {
    setUploadingXmlInvoice(invoice);
    setXmlFile(null);
    dialogManager.openDialog('xmlUpload');
  }, [dialogManager]);

  const handleXmlFileSelect = useCallback((event) => {
    const file = event.target.files[0];
    if (file && file.name.toLowerCase().endsWith('.xml')) {
      setXmlFile(file);
    } else {
      toast({ title: "Error", description: "Selecciona un archivo XML válido", variant: "destructive" });
    }
  }, [toast]);

  const handleUploadXml = useCallback(async () => {
    if (!xmlFile || !uploadingXmlInvoice) return;
    
    setUploadingXml(true);
    try {
      await onUploadXml(uploadingXmlInvoice.id, xmlFile);
      dialogManager.closeDialog();
      setUploadingXmlInvoice(null);
      setXmlFile(null);
    } finally {
      setUploadingXml(false);
    }
  }, [xmlFile, uploadingXmlInvoice, onUploadXml, dialogManager]);

  const openEditProvider = useCallback((invoice) => {
    setEditingProviderInvoice(invoice);
    setProviderForm(invoice.nombre_proveedor || "");
    dialogManager.openDialog('editProvider');
  }, [dialogManager]);

  const handleUpdateProvider = useCallback(async () => {
    if (!editingProviderInvoice) return;
    await onUpdateProvider(editingProviderInvoice.id, providerForm);
    dialogManager.closeDialog();
    setEditingProviderInvoice(null);
    setProviderForm("");
  }, [editingProviderInvoice, providerForm, onUpdateProvider, dialogManager]);

  const openEditInvoiceNumber = useCallback((invoice) => {
    setEditingNumberInvoice(invoice);
    setInvoiceNumberForm(invoice.numero_factura || "");
    dialogManager.openDialog('editInvoiceNumber');
  }, [dialogManager]);

  const handleUpdateInvoiceNumber = useCallback(async () => {
    if (!editingNumberInvoice) return;
    await onUpdateInvoiceNumber(editingNumberInvoice.id, invoiceNumberForm);
    dialogManager.closeDialog();
    setEditingNumberInvoice(null);
    setInvoiceNumberForm("");
  }, [editingNumberInvoice, invoiceNumberForm, onUpdateInvoiceNumber, dialogManager]);

  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* User Header */}
        <div className="flex justify-between items-center mb-6 bg-white rounded-lg shadow-sm px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">{user?.username}</p>
              <p className="text-sm text-slate-500 capitalize">{user?.role === 'admin' ? 'Administrador' : 'Solo Lectura'}</p>
            </div>
          </div>
          <Button variant="outline" onClick={onLogout} className="text-red-600 hover:text-red-700 hover:bg-red-50">
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>

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

        <Tabs defaultValue={isAdmin ? "upload" : "dashboard"} className="space-y-6">
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-5' : 'grid-cols-4'}`}>
            {isAdmin && <TabsTrigger value="upload">Subir PDF</TabsTrigger>}
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="facturas">Facturas</TabsTrigger>
            <TabsTrigger value="pagadas">Facturas Pagadas</TabsTrigger>
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
          </TabsList>

          {isAdmin && (
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
          )}

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
                        <TableCell className="font-medium">
                          {inv.numero_factura}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditInvoiceNumber(inv)}
                            className="ml-2 h-6 w-6 p-0 text-green-600"
                            title="Editar Número de Factura"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                        </TableCell>
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
                        <TableCell>
                          {inv.nombre_proveedor}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditProvider(inv)}
                            className="ml-2 h-6 w-6 p-0 text-green-600"
                            title="Editar Nombre del Proveedor"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                        </TableCell>
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
                            {!inv.archivo_xml ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openXmlUpload(inv)}
                                className="text-blue-600"
                                title="Subir Archivo XML"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onDownloadXml(inv.id, inv.numero_factura)}
                                className="text-blue-600"
                                title="Descargar Archivo XML"
                              >
                                <X className="h-4 w-4" />
                              </Button>
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
      <Dialog key="contract-edit-dialog" open={dialogManager.isDialogOpen('contractEdit')} onOpenChange={() => dialogManager.closeDialog()}>
        <DialogContent key="contract-edit-content">
          <DialogHeader key="contract-edit-header">
            <DialogTitle key="contract-edit-title" className="flex items-center gap-2">
              <File key="contract-edit-icon" className="h-5 w-5" />
              Editar Número de Contrato
            </DialogTitle>
            <DialogDescription key="contract-edit-desc">
              Factura <strong key="contract-edit-invoice-num">{editingInvoice?.numero_factura}</strong> de <strong key="contract-edit-provider">{editingInvoice?.nombre_proveedor}</strong>
            </DialogDescription>
          </DialogHeader>
          <div key="contract-edit-body" className="space-y-4">
            <div key="contract-edit-input-wrapper">
              <Label key="contract-edit-label">Número de Contrato</Label>
              <Input
                key="contract-edit-input"
                value={contractForm}
                onChange={(e) => setContractForm(e.target.value)}
                placeholder="Ej: CT-2024-001"
              />
            </div>
            <div key="contract-edit-buttons" className="flex gap-3 pt-4">
              <Button key="contract-edit-cancel" variant="outline" onClick={() => dialogManager.closeDialog()} className="flex-1">
                Cancelar
              </Button>
              <Button key="contract-edit-submit" onClick={handleUpdateContract} className="flex-1">
                Actualizar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Invoice Dialog */}
      <Dialog key="delete-invoice-dialog" open={dialogManager.isDialogOpen('deleteInvoice')} onOpenChange={() => dialogManager.closeDialog()}>
        <DialogContent key="delete-invoice-content">
          <DialogHeader key="delete-invoice-header">
            <DialogTitle key="delete-invoice-title">Confirmar Eliminación</DialogTitle>
            <DialogDescription key="delete-invoice-desc">
              ¿Eliminar factura <strong key="delete-invoice-num">{deletingInvoice?.numero_factura}</strong> de <strong key="delete-invoice-provider">{deletingInvoice?.nombre_proveedor}</strong>?
              <br key="delete-invoice-br1" /><br key="delete-invoice-br2" />
              Esta acción eliminará también el archivo PDF asociado.
            </DialogDescription>
          </DialogHeader>
          <div key="delete-invoice-buttons" className="flex gap-3 pt-4">
            <Button key="delete-invoice-cancel" variant="outline" onClick={() => dialogManager.closeDialog()} className="flex-1">
              Cancelar
            </Button>
            <Button key="delete-invoice-submit" onClick={handleDeleteInvoice} className="flex-1 bg-red-600 hover:bg-red-700">
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Comprobante Dialog */}
      <Dialog key="upload-comprobante-dialog" open={dialogManager.isDialogOpen('comprobanteUpload')} onOpenChange={() => dialogManager.closeDialog()}>
        <DialogContent key="upload-comprobante-content">
          <DialogHeader key="upload-comprobante-header">
            <DialogTitle key="upload-comprobante-title" className="flex items-center gap-2">
              <Receipt key="upload-comprobante-icon" className="h-5 w-5" />
              Subir Comprobante de Pago
            </DialogTitle>
            <DialogDescription key="upload-comprobante-desc">
              Factura <strong key="upload-comprobante-num">{uploadingInvoice?.numero_factura}</strong> de <strong key="upload-comprobante-provider">{uploadingInvoice?.nombre_proveedor}</strong>
              <br key="upload-comprobante-br" />
              <strong key="upload-comprobante-monto">Monto: {uploadingInvoice && formatCurrency(uploadingInvoice.monto)}</strong>
            </DialogDescription>
          </DialogHeader>
          <div key="upload-comprobante-body" className="space-y-4">
            <div key="upload-comprobante-input-wrapper">
              <Label key="upload-comprobante-label">Comprobante de Pago (PDF)</Label>
              <Input
                key="upload-comprobante-input"
                type="file"
                accept=".pdf"
                onChange={handleComprobanteFileSelect}
                className="mt-2"
              />
              {comprobanteFile && (
                <p key="upload-comprobante-file-name" className="text-sm text-slate-600 mt-2">
                  Archivo: {comprobanteFile.name}
                </p>
              )}
            </div>
            <div key="upload-comprobante-buttons" className="flex gap-3 pt-4">
              <Button key="upload-comprobante-cancel" variant="outline" onClick={() => dialogManager.closeDialog()} className="flex-1">
                Cancelar
              </Button>
              <Button 
                key="upload-comprobante-submit"
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

      {/* Upload XML Dialog */}
      <Dialog key="upload-xml-dialog" open={dialogManager.isDialogOpen('xmlUpload')} onOpenChange={() => dialogManager.closeDialog()}>
        <DialogContent key="upload-xml-content">
          <DialogHeader key="upload-xml-header">
            <DialogTitle key="upload-xml-title" className="flex items-center gap-2">
              <X key="upload-xml-icon" className="h-5 w-5 text-blue-600" />
              Subir Archivo XML
            </DialogTitle>
            <DialogDescription key="upload-xml-desc">
              Factura <strong key="upload-xml-num">{uploadingXmlInvoice?.numero_factura}</strong> de <strong key="upload-xml-provider">{uploadingXmlInvoice?.nombre_proveedor}</strong>
              <br key="upload-xml-br" />
              <strong key="upload-xml-monto">Monto: {uploadingXmlInvoice && formatCurrency(uploadingXmlInvoice.monto)}</strong>
            </DialogDescription>
          </DialogHeader>
          <div key="upload-xml-body" className="space-y-4">
            <div key="upload-xml-input-wrapper">
              <Label key="upload-xml-label">Archivo XML</Label>
              <Input
                key="upload-xml-input"
                type="file"
                accept=".xml"
                onChange={handleXmlFileSelect}
                className="mt-2"
              />
              {xmlFile && (
                <p key="upload-xml-file-name" className="text-sm text-slate-600 mt-2">
                  Archivo: {xmlFile.name}
                </p>
              )}
            </div>
            <div key="upload-xml-buttons" className="flex gap-3 pt-4">
              <Button key="upload-xml-cancel" variant="outline" onClick={() => dialogManager.closeDialog()} className="flex-1">
                Cancelar
              </Button>
              <Button 
                key="upload-xml-submit"
                onClick={handleUploadXml} 
                disabled={!xmlFile || uploadingXml}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {uploadingXml ? "Subiendo..." : "Subir XML"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Provider Dialog */}
      <Dialog key="edit-provider-dialog" open={dialogManager.isDialogOpen('editProvider')} onOpenChange={() => dialogManager.closeDialog()}>
        <DialogContent key="edit-provider-content">
          <DialogHeader key="edit-provider-header">
            <DialogTitle key="edit-provider-title" className="flex items-center gap-2">
              <Edit3 key="edit-provider-icon" className="h-5 w-5" />
              Editar Nombre del Proveedor
            </DialogTitle>
            <DialogDescription key="edit-provider-desc">
              Factura <strong key="edit-provider-num">{editingProviderInvoice?.numero_factura}</strong>
              <br key="edit-provider-br" />
              Proveedor actual: <strong key="edit-provider-current">{editingProviderInvoice?.nombre_proveedor}</strong>
            </DialogDescription>
          </DialogHeader>
          <div key="edit-provider-body" className="space-y-4">
            <div key="edit-provider-input-wrapper">
              <Label key="edit-provider-label">Nombre del Proveedor</Label>
              <Input
                key="edit-provider-input"
                value={providerForm}
                onChange={(e) => setProviderForm(e.target.value)}
                placeholder="Ingrese el nombre del proveedor..."
                className="mt-2"
              />
            </div>
            <div key="edit-provider-buttons" className="flex gap-3 pt-4">
              <Button key="edit-provider-cancel" variant="outline" onClick={() => dialogManager.closeDialog()} className="flex-1">
                Cancelar
              </Button>
              <Button key="edit-provider-submit" onClick={handleUpdateProvider} className="flex-1 bg-green-600 hover:bg-green-700">
                Actualizar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Invoice Number Dialog */}
      <Dialog key="edit-number-dialog" open={dialogManager.isDialogOpen('editInvoiceNumber')} onOpenChange={() => dialogManager.closeDialog()}>
        <DialogContent key="edit-number-content">
          <DialogHeader key="edit-number-header">
            <DialogTitle key="edit-number-title" className="flex items-center gap-2">
              <Edit3 key="edit-number-icon" className="h-5 w-5" />
              Editar Número de Factura
            </DialogTitle>
            <DialogDescription key="edit-number-desc">
              Proveedor: <strong key="edit-number-provider">{editingNumberInvoice?.nombre_proveedor}</strong>
              <br key="edit-number-br" />
              Número actual: <strong key="edit-number-current">{editingNumberInvoice?.numero_factura}</strong>
            </DialogDescription>
          </DialogHeader>
          <div key="edit-number-body" className="space-y-4">
            <div key="edit-number-input-wrapper">
              <Label key="edit-number-label">Número de Factura</Label>
              <Input
                key="edit-number-input"
                value={invoiceNumberForm}
                onChange={(e) => setInvoiceNumberForm(e.target.value)}
                placeholder="Ingrese el número de factura..."
                className="mt-2"
              />
            </div>
            <div key="edit-number-buttons" className="flex gap-3 pt-4">
              <Button key="edit-number-cancel" variant="outline" onClick={() => dialogManager.closeDialog()} className="flex-1">
                Cancelar
              </Button>
              <Button key="edit-number-submit" onClick={handleUpdateInvoiceNumber} className="flex-1 bg-green-600 hover:bg-green-700">
                Actualizar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Comprobante Dialog */}
      <Dialog key="delete-comprobante-dialog" open={dialogManager.isDialogOpen('deleteComprobante')} onOpenChange={() => dialogManager.closeDialog()}>
        <DialogContent key="delete-comprobante-content">
          <DialogHeader key="delete-comprobante-header">
            <DialogTitle key="delete-comprobante-title" className="flex items-center gap-2">
              <AlertTriangle key="delete-comprobante-icon" className="h-5 w-5 text-red-600" />
              Eliminar Comprobante de Pago
            </DialogTitle>
            <DialogDescription key="delete-comprobante-desc">
              ¿Eliminar el comprobante de pago de la factura <strong key="delete-comprobante-num">{deletingComprobante?.numero_factura}</strong>?
              <br key="delete-comprobante-br1" /><br key="delete-comprobante-br2" />
              <span key="delete-comprobante-warning" className="text-red-600 font-semibold">⚠️ Esta acción:</span>
              <br key="delete-comprobante-br3" />
              • Eliminará permanentemente el archivo del comprobante
              <br key="delete-comprobante-br4" />
              • NO eliminará la factura, solo el comprobante
              <br key="delete-comprobante-br5" />
              • NO se puede deshacer
            </DialogDescription>
          </DialogHeader>
          <div key="delete-comprobante-buttons" className="flex gap-3 pt-4">
            <Button key="delete-comprobante-cancel" variant="outline" onClick={() => dialogManager.closeDialog()} className="flex-1">
              Cancelar
            </Button>
            <Button key="delete-comprobante-submit" onClick={handleDeleteComprobante} className="flex-1 bg-red-600 hover:bg-red-700">
              Eliminar Comprobante
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PasswordDialog
        key="invoice-password-dialog"
        isOpen={dialogManager.isDialogOpen('password')}
        onClose={handlePasswordCancel}
        onConfirm={handlePasswordConfirm}
        title={passwordDialogInfo.title}
        description={passwordDialogInfo.description}
      />
    </div>
  );
});

// Main App component
function App() {
  const { isAuthenticated, loading, logout, isAdmin, isReadOnly, user } = useAuth();
  const [view, setView] = useState("empresas");
  const [empresa, setEmpresa] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [estadoPagadas, setEstadoPagadas] = useState(null);

  const { toast } = useToast();
  const downloadFile = useDownload();

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login />;
  }

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

  const updateProvider = async (invoiceId, providerName) => {
    try {
      await axios.put(`${API}/invoices/${invoiceId}/proveedor`, {
        nombre_proveedor: providerName
      });
      toast({ title: "Actualizado", description: "Nombre del proveedor actualizado" });
      loadInvoices();
      loadResumen(); // Refresh summary as provider names affect it
    } catch (error) {
      toast({ title: "Error", description: "No se pudo actualizar el proveedor", variant: "destructive" });
    }
  };

  const updateInvoiceNumber = async (invoiceId, invoiceNumber) => {
    try {
      await axios.put(`${API}/invoices/${invoiceId}/numero`, {
        numero_factura: invoiceNumber
      });
      toast({ title: "Actualizado", description: "Número de factura actualizado" });
      loadInvoices();
    } catch (error) {
      toast({ title: "Error", description: "No se pudo actualizar el número de factura", variant: "destructive" });
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

  // XML functions
  const uploadXml = async (invoiceId, file) => {
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      await axios.post(`${API}/invoices/${invoiceId}/upload-xml`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast({ title: "Éxito", description: "Archivo XML subido correctamente" });
      loadInvoices(); // Refresh invoice list to show XML icon
    } catch (error) {
      toast({ 
        title: "Error", 
        description: error.response?.data?.detail || "Error subiendo XML",
        variant: "destructive" 
      });
    }
  };

  const downloadXml = async (invoiceId, numeroFactura) => {
    try {
      const res = await axios.get(`${API}/invoices/${invoiceId}/download-xml`, { responseType: 'blob' });
      downloadFile(res.data, `xml_${numeroFactura}.xml`);
      toast({ title: "Descarga iniciada", description: `Archivo XML de factura ${numeroFactura}` });
    } catch (error) {
      toast({ title: "Error", description: "No se pudo descargar el archivo XML", variant: "destructive" });
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
          user={user}
          onLogout={logout}
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
        onUpdateProvider={updateProvider}
        onUpdateInvoiceNumber={updateInvoiceNumber}
        onDeleteInvoice={deleteInvoice}
        onDownloadPDF={downloadPDF}
        onUploadComprobante={uploadComprobante}
        onDownloadComprobante={downloadComprobante}
        onDeleteComprobante={deleteComprobante}
        onUploadXml={uploadXml}
        onDownloadXml={downloadXml}
        onExportPendientes={exportPendientes}
        onExportPagadas={exportPagadas}
        onExportResumen={exportResumen}
        user={user}
        onLogout={logout}
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