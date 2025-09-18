import React, { useState, useEffect } from "react";
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
import { Upload, FileText, DollarSign, Users, Clock, CheckCircle, Building, Plus, ArrowRight, Download, Trash2, FileSpreadsheet, Settings, Edit3, AlertTriangle } from "lucide-react";
import { useToast } from "./hooks/use-toast";
import { Toaster } from "./components/ui/sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  // Estados principales
  const [currentView, setCurrentView] = useState("empresas"); // "empresas" o "empresa-detail"
  const [selectedEmpresa, setSelectedEmpresa] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  
  // Estados para nueva empresa
  const [newEmpresa, setNewEmpresa] = useState({
    nombre: "",
    rut_cuit: "",
    direccion: "",
    telefono: "",
    email: ""
  });
  const [showNewEmpresaDialog, setShowNewEmpresaDialog] = useState(false);
  
  // Estados de la aplicación de facturas (cuando hay empresa seleccionada)
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [resumenGeneral, setResumenGeneral] = useState(null);
  const [estadoCuentaPagadas, setEstadoCuentaPagadas] = useState(null);
  const [filterEstado, setFilterEstado] = useState("todos");
  const [filterProveedor, setFilterProveedor] = useState("");
  
  // Estados para edición de número de contrato
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [invoiceToEditContract, setInvoiceToEditContract] = useState(null);
  const [contractNumber, setContractNumber] = useState("");
  
  // Estados para gestión de empresas
  const [showEditEmpresaDialog, setShowEditEmpresaDialog] = useState(false);
  const [showDeleteEmpresaDialog, setShowDeleteEmpresaDialog] = useState(false);
  const [empresaToEdit, setEmpresaToEdit] = useState(null);
  const [empresaToDelete, setEmpresaToDelete] = useState(null);
  const [editEmpresaData, setEditEmpresaData] = useState({
    nombre: "",
    rut_cuit: "",
    direccion: "",
    telefono: "",
    email: ""
  });
  
  const { toast } = useToast();

  // Cargar empresas al iniciar
  useEffect(() => {
    fetchEmpresas();
  }, []);

  // Cargar datos de la empresa cuando se selecciona una
  useEffect(() => {
    if (selectedEmpresa && currentView === "empresa-detail") {
      fetchInvoices();
      fetchResumenGeneral();
      fetchEstadoCuentaPagadas();
    }
  }, [selectedEmpresa, currentView]);

  // Aplicar filtros
  useEffect(() => {
    let filtered = invoices;
    
    if (filterEstado !== "todos") {
      filtered = filtered.filter(invoice => invoice.estado_pago === filterEstado);
    }
    
    if (filterProveedor) {
      filtered = filtered.filter(invoice => 
        invoice.nombre_proveedor.toLowerCase().includes(filterProveedor.toLowerCase())
      );
    }
    
    setFilteredInvoices(filtered);
  }, [invoices, filterEstado, filterProveedor]);

  // ===== FUNCIONES DE EMPRESA =====
  const fetchEmpresas = async () => {
    try {
      const response = await axios.get(`${API}/empresas`);
      setEmpresas(response.data);
    } catch (error) {
      console.error("Error fetching empresas:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las empresas",
        variant: "destructive",
      });
    }
  };

  const createEmpresa = async () => {
    if (!newEmpresa.nombre.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la empresa es requerido",
        variant: "destructive",
      });
      return;
    }

    try {
      await axios.post(`${API}/empresas`, newEmpresa);
      
      toast({
        title: "¡Éxito!",
        description: "Empresa creada correctamente",
      });

      setNewEmpresa({
        nombre: "",
        rut_cuit: "",
        direccion: "",
        telefono: "",
        email: ""
      });
      setShowNewEmpresaDialog(false);
      fetchEmpresas();
    } catch (error) {
      console.error("Error creating empresa:", error);
      toast({
        title: "Error",
        description: "No se pudo crear la empresa",
        variant: "destructive",
      });
    }
  };

  const selectEmpresa = (empresa) => {
    setSelectedEmpresa(empresa);
    setCurrentView("empresa-detail");
    // Limpiar datos anteriores
    setInvoices([]);
    setResumenGeneral(null);
    setEstadoCuentaPagadas(null);
    setFilterEstado("todos");
    setFilterProveedor("");
  };

  const backToEmpresas = () => {
    setCurrentView("empresas");
    setSelectedEmpresa(null);
  };

  // ===== FUNCIONES DE FACTURAS (cuando hay empresa seleccionada) =====
  const fetchInvoices = async () => {
    if (!selectedEmpresa) return;
    
    try {
      const response = await axios.get(`${API}/invoices/${selectedEmpresa.id}`);
      setInvoices(response.data);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las facturas",
        variant: "destructive",
      });
    }
  };

  const fetchResumenGeneral = async () => {
    if (!selectedEmpresa) return;
    
    try {
      const response = await axios.get(`${API}/resumen/general/${selectedEmpresa.id}`);
      setResumenGeneral(response.data);
    } catch (error) {
      console.error("Error fetching resumen:", error);
    }
  };

  const fetchEstadoCuentaPagadas = async () => {
    if (!selectedEmpresa) return;
    
    try {
      const response = await axios.get(`${API}/estado-cuenta/pagadas/${selectedEmpresa.id}`);
      setEstadoCuentaPagadas(response.data);
    } catch (error) {
      console.error("Error fetching estado cuenta pagadas:", error);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
    } else {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo PDF válido",
        variant: "destructive",
      });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo PDF",
        variant: "destructive",
      });
      return;
    }

    if (!selectedEmpresa) {
      toast({
        title: "Error",
        description: "No hay empresa seleccionada",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await axios.post(`${API}/upload-pdf/${selectedEmpresa.id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast({
        title: "¡Éxito!",
        description: "PDF procesado correctamente. Datos extraídos automáticamente.",
      });

      setSelectedFile(null);
      fetchInvoices();
      fetchResumenGeneral();
      fetchEstadoCuentaPagadas();
      
      // Limpiar el input
      document.getElementById("pdf-upload").value = "";
      
    } catch (error) {
      console.error("Error uploading PDF:", error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Error procesando el PDF",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const updateInvoiceStatus = async (invoiceId, newStatus) => {
    try {
      await axios.put(`${API}/invoices/${invoiceId}/estado`, {
        estado_pago: newStatus
      });

      toast({
        title: "¡Actualizado!",
        description: `Factura marcada como ${newStatus}`,
      });

      fetchInvoices();
      fetchResumenGeneral();
      fetchEstadoCuentaPagadas();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la factura",
        variant: "destructive",
      });
    }
  };

  const downloadInvoicePDF = async (invoiceId, numeroFactura) => {
    try {
      const response = await axios.get(`${API}/invoices/${invoiceId}/download`, {
        responseType: 'blob'
      });

      // Crear URL del blob y descargar
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `factura_${numeroFactura}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "¡Descarga iniciada!",
        description: `PDF de la factura ${numeroFactura} descargado`,
      });
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast({
        title: "Error",
        description: "No se pudo descargar el PDF de la factura",
        variant: "destructive",
      });
    }
  };

  const confirmDeleteInvoice = (invoice) => {
    setInvoiceToDelete(invoice);
    setShowDeleteDialog(true);
  };

  const deleteInvoice = async () => {
    if (!invoiceToDelete) return;

    try {
      await axios.delete(`${API}/invoices/${invoiceToDelete.id}`);

      toast({
        title: "¡Eliminada!",
        description: `Factura ${invoiceToDelete.numero_factura} eliminada correctamente`,
      });

      setShowDeleteDialog(false);
      setInvoiceToDelete(null);
      fetchInvoices();
      fetchResumenGeneral();
      fetchEstadoCuentaPagadas();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la factura",
        variant: "destructive",
      });
    }
  };

  // ===== FUNCIONES DE EXPORTACIÓN A EXCEL =====
  const exportFacturasPendientes = async () => {
    if (!selectedEmpresa) return;
    
    try {
      const response = await axios.get(`${API}/export/facturas-pendientes/${selectedEmpresa.id}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `facturas_pendientes_${selectedEmpresa.nombre.replace(/\s+/g, '_')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "¡Exportación exitosa!",
        description: "Archivo Excel de facturas pendientes descargado",
      });
    } catch (error) {
      console.error("Error exporting pending invoices:", error);
      toast({
        title: "Error",
        description: "No se pudo exportar las facturas pendientes",
        variant: "destructive",
      });
    }
  };

  const exportFacturasPagadas = async () => {
    if (!selectedEmpresa) return;
    
    try {
      const response = await axios.get(`${API}/export/facturas-pagadas/${selectedEmpresa.id}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `facturas_pagadas_${selectedEmpresa.nombre.replace(/\s+/g, '_')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "¡Exportación exitosa!",
        description: "Archivo Excel de facturas pagadas descargado",
      });
    } catch (error) {
      console.error("Error exporting paid invoices:", error);
      toast({
        title: "Error",
        description: "No se pudo exportar las facturas pagadas",
        variant: "destructive",
      });
    }
  };

  const exportResumenGeneral = async () => {
    if (!selectedEmpresa) return;
    
    try {
      const response = await axios.get(`${API}/export/resumen-general/${selectedEmpresa.id}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `resumen_general_${selectedEmpresa.nombre.replace(/\s+/g, '_')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "¡Exportación exitosa!",
        description: "Archivo Excel de resumen general descargado",
      });
    } catch (error) {
      console.error("Error exporting general summary:", error);
      toast({
        title: "Error",
        description: "No se pudo exportar el resumen general",
        variant: "destructive",
      });
    }
  };

  // ===== FUNCIONES DE GESTIÓN DE EMPRESAS =====
  const openEditEmpresa = (empresa) => {
    setEmpresaToEdit(empresa);
    setEditEmpresaData({
      nombre: empresa.nombre || "",
      rut_cuit: empresa.rut_cuit || "",
      direccion: empresa.direccion || "",
      telefono: empresa.telefono || "",
      email: empresa.email || ""
    });
    setShowEditEmpresaDialog(true);
  };

  const updateEmpresa = async () => {
    if (!empresaToEdit) return;

    if (!editEmpresaData.nombre.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la empresa es requerido",
        variant: "destructive",
      });
      return;
    }

    try {
      await axios.put(`${API}/empresas/${empresaToEdit.id}`, editEmpresaData);
      
      toast({
        title: "¡Actualizada!",
        description: "Datos de la empresa actualizados correctamente",
      });

      setShowEditEmpresaDialog(false);
      setEmpresaToEdit(null);
      fetchEmpresas();
      
      // Si estamos editando la empresa seleccionada, actualizar la información
      if (selectedEmpresa && selectedEmpresa.id === empresaToEdit.id) {
        setSelectedEmpresa({...empresaToEdit, ...editEmpresaData});
      }
      
    } catch (error) {
      console.error("Error updating empresa:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la empresa",
        variant: "destructive",
      });
    }
  };

  const confirmDeleteEmpresa = (empresa) => {
    setEmpresaToDelete(empresa);
    setShowDeleteEmpresaDialog(true);
  };

  const deleteEmpresa = async () => {
    if (!empresaToDelete) return;

    try {
      const response = await axios.delete(`${API}/empresas/${empresaToDelete.id}`);
      
      toast({
        title: "¡Empresa eliminada!",
        description: `${empresaToDelete.nombre} eliminada correctamente. ${response.data.facturas_eliminadas} facturas eliminadas.`,
      });

      setShowDeleteEmpresaDialog(false);
      setEmpresaToDelete(null);
      fetchEmpresas();
      
      // Si eliminamos la empresa seleccionada, volver al panel principal
      if (selectedEmpresa && selectedEmpresa.id === empresaToDelete.id) {
        backToEmpresas();
      }
      
    } catch (error) {
      console.error("Error deleting empresa:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la empresa",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("es-AR");
  };

  // ===== RENDER CONDICIONAL =====
  if (currentView === "empresas") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-slate-800 mb-4">
              Panel de Gestión Empresarial
            </h1>
            <p className="text-slate-600 text-xl">
              Gestiona las cuentas por pagar de todas tus empresas desde un solo lugar
            </p>
          </div>

          {/* Botón para crear nueva empresa */}
          <div className="mb-8 text-center">
            <Dialog open={showNewEmpresaDialog} onOpenChange={setShowNewEmpresaDialog}>
              <DialogTrigger asChild>
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-5 w-5 mr-2" />
                  Nueva Empresa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Nueva Empresa</DialogTitle>
                  <DialogDescription>
                    Ingresa los datos de la nueva empresa para comenzar a gestionar sus cuentas por pagar.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="nombre">Nombre de la Empresa *</Label>
                    <Input
                      id="nombre"
                      value={newEmpresa.nombre}
                      onChange={(e) => setNewEmpresa({...newEmpresa, nombre: e.target.value})}
                      placeholder="Ej: Mi Empresa S.A."
                    />
                  </div>
                  <div>
                    <Label htmlFor="rut_cuit">RUT/CUIT</Label>
                    <Input
                      id="rut_cuit"
                      value={newEmpresa.rut_cuit}
                      onChange={(e) => setNewEmpresa({...newEmpresa, rut_cuit: e.target.value})}
                      placeholder="Ej: 20-12345678-9"
                    />
                  </div>
                  <div>
                    <Label htmlFor="direccion">Dirección</Label>
                    <Input
                      id="direccion"
                      value={newEmpresa.direccion}
                      onChange={(e) => setNewEmpresa({...newEmpresa, direccion: e.target.value})}
                      placeholder="Ej: Av. Principal 123"
                    />
                  </div>
                  <div>
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input
                      id="telefono"
                      value={newEmpresa.telefono}
                      onChange={(e) => setNewEmpresa({...newEmpresa, telefono: e.target.value})}
                      placeholder="Ej: +54 11 1234-5678"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newEmpresa.email}
                      onChange={(e) => setNewEmpresa({...newEmpresa, email: e.target.value})}
                      placeholder="Ej: contacto@miempresa.com"
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={() => setShowNewEmpresaDialog(false)} className="flex-1">
                      Cancelar
                    </Button>
                    <Button onClick={createEmpresa} className="flex-1">
                      Crear Empresa
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Lista de empresas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {empresas.map((empresa) => (
              <Card 
                key={empresa.id} 
                className="hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-blue-300"
                onClick={() => selectEmpresa(empresa)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Building className="h-8 w-8 text-blue-600" />
                    <ArrowRight className="h-5 w-5 text-slate-400" />
                  </div>
                  <CardTitle className="text-xl">{empresa.nombre}</CardTitle>
                  {empresa.rut_cuit && (
                    <CardDescription>RUT/CUIT: {empresa.rut_cuit}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-slate-600">
                    {empresa.direccion && (
                      <p>📍 {empresa.direccion}</p>
                    )}
                    {empresa.telefono && (
                      <p>📞 {empresa.telefono}</p>
                    )}
                    {empresa.email && (
                      <p>📧 {empresa.email}</p>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button 
                      className="flex-1" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectEmpresa(empresa);
                      }}
                    >
                      Gestionar Cuentas
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditEmpresa(empresa);
                      }}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDeleteEmpresa(empresa);
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
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
              <h3 className="text-xl font-medium text-slate-600 mb-2">
                No hay empresas registradas
              </h3>
              <p className="text-slate-500 mb-6">
                Crea tu primera empresa para comenzar a gestionar las cuentas por pagar
              </p>
            </div>
          )}
        </div>
        <Toaster />
      </div>
    );
  }

  // Vista detalle de empresa (aplicación original adaptada)
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header con información de empresa */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Button variant="outline" onClick={backToEmpresas} className="mb-4">
              ← Volver a Empresas
            </Button>
            <h1 className="text-4xl font-bold text-slate-800 mb-2">
              {selectedEmpresa?.nombre}
            </h1>
            <p className="text-slate-600 text-lg">
              Gestión de Cuentas por Pagar
            </p>
            {selectedEmpresa?.rut_cuit && (
              <p className="text-slate-500">RUT/CUIT: {selectedEmpresa.rut_cuit}</p>
            )}
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

          {/* Tab: Subir PDF */}
          <TabsContent value="upload">
            <Card className="max-w-2xl mx-auto">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <Upload className="h-6 w-6" />
                  Subir Factura PDF
                </CardTitle>
                <CardDescription>
                  Selecciona un archivo PDF de factura para extraer automáticamente los datos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 transition-colors">
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
                      Archivo seleccionado: {selectedFile.name}
                    </p>
                  )}
                </div>
                
                <Button 
                  onClick={handleUpload} 
                  disabled={!selectedFile || uploading}
                  className="w-full"
                  size="lg"
                >
                  {uploading ? "Procesando..." : "Procesar PDF"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Dashboard */}
          <TabsContent value="dashboard">
            {resumenGeneral && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Deuda Total</CardTitle>
                    <DollarSign className="h-4 w-4 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {formatCurrency(resumenGeneral.total_deuda_global)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Facturas</CardTitle>
                    <FileText className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {resumenGeneral.total_facturas}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
                    <Clock className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {resumenGeneral.facturas_pendientes}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pagadas</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {resumenGeneral.facturas_pagadas}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Resumen por Proveedor */}
            {resumenGeneral && resumenGeneral.proveedores.length > 0 && (
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
                        <TableHead>Facturas Pendientes</TableHead>
                        <TableHead>Facturas Pagadas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resumenGeneral.proveedores.map((proveedor, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {proveedor.proveedor}
                          </TableCell>
                          <TableCell className="font-semibold text-orange-600">
                            {formatCurrency(proveedor.total_deuda)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="destructive">
                              {proveedor.facturas_pendientes}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {proveedor.facturas_pagadas}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab: Facturas Pagadas */}
          <TabsContent value="pagadas">
            <div className="space-y-6">
              {/* Resumen de Facturas Pagadas */}
              {estadoCuentaPagadas && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Pagado</CardTitle>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(estadoCuentaPagadas.total_pagado)}
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
                        {estadoCuentaPagadas.cantidad_facturas_pagadas}
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
                        {estadoCuentaPagadas.facturas_por_proveedor.length}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Resumen por Proveedor - Facturas Pagadas */}
              {estadoCuentaPagadas && estadoCuentaPagadas.facturas_por_proveedor.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Pagos por Proveedor
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Proveedor</TableHead>
                          <TableHead>Total Pagado</TableHead>
                          <TableHead>Facturas Pagadas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {estadoCuentaPagadas.facturas_por_proveedor.map((proveedor, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {proveedor.proveedor}
                            </TableCell>
                            <TableCell className="font-semibold text-green-600">
                              {formatCurrency(proveedor.total_deuda)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {proveedor.facturas_pagadas}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Lista Detallada de Facturas Pagadas */}
              {estadoCuentaPagadas && estadoCuentaPagadas.facturas_pagadas.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        Detalle de Facturas Pagadas
                      </CardTitle>
                      <Button 
                        onClick={exportFacturasPagadas}
                        variant="outline"
                        className="text-green-600 hover:text-green-700"
                      >
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Exportar a Excel
                      </Button>
                    </div>
                    <CardDescription>
                      Historial completo de todas las facturas marcadas como pagadas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nº Factura</TableHead>
                          <TableHead>Proveedor</TableHead>
                          <TableHead>Fecha Factura</TableHead>
                          <TableHead>Monto Pagado</TableHead>
                          <TableHead>Archivo</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {estadoCuentaPagadas.facturas_pagadas.map((factura) => (
                          <TableRow key={factura.id}>
                            <TableCell className="font-medium">
                              {factura.numero_factura}
                            </TableCell>
                            <TableCell>{factura.nombre_proveedor}</TableCell>
                            <TableCell>{formatDate(factura.fecha_factura)}</TableCell>
                            <TableCell className="font-semibold text-green-600">
                              {formatCurrency(factura.monto)}
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">
                              {factura.archivo_original || factura.archivo_pdf || "N/A"}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {factura.archivo_pdf && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => downloadInvoicePDF(factura.id, factura.numero_factura)}
                                    className="text-blue-600 hover:text-blue-700"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Mensaje cuando no hay facturas pagadas */}
              {estadoCuentaPagadas && estadoCuentaPagadas.facturas_pagadas.length === 0 && (
                <Card>
                  <CardContent className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-600 mb-2">
                      No hay facturas pagadas
                    </h3>
                    <p className="text-slate-500">
                      Las facturas marcadas como pagadas aparecerán aquí
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Tab: Facturas */}
          <TabsContent value="facturas">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Lista de Facturas</CardTitle>
                  <Button 
                    onClick={exportFacturasPendientes}
                    variant="outline"
                    className="text-green-600 hover:text-green-700"
                  >
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
                      <SelectItem value="todos">Todos los estados</SelectItem>
                      <SelectItem value="pendiente">Pendientes</SelectItem>
                      <SelectItem value="pagado">Pagadas</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Input
                    placeholder="Buscar por proveedor..."
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
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          {invoice.numero_factura}
                        </TableCell>
                        <TableCell>{invoice.nombre_proveedor}</TableCell>
                        <TableCell>{formatDate(invoice.fecha_factura)}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(invoice.monto)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={invoice.estado_pago === "pagado" ? "secondary" : "destructive"}
                          >
                            {invoice.estado_pago}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {invoice.estado_pago === "pendiente" ? (
                              <Button
                                size="sm"
                                onClick={() => updateInvoiceStatus(invoice.id, "pagado")}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Marcar Pagado
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateInvoiceStatus(invoice.id, "pendiente")}
                              >
                                Marcar Pendiente
                              </Button>
                            )}
                            
                            {invoice.archivo_pdf && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadInvoicePDF(invoice.id, invoice.numero_factura)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => confirmDeleteInvoice(invoice)}
                              className="text-red-600 hover:text-red-700"
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
                    No se encontraron facturas con los filtros aplicados
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Resumen */}
          <TabsContent value="resumen">
            {resumenGeneral && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Resumen Financiero General</CardTitle>
                      <Button 
                        onClick={exportResumenGeneral}
                        variant="outline"
                        className="text-green-600 hover:text-green-700"
                      >
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
                          {formatCurrency(resumenGeneral.total_deuda_global)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-slate-600">Total de Facturas</p>
                        <p className="text-3xl font-bold text-slate-800">
                          {resumenGeneral.total_facturas}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6 pt-4 border-t">
                      <div className="space-y-2">
                        <p className="text-sm text-slate-600">Facturas Pendientes</p>
                        <p className="text-2xl font-semibold text-red-600">
                          {resumenGeneral.facturas_pendientes}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-slate-600">Facturas Pagadas</p>
                        <p className="text-2xl font-semibold text-green-600">
                          {resumenGeneral.facturas_pagadas}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {resumenGeneral.proveedores.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Detalle por Proveedor</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {resumenGeneral.proveedores.map((proveedor, index) => (
                          <div 
                            key={index}
                            className="flex justify-between items-center p-4 border rounded-lg"
                          >
                            <div>
                              <h3 className="font-semibold text-slate-800">
                                {proveedor.proveedor}
                              </h3>
                              <p className="text-sm text-slate-600">
                                {proveedor.facturas_pendientes} pendientes, {proveedor.facturas_pagadas} pagadas
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-orange-600">
                                {formatCurrency(proveedor.total_deuda)}
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
      
      {/* Dialog de confirmación para eliminar factura */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro que deseas eliminar la factura{" "}
              <strong>{invoiceToDelete?.numero_factura}</strong> del proveedor{" "}
              <strong>{invoiceToDelete?.nombre_proveedor}</strong>?
              <br />
              <br />
              Esta acción no se puede deshacer y también eliminará el archivo PDF asociado.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(false)} 
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              onClick={deleteInvoice} 
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              Eliminar Factura
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar empresa */}
      <Dialog open={showEditEmpresaDialog} onOpenChange={setShowEditEmpresaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Editar Empresa
            </DialogTitle>
            <DialogDescription>
              Modifica los datos de la empresa {empresaToEdit?.nombre}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_nombre">Nombre de la Empresa *</Label>
              <Input
                id="edit_nombre"
                value={editEmpresaData.nombre}
                onChange={(e) => setEditEmpresaData({...editEmpresaData, nombre: e.target.value})}
                placeholder="Ej: Mi Empresa S.A."
              />
            </div>
            <div>
              <Label htmlFor="edit_rut_cuit">RUT/CUIT</Label>
              <Input
                id="edit_rut_cuit"
                value={editEmpresaData.rut_cuit}
                onChange={(e) => setEditEmpresaData({...editEmpresaData, rut_cuit: e.target.value})}
                placeholder="Ej: 20-12345678-9"
              />
            </div>
            <div>
              <Label htmlFor="edit_direccion">Dirección</Label>
              <Input
                id="edit_direccion"
                value={editEmpresaData.direccion}
                onChange={(e) => setEditEmpresaData({...editEmpresaData, direccion: e.target.value})}
                placeholder="Ej: Av. Principal 123"
              />
            </div>
            <div>
              <Label htmlFor="edit_telefono">Teléfono</Label>
              <Input
                id="edit_telefono"
                value={editEmpresaData.telefono}
                onChange={(e) => setEditEmpresaData({...editEmpresaData, telefono: e.target.value})}
                placeholder="Ej: +54 11 1234-5678"
              />
            </div>
            <div>
              <Label htmlFor="edit_email">Email</Label>
              <Input
                id="edit_email"
                type="email"
                value={editEmpresaData.email}
                onChange={(e) => setEditEmpresaData({...editEmpresaData, email: e.target.value})}
                placeholder="Ej: contacto@miempresa.com"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowEditEmpresaDialog(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={updateEmpresa} className="flex-1">
                Actualizar Empresa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación para eliminar empresa */}
      <Dialog open={showDeleteEmpresaDialog} onOpenChange={setShowDeleteEmpresaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Confirmar Eliminación de Empresa
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro que deseas eliminar la empresa{" "}
              <strong>{empresaToDelete?.nombre}</strong>?
              <br />
              <br />
              <span className="text-red-600 font-semibold">
                ⚠️ ADVERTENCIA: Esta acción eliminará permanentemente:
              </span>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>La empresa y todos sus datos</li>
                <li>Todas las facturas asociadas</li>
                <li>Todos los archivos PDF almacenados</li>
                <li>Todos los reportes y resúmenes</li>
              </ul>
              <br />
              <strong>Esta acción NO se puede deshacer.</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteEmpresaDialog(false)} 
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              onClick={deleteEmpresa} 
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              Eliminar Empresa
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <Toaster />
    </div>
  );
}

export default App;