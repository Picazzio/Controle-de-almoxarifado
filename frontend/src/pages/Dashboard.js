import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { hasPermission } from '../lib/permissions';
import { Package, DollarSign, AlertTriangle, Download, FileImage, ArrowRight, ArrowDownToLine, Send, FileText, Search, ClipboardList, User, Calendar, Building2, Printer } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

const COLORS = ['#0c4a6e', '#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#64748b', '#94a3b8'];

const Dashboard = () => {
  const { user } = useAuth();
  const canViewSolicitations = user?.role === 'Expedição';
  const dashboardRef = useRef(null);
  const productSearchRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [topConsumedProducts, setTopConsumedProducts] = useState([]);
  const [spendingBySector, setSpendingBySector] = useState([]);
  const [movementsTrend, setMovementsTrend] = useState([]);
  const [recentMovements, setRecentMovements] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [selectedSector, setSelectedSector] = useState(null);
  const [sectorConsumptionItems, setSectorConsumptionItems] = useState([]);
  const [sectorConsumptionLoading, setSectorConsumptionLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [fulfilling, setFulfilling] = useState(false);

  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [movementType, setMovementType] = useState('entrada');
  const [productSearch, setProductSearch] = useState('');
  const [productsList, setProductsList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [movementForm, setMovementForm] = useState({ quantity: 1, notes: '', department_id: '', user_id: '' });
  const [movementSubmitting, setMovementSubmitting] = useState(false);

  const loadDashboardStats = useCallback(() => {
    setLoading(true);
    api.get('/dashboard/stats')
      .then((res) => {
        setStats(res.data.stats || null);
        setTopConsumedProducts(res.data.top_consumed_products || []);
        setSpendingBySector(res.data.spending_by_sector || []);
        setMovementsTrend(res.data.movements_trend || []);
        setRecentMovements(res.data.recent_movements || []);
      })
      .catch(() => toast.error('Erro ao carregar dashboard'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadDashboardStats();
  }, [loadDashboardStats]);

  useEffect(() => {
    const onRefocus = () => loadDashboardStats();
    window.addEventListener('app:refocus', onRefocus);
    return () => window.removeEventListener('app:refocus', onRefocus);
  }, [loadDashboardStats]);

  const loadPendingRequests = useCallback(() => {
    if (!canViewSolicitations) return;
    api.get('/stock-requests', { params: { all: 1, per_page: 20 } })
      .then((res) => {
        const list = res.data?.data ?? [];
        setPendingRequests(list.filter((r) => r.status === 'pendente'));
      })
      .catch(() => setPendingRequests([]));
  }, [canViewSolicitations]);

  useEffect(() => {
    const onRefocus = () => loadPendingRequests();
    window.addEventListener('app:refocus', onRefocus);
    return () => window.removeEventListener('app:refocus', onRefocus);
  }, [loadPendingRequests]);

  useEffect(() => {
    loadPendingRequests();
  }, [loadPendingRequests]);

  const canFulfill = hasPermission(user, 'update');

  const STATUS_LABEL = { pendente: 'Pendente', atendida: 'Atendida', cancelada: 'Cancelada' };
  const STATUS_VARIANT = { pendente: 'default', atendida: 'secondary', cancelada: 'outline' };

  const printRequest = (req) => {
    const items = (req.items ?? [])
      .map(
        (i) =>
          `<tr><td style="border:1px solid #ddd;padding:8px">${i.product_code ?? '-'}</td><td style="border:1px solid #ddd;padding:8px">${i.product_name ?? '-'}</td><td style="border:1px solid #ddd;padding:8px;text-align:right">${i.quantity ?? 0}</td></tr>`
      )
      .join('');
    const html = `
      <!DOCTYPE html><html><head><meta charset="utf-8"><title>Solicitação #${req.id}</title></head><body style="font-family:sans-serif;padding:20px">
      <h1>Solicitação #${req.id}</h1>
      <p><strong>Solicitante:</strong> ${req.user_name ?? '-'} &nbsp;|&nbsp; <strong>Departamento:</strong> ${req.user_department ?? '-'}</p>
      <p><strong>Data:</strong> ${req.created_at ?? '-'} &nbsp;|&nbsp; <strong>Status:</strong> ${req.status ?? '-'}</p>
      <h2>Itens solicitados</h2>
      <table style="border-collapse:collapse;width:100%;max-width:400px">
        <thead><tr style="background:#f5f5f5"><th style="border:1px solid #ddd;padding:8px;text-align:left">Código</th><th style="border:1px solid #ddd;padding:8px;text-align:left">Produto</th><th style="border:1px solid #ddd;padding:8px;text-align:right">Qtd</th></tr></thead>
        <tbody>${items}</tbody>
      </table>
      <p style="margin-top:24px;font-size:12px;color:#666">Documento impresso em ${new Date().toLocaleString('pt-BR')}</p>
      </body></html>`;
    const w = window.open('', '_blank');
    if (!w) {
      toast.error('Permita pop-ups para imprimir.');
      return;
    }
    w.document.write(html);
    w.document.close();
    setTimeout(() => {
      w.focus();
      w.print();
      w.onafterprint = () => w.close();
      setTimeout(() => w.close(), 500);
    }, 250);
  };

  const handleImprimirEAtender = () => {
    if (!selectedRequest || selectedRequest.status !== 'pendente') return;
    setFulfilling(true);
    api
      .post(`/stock-requests/${selectedRequest.id}/fulfill`)
      .then((res) => {
        const updated = res.data?.request ?? selectedRequest;
        setSelectedRequest(updated);
        loadPendingRequests();
        toast.success(res.data?.message ?? 'Solicitação atendida.');
        printRequest(updated);
      })
      .catch((err) => {
        toast.error(err.response?.data?.message ?? 'Erro ao atender solicitação.');
      })
      .finally(() => setFulfilling(false));
  };

  const lowStockCount = stats?.low_stock_count ?? 0;
  const statsData = stats ? [
    { title: 'Total de itens (estoque)', value: String(stats.total_items ?? 0), icon: Package, color: 'from-[#0c4a6e] to-[#1e40af]', href: '/products' },
    { title: 'Valor total do estoque', value: `R$ ${Number(stats.total_value ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, icon: DollarSign, color: 'from-emerald-600 to-emerald-500', href: '/products' },
    { title: 'Reposição urgente', value: String(lowStockCount), icon: AlertTriangle, color: lowStockCount > 0 ? 'from-red-600 to-red-500' : 'from-slate-500 to-slate-400', href: '/products', isAlert: lowStockCount > 0 }
  ] : [
    { title: 'Total de itens (estoque)', value: '-', icon: Package, color: 'from-[#0c4a6e] to-[#1e40af]', href: '/products' },
    { title: 'Valor total do estoque', value: '-', icon: DollarSign, color: 'from-emerald-600 to-emerald-500', href: '/products' },
    { title: 'Reposição urgente', value: '-', icon: AlertTriangle, color: 'from-slate-500 to-slate-400', href: '/products' }
  ];

  const topConsumedData = topConsumedProducts.length ? topConsumedProducts : [{ name: 'Nenhum dado', quantidade: 0 }];
  const spendingBySectorData = spendingBySector.length ? spendingBySector.map((d, i) => ({ ...d, color: d.color || COLORS[i % COLORS.length] })) : [{ name: 'Nenhum dado', value: 0, color: '#94a3b8' }];

  useEffect(() => {
    if (!selectedSector?.department_id) {
      setSectorConsumptionItems([]);
      return;
    }
    setSectorConsumptionLoading(true);
    api.get('/dashboard/sector-consumption', { params: { department_id: selectedSector.department_id } })
      .then((res) => setSectorConsumptionItems(res.data?.items ?? []))
      .catch(() => setSectorConsumptionItems([]))
      .finally(() => setSectorConsumptionLoading(false));
  }, [selectedSector?.department_id]);
  const trendData = movementsTrend.length ? movementsTrend : [{ label: '-', compras: 0, consumo: 0 }];

  const openMovementModal = (type) => {
    setMovementType(type);
    setProductSearch('');
    setSelectedProduct(null);
    setMovementForm({ quantity: 1, notes: '', department_id: '', user_id: user?.id ? String(user.id) : '' });
    setMovementModalOpen(true);
    api.get('/products', { params: { per_page: 200 } }).then((res) => {
      setProductsList(res.data?.data || []);
    }).catch(() => setProductsList([]));
    if (type === 'saida') {
      api.get('/departments').then((res) => setDepartments(res.data || [])).catch(() => setDepartments([]));
      api.get('/users', { params: { per_page: 200 } }).then((res) => setUsersList(res.data?.data || [])).catch(() => setUsersList([]));
    }
    setTimeout(() => productSearchRef.current?.focus(), 300);
  };

  const filteredProducts = productSearch.trim()
    ? productsList.filter((p) => {
        const s = productSearch.toLowerCase();
        return (p.name && p.name.toLowerCase().includes(s)) || (p.code && p.code.toString().includes(s)) || (p.brand && p.brand.toLowerCase().includes(s));
      })
    : productsList;

  const handleMovementSubmit = (e) => {
    e.preventDefault();
    if (!selectedProduct) {
      toast.error('Selecione um produto.');
      return;
    }
    setMovementSubmitting(true);
    if (movementType === 'entrada') {
      const qty = Math.max(1, parseInt(movementForm.quantity, 10) || 1);
      api.post(`/products/${selectedProduct.id}/entry`, { quantity: qty, notes: movementForm.notes || null })
        .then(() => {
          toast.success('Entrada registrada!');
          setMovementModalOpen(false);
          api.get('/dashboard/stats').then((res) => {
            setStats(res.data.stats || null);
            setRecentMovements(res.data.recent_movements || []);
            setMovementsTrend(res.data.movements_trend || []);
          });
        })
        .catch((err) => toast.error(err.response?.data?.message || 'Erro ao registrar entrada.'))
        .finally(() => setMovementSubmitting(false));
    } else {
      if (!movementForm.department_id || !movementForm.user_id) {
        toast.error('Selecione o departamento e o responsável.');
        setMovementSubmitting(false);
        return;
      }
      const qty = Math.max(1, parseInt(movementForm.quantity, 10) || 1);
      if (qty > (selectedProduct.quantity ?? 0)) {
        toast.error('Quantidade indisponível em estoque.');
        setMovementSubmitting(false);
        return;
      }
      api.post(`/products/${selectedProduct.id}/withdraw`, {
        department_id: Number(movementForm.department_id),
        user_id: Number(movementForm.user_id),
        quantity: qty,
        notes: movementForm.notes || null,
      })
        .then(() => {
          toast.success('Saída registrada!');
          setMovementModalOpen(false);
          api.get('/dashboard/stats').then((res) => {
            setStats(res.data.stats || null);
            setRecentMovements(res.data.recent_movements || []);
            setMovementsTrend(res.data.movements_trend || []);
          });
        })
        .catch((err) => toast.error(err.response?.data?.message || 'Erro ao registrar saída.'))
        .finally(() => setMovementSubmitting(false));
    }
  };

  const downloadLowStockReport = () => {
    api.get('/dashboard/low-stock-report')
      .then((res) => {
        const data = res.data || [];
        const headers = ['Código', 'Nome', 'Marca', 'Categoria', 'Qtd. atual', 'Estoque mín.', 'Valor unit.', 'Localização'];
        const rows = data.map((p) => [
          p.code ?? '',
          p.name ?? '',
          p.brand ?? '',
          p.category ?? '',
          p.quantity ?? 0,
          p.estoque_minimo ?? 0,
          p.value ?? 0,
          p.location ?? '',
        ]);
        const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `solicitacao-compra-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Relatório baixado!');
      })
      .catch(() => toast.error('Erro ao gerar relatório.'));
  };

  const downloadAsPDF = async () => {
    setDownloading(true);
    toast.info('Gerando PDF...');
    
    try {
      const element = dashboardRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f8fafc'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`dashboard-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast.success('PDF baixado com sucesso!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF');
    } finally {
      setDownloading(false);
    }
  };

  const downloadAsImage = async () => {
    setDownloading(true);
    toast.info('Gerando imagem...');
    
    try {
      const element = dashboardRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f8fafc'
      });
      
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `dashboard-${new Date().toISOString().split('T')[0]}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Imagem baixada com sucesso!');
      });
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Erro ao gerar imagem');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando dados...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Visão geral do estoque e movimentações</p>
        </div>
        <div className="flex gap-2">
          <Button
            data-testid="download-image-btn"
            onClick={downloadAsImage}
            disabled={downloading}
            variant="outline"
            className="flex items-center gap-2 border-border hover:bg-muted"
          >
            <FileImage className="w-4 h-4" />
            Baixar Imagem
          </Button>
          <Button
            data-testid="download-pdf-btn"
            onClick={downloadAsPDF}
            disabled={downloading}
            className="flex items-center gap-2 bg-gradient-to-r from-[#0c4a6e] to-[#1e40af] hover:from-[#0c4a6e] hover:to-[#1e3a8a]"
          >
            <Download className="w-4 h-4" />
            Baixar PDF
          </Button>
        </div>
      </div>

      {/* Dashboard Content */}
      <div ref={dashboardRef} className="space-y-6 p-6 bg-card border border-border rounded-xl">
        {/* Stats Cards + Ações Rápidas (4º card) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsData.map((stat, index) => {
            const Icon = stat.icon;
            const isAlert = stat.isAlert;
            const card = (
              <Card className={`stat-card border-border hover:border-primary/30 ${isAlert ? 'border-red-200 bg-red-50/50 dark:bg-red-950/20' : ''}`} data-testid={`stat-card-${index}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium mb-1 ${isAlert ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>{stat.title}</p>
                      <p className={`text-2xl font-bold truncate ${isAlert ? 'text-red-700 dark:text-red-300' : 'text-foreground'}`}>{stat.value}</p>
                      {isAlert && <p className="text-xs text-red-600 dark:text-red-400 mt-1">Itens abaixo do estoque mínimo</p>}
                    </div>
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg flex-shrink-0 ml-2`}>
                      <Icon className={`w-7 h-7 ${isAlert ? 'text-red-100' : 'text-white'}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
            return (
              <div key={index}>
                {stat.href ? <Link to={stat.href} className="block hover:opacity-95 transition-opacity">{card}</Link> : card}
              </div>
            );
          })}
          {/* 4º card: Ações Rápidas */}
          <Card className="stat-card border-border hover:border-primary/30" data-testid="quick-actions-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium mb-1 text-muted-foreground">Ações Rápidas</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => openMovementModal('entrada')}
                          className="w-14 h-14 rounded-xl border border-border bg-background flex items-center justify-center hover:border-primary/30 hover:bg-muted/50 transition-all"
                        >
                          <ArrowDownToLine className="w-7 h-7 text-muted-foreground stroke-[1.5]" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        Entrada
                      </TooltipContent>
                    </UITooltip>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => openMovementModal('saida')}
                          className="w-14 h-14 rounded-xl border border-border bg-background flex items-center justify-center hover:border-primary/30 hover:bg-muted/50 transition-all"
                        >
                          <Send className="w-7 h-7 text-muted-foreground stroke-[1.5]" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        Saída
                      </TooltipContent>
                    </UITooltip>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={downloadLowStockReport}
                          className="w-14 h-14 rounded-xl border border-border bg-background flex items-center justify-center hover:border-primary/30 hover:bg-muted/50 transition-all"
                        >
                          <FileText className="w-7 h-7 text-muted-foreground stroke-[1.5]" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        Relatório de itens mínimos
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Barras horizontais - Top 5 Produtos Mais Consumidos */}
          <Card className="border-border" data-testid="bar-chart-card">
            <CardHeader>
              <CardTitle className="text-foreground">Top 5 produtos mais consumidos</CardTitle>
              <CardDescription>Maior quantidade de saída neste mês</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topConsumedData} layout="vertical" margin={{ left: 80, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" style={{ fontSize: '12px' }} />
                  <YAxis type="category" dataKey="name" width={80} stroke="#64748b" style={{ fontSize: '11px' }} tick={{ fill: '#64748b' }} />
                  <Tooltip
                    formatter={(value) => [value, 'Qtd. saída']}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar dataKey="quantidade" fill="#1e40af" radius={[0, 4, 4, 0]} name="Quantidade" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Expedição: Solicitações pendentes | Outros: Gastos por Departamento */}
          {canViewSolicitations ? (
            <Card className="border-border" data-testid="pending-requests-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-[#0c4a6e]" />
                      Solicitações pendentes
                    </CardTitle>
                    <CardDescription>Atenda às solicitações de produtos no almoxarifado</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/solicitacoes" className="flex items-center gap-1">
                      Ver todas <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {pendingRequests.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-8 text-center">Nenhuma solicitação pendente.</p>
                ) : (
                  <ul className="space-y-3">
                    {pendingRequests.slice(0, 5).map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedRequest(r)}
                          className="w-full flex items-center justify-between gap-4 py-2.5 px-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group text-left"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <ClipboardList className="w-4 h-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate">
                                Solicitação #{r.id}
                              </p>
                              <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                <User className="w-3 h-3" />
                                {r.user_name ?? '-'}
                                {r.user_department && (
                                  <span className="text-muted-foreground/80">· {r.user_department}</span>
                                )}
                                <Calendar className="w-3 h-3 ml-1" />
                                {r.created_at ?? '-'}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded flex-shrink-0">
                            {r.items?.length ?? 0} {r.items?.length === 1 ? 'item' : 'itens'}
                          </span>
                          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border" data-testid="pie-chart-card">
              <CardHeader>
                <CardTitle className="text-foreground">Gastos por departamento</CardTitle>
                <CardDescription>Valor (R$) das saídas por departamento neste mês (top 5). Clique em uma fatia para ver os consumos.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={spendingBySectorData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      labelLine={false}
                      label={({ name, value, percent }) => value > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                      fill="#8884d8"
                      dataKey="value"
                      onClick={(entry) => {
                        if (entry?.department_id != null && (entry?.value ?? 0) > 0) setSelectedSector(entry);
                      }}
                    >
                      {spendingBySectorData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Valor']}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Movimentação por mês (esquerda) + Últimas movimentações (direita) */}
          <Card className="border-border" data-testid="line-chart-card">
            <CardHeader>
              <CardTitle className="text-foreground">Movimentação por mês</CardTitle>
              <CardDescription>Compras (entradas) e consumo (saídas) em R$ nos últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                  <Tooltip
                    formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="compras" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 4 }} activeDot={{ r: 6 }} name="Compras" />
                  <Line type="monotone" dataKey="consumo" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 4 }} activeDot={{ r: 6 }} name="Consumo" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Últimas movimentações */}
          <Card className="border-border" data-testid="recent-movements-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-foreground">Últimas movimentações</CardTitle>
                  <CardDescription>Entradas e saídas recentes no estoque</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/products" className="flex items-center gap-1">
                    Ver produtos <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentMovements.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">Nenhuma movimentação recente.</p>
              ) : (
                <ul className="space-y-3">
                  {recentMovements.slice(0, 4).map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-3 min-w-0">
                        {m.type === 'entrada' ? (
                          <ArrowDownToLine className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <Send className="w-5 h-5 text-amber-600 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {m.product_name}
                            {m.product_code ? <span className="text-muted-foreground font-normal ml-1">({m.product_code})</span> : ''}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {m.type_label} · Qtd: {m.quantity}
                            {m.department_name && ` · ${m.department_name}`}
                            {' · '}{m.movement_date}
                            {m.user_name && ` · ${m.user_name}`}
                          </p>
                        </div>
                      </div>
                      <Link
                        to={`/products`}
                        className="text-sm text-primary hover:underline flex-shrink-0 flex items-center gap-1"
                      >
                        Ver <ArrowRight className="w-3 h-3" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal: consumos do setor (Gastos por departamento) */}
      <Dialog open={!!selectedSector} onOpenChange={(open) => !open && setSelectedSector(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#0c4a6e]" />
              Consumos do setor: {selectedSector?.name}
            </DialogTitle>
            <DialogDescription>
              Saídas (retiradas) para este departamento no mês atual. Total: R$ {selectedSector?.value != null ? Number(selectedSector.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
            </DialogDescription>
          </DialogHeader>
          {selectedSector && (
            <div className="space-y-4">
              {sectorConsumptionLoading ? (
                <div className="py-8 text-center text-muted-foreground">Carregando...</div>
              ) : sectorConsumptionItems.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">Nenhum consumo registrado para este setor no mês.</p>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold text-xs">Código</TableHead>
                        <TableHead className="font-semibold text-xs">Produto</TableHead>
                        <TableHead className="font-semibold text-xs text-right">Qtd</TableHead>
                        <TableHead className="font-semibold text-xs text-right">Valor un.</TableHead>
                        <TableHead className="font-semibold text-xs text-right">Valor total</TableHead>
                        <TableHead className="font-semibold text-xs">Data</TableHead>
                        <TableHead className="font-semibold text-xs">Responsável</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sectorConsumptionItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-muted-foreground text-sm">{item.product_code ?? '-'}</TableCell>
                          <TableCell className="text-sm font-medium">{item.product_name ?? '-'}</TableCell>
                          <TableCell className="text-right text-sm">{item.quantity ?? 0}</TableCell>
                          <TableCell className="text-right text-sm">R$ {Number(item.unit_value ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right text-sm">R$ {Number(item.total_value ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{item.movement_date ?? '-'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{item.user_name ?? '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setSelectedSector(null)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: detalhes da solicitação (atender no Dashboard) */}
      {canViewSolicitations && (
        <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#0c4a6e]" />
                Solicitação #{selectedRequest?.id}
              </DialogTitle>
              <DialogDescription>
                Itens solicitados ao almoxarifado
              </DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span>Solicitante:</span>
                    <span className="font-medium text-foreground truncate">{selectedRequest.user_name ?? '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="w-4 h-4" />
                    <span>Departamento:</span>
                    <span className="font-medium text-foreground truncate">{selectedRequest.user_department ?? '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Data:</span>
                    <span className="font-medium text-foreground">{selectedRequest.created_at ?? '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={STATUS_VARIANT[selectedRequest.status] || 'outline'}>
                      {STATUS_LABEL[selectedRequest.status] ?? selectedRequest.status}
                    </Badge>
                  </div>
                </div>
                {selectedRequest.notes && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Observações: </span>
                    <span className="text-foreground">{selectedRequest.notes}</span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Itens solicitados</p>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-semibold text-xs">Código</TableHead>
                          <TableHead className="font-semibold text-xs">Produto</TableHead>
                          <TableHead className="font-semibold text-xs text-right w-20">Qtd</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(selectedRequest.items ?? []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground text-sm py-4">
                              Nenhum item
                            </TableCell>
                          </TableRow>
                        ) : (
                          (selectedRequest.items ?? []).map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-mono text-muted-foreground text-sm">{item.product_code ?? '-'}</TableCell>
                              <TableCell className="text-sm font-medium">{item.product_name ?? '-'}</TableCell>
                              <TableCell className="text-right text-sm">{item.quantity ?? 0}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  {canFulfill && selectedRequest.status === 'pendente' && (
                    <Button
                      className="gap-2"
                      onClick={handleImprimirEAtender}
                      disabled={fulfilling}
                    >
                      <Printer className="w-4 h-4" />
                      {fulfilling ? 'Atendendo...' : 'Imprimir e Atender'}
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Movimentação (Entrada/Saída Rápida) */}
      <Dialog open={movementModalOpen} onOpenChange={setMovementModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {movementType === 'entrada' ? (
                <>
                  <ArrowDownToLine className="w-5 h-5 text-emerald-600" />
                  Entrada rápida
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 text-amber-600" />
                  Saída rápida
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {movementType === 'entrada'
                ? 'Registre a entrada de itens no almoxarifado.'
                : 'Registre a saída para um departamento e responsável.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMovementSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Buscar produto</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  ref={productSearchRef}
                  placeholder="Nome, código ou marca..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {productSearch.trim() && (
                <ul className="border border-border rounded-md max-h-40 overflow-auto bg-card">
                  {filteredProducts.slice(0, 8).map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProduct(p);
                          setProductSearch(p.name || '');
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${selectedProduct?.id === p.id ? 'bg-primary/10 text-primary' : ''}`}
                      >
                        {p.name}
                        {p.code && <span className="text-muted-foreground ml-1">({p.code})</span>}
                        {p.quantity != null && <span className="text-muted-foreground ml-1">· Qtd: {p.quantity}</span>}
                      </button>
                    </li>
                  ))}
                  {filteredProducts.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">Nenhum produto encontrado</li>}
                </ul>
              )}
              {selectedProduct && (
                <p className="text-sm text-muted-foreground">
                  Selecionado: <strong>{selectedProduct.name}</strong>
                  {selectedProduct.code && ` (${selectedProduct.code})`}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="mov-qty">Quantidade</Label>
              <Input
                id="mov-qty"
                type="number"
                min="1"
                value={movementForm.quantity}
                onChange={(e) => setMovementForm((prev) => ({ ...prev, quantity: e.target.value }))}
              />
            </div>
            {movementType === 'saida' && (
              <>
                <div className="space-y-2">
                  <Label>Departamento</Label>
                  <Select
                    value={movementForm.department_id ? String(movementForm.department_id) : ''}
                    onValueChange={(v) => setMovementForm((prev) => ({ ...prev, department_id: v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione o departamento" /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Responsável</Label>
                  <Select
                    value={movementForm.user_id ? String(movementForm.user_id) : ''}
                    onValueChange={(v) => setMovementForm((prev) => ({ ...prev, user_id: v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione o responsável" /></SelectTrigger>
                    <SelectContent>
                      {usersList.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="mov-notes">Observações (opcional)</Label>
              <Input
                id="mov-notes"
                value={movementForm.notes}
                onChange={(e) => setMovementForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Ex: NF 123, motivo..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setMovementModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={movementSubmitting}>
                {movementSubmitting ? 'Salvando...' : movementType === 'entrada' ? 'Registrar entrada' : 'Registrar saída'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;