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
import { Upload, FileText, DollarSign, Users, Clock, CheckCircle } from "lucide-react";
import { useToast } from "./hooks/use-toast";
import { Toaster } from "./components/ui/sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [resumenGeneral, setResumenGeneral] = useState(null);
  const [estadoCuentaPagadas, setEstadoCuentaPagadas] = useState(null);
  const [filterEstado, setFilterEstado] = useState("todos");
  const [filterProveedor, setFilterProveedor] = useState("");
  const { toast } = useToast();

  // Cargar datos iniciales
  useEffect(() => {
    fetchInvoices();
    fetchResumenGeneral();
    fetchEstadoCuentaPagadas();
  }, []);

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

  const fetchInvoices = async () => {
    try {
      const response = await axios.get(`${API}/invoices`);
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
    try {
      const response = await axios.get(`${API}/resumen/general`);
      setResumenGeneral(response.data);
    } catch (error) {
      console.error("Error fetching resumen:", error);
    }
  };

  const fetchEstadoCuentaPagadas = async () => {
    try {
      const response = await axios.get(`${API}/estado-cuenta/pagadas`);
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

    setUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await axios.post(`${API}/upload-pdf`, formData, {
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("es-AR");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            Gestión de Cuentas por Pagar
          </h1>
          <p className="text-slate-600 text-lg">
            Sube PDFs de facturas y extrae datos automáticamente con IA
          </p>
        </div>

        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">Subir PDF</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="facturas">Facturas</TabsTrigger>
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

          {/* Tab: Facturas */}
          <TabsContent value="facturas">
            <Card>
              <CardHeader>
                <CardTitle>Lista de Facturas</CardTitle>
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
                    <CardTitle>Resumen Financiero General</CardTitle>
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
      
      <Toaster />
    </div>
  );
}

export default App;