import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { canViewStockRequests } from '../lib/permissions';
import { hasPermission } from '../lib/permissions';
import { Card, CardContent } from '../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import { ClipboardList, User, Calendar, Package, ArrowRight, Building2, Printer, PackageSearch, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import PaginationBar from '../components/PaginationBar';

const STATUS_LABEL = {
  pendente: 'Pendente',
  separation: 'Em Separação',
  atendida: 'Atendida',
  cancelada: 'Cancelada',
};
const STATUS_VARIANT = {
  pendente: 'default',
  separation: 'outline',
  atendida: 'secondary',
  cancelada: 'outline',
};
const STATUS_BADGE_CLASS = {
  pendente: '',
  separation: 'bg-amber-100 text-amber-800 border-amber-200',
  atendida: '',
  cancelada: '',
};

const Solicitações = () => {
  const { user } = useAuth();
  const canViewAll = canViewStockRequests(user);
  const canFulfill = hasPermission(user, 'update');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [fulfilling, setFulfilling] = useState(false);
  const [startingSeparation, setStartingSeparation] = useState(false);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });

  const loadRequests = useCallback((page, perPage) => {
    setLoading(true);
    const params = canViewAll ? { all: 1, page, per_page: perPage } : { page, per_page: perPage };
    api.get('/stock-requests', { params })
      .then((res) => {
        setRequests(res.data?.data ?? []);
        setPagination((prev) => ({
          ...prev,
          current_page: res.data?.current_page ?? 1,
          last_page: res.data?.last_page ?? 1,
          per_page: res.data?.per_page ?? perPage,
          total: res.data?.total ?? 0,
        }));
      })
      .catch(() => toast.error('Erro ao carregar solicitações'))
      .finally(() => setLoading(false));
  }, [canViewAll]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, current_page: 1 }));
  }, [canViewAll]);

  useEffect(() => {
    loadRequests(pagination.current_page, pagination.per_page);
  }, [loadRequests, pagination.current_page, pagination.per_page]);

  useEffect(() => {
    const onRefocus = () => loadRequests(pagination.current_page, pagination.per_page);
    window.addEventListener('app:refocus', onRefocus);
    return () => window.removeEventListener('app:refocus', onRefocus);
  }, [loadRequests, pagination.current_page, pagination.per_page]);

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, current_page: newPage }));
  };

  const handlePerPageChange = (newPerPage) => {
    setPagination((prev) => ({ ...prev, per_page: newPerPage, current_page: 1 }));
  };

  const openPrintWindow = (req, title = 'Solicitação', subtitle = 'Itens solicitados') => {
    const items = (req.items ?? [])
      .map(
        (i) =>
          `<tr><td style="border:1px solid #ddd;padding:8px">${i.product_code ?? '-'}</td><td style="border:1px solid #ddd;padding:8px">${i.product_name ?? '-'}</td><td style="border:1px solid #ddd;padding:8px;text-align:right">${i.quantity ?? 0}</td></tr>`
      )
      .join('');
    const html = `
      <!DOCTYPE html><html><head><meta charset="utf-8"><title>${title} #${req.id}</title></head><body style="font-family:sans-serif;padding:20px">
      <h1>${title} #${req.id}</h1>
      <p><strong>Solicitante:</strong> ${req.user_name ?? '-'} &nbsp;|&nbsp; <strong>Departamento:</strong> ${req.user_department ?? '-'}</p>
      <p><strong>Data:</strong> ${req.created_at ?? '-'} &nbsp;|&nbsp; <strong>Status:</strong> ${STATUS_LABEL[req.status] ?? req.status}</p>
      <h2>${subtitle}</h2>
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

  const printList = (req) => openPrintWindow(req, 'Lista para Separação', 'Itens a separar');
  const printReceipt = (req) => openPrintWindow(req, 'Recibo - Solicitação Atendida', 'Itens entregues');

  const handleStartSeparation = () => {
    if (!selectedRequest || selectedRequest.status !== 'pendente') return;
    setStartingSeparation(true);
    api
      .post(`/stock-requests/${selectedRequest.id}/start-separation`)
      .then((res) => {
        const updated = res.data?.request ?? selectedRequest;
        setSelectedRequest(updated);
        loadRequests(pagination.current_page, pagination.per_page);
        toast.success(res.data?.message ?? 'Separação iniciada.');
      })
      .catch((err) => toast.error(err.response?.data?.message ?? 'Erro ao iniciar separação.'))
      .finally(() => setStartingSeparation(false));
  };

  const handleFinalizar = () => {
    if (!selectedRequest || !['pendente', 'separation'].includes(selectedRequest.status)) return;
    setFulfilling(true);
    api
      .post(`/stock-requests/${selectedRequest.id}/fulfill`)
      .then((res) => {
        const updated = res.data?.request ?? selectedRequest;
        setSelectedRequest(updated);
        loadRequests(pagination.current_page, pagination.per_page);
        toast.success(res.data?.message ?? 'Solicitação atendida.');
      })
      .catch((err) => toast.error(err.response?.data?.message ?? 'Erro ao atender solicitação.'))
      .finally(() => setFulfilling(false));
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in min-h-0" style={{ height: 'calc(100vh - 220px)' }}>
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <ClipboardList className="w-8 h-8 text-[#0c4a6e]" />
          Solicitações de Produtos
        </h1>
      </div>

      <Card className="border-border flex-1 flex flex-col min-h-0">
        <CardContent className="p-6 flex-1 flex flex-col min-h-0 gap-4">
          {loading ? (
            <p className="text-muted-foreground flex-shrink-0">Carregando...</p>
          ) : requests.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground flex-shrink-0">Nenhuma solicitação encontrada.</p>
          ) : (
            <>
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto scrollbar-table border border-border rounded-md" aria-label="Tabela de solicitações com rolagem">
                <div className="min-w-0">
                  <table className="w-full caption-bottom text-sm border-collapse">
                    <thead className="[&_tr]:border-b">
                      <TableRow className="sticky top-0 z-20 border-b border-border bg-background shadow-[0_1px_0_0_hsl(var(--border))] hover:bg-background [&_th]:bg-background [&_th]:shadow-[0_1px_0_0_hsl(var(--border))]">
                        <TableHead className="font-semibold h-10 px-2 bg-background first:rounded-tl-md">#</TableHead>
                        {canViewAll && <TableHead className="font-semibold h-10 px-2 bg-background">Solicitante</TableHead>}
                        <TableHead className="font-semibold h-10 px-2 bg-background">Status</TableHead>
                        <TableHead className="font-semibold h-10 px-2 bg-background">Itens</TableHead>
                        <TableHead className="font-semibold h-10 px-2 bg-background">Data</TableHead>
                        <TableHead className="w-10 h-10 px-2 bg-background last:rounded-tr-md" />
                      </TableRow>
                    </thead>
                    <TableBody>
                      {requests.map((r) => (
                        <TableRow
                          key={r.id}
                          className="hover:bg-muted/30 cursor-pointer"
                          onClick={() => setSelectedRequest(r)}
                        >
                          <TableCell className="font-mono text-muted-foreground">{r.id}</TableCell>
                          {canViewAll && (
                            <TableCell className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              {r.user_name ?? '-'}
                            </TableCell>
                          )}
                          <TableCell>
                            <Badge variant={STATUS_VARIANT[r.status] || 'outline'} className={STATUS_BADGE_CLASS[r.status] ?? ''}>
                              {STATUS_LABEL[r.status] ?? r.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {r.items?.length ?? 0} {r.items?.length === 1 ? 'item' : 'itens'}
                          </TableCell>
                          <TableCell className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            {r.created_at ?? '-'}
                          </TableCell>
                          <TableCell className="w-10">
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </table>
                </div>
              </div>
              <div className="flex-shrink-0">
                <PaginationBar pagination={pagination} onPageChange={handlePageChange} onPerPageChange={handlePerPageChange} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal: detalhes da solicitação e itens */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col overflow-hidden p-0 gap-0">
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[#0c4a6e]" />
              Solicitação #{selectedRequest?.id}
            </DialogTitle>
            <DialogDescription>
              Itens solicitados ao almoxarifado
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="flex flex-col min-h-0 flex-1 overflow-hidden px-6 pb-6">
              <div className="grid grid-cols-2 gap-2 text-sm flex-shrink-0 mb-4">
                {canViewAll && (
                  <>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-4 h-4 flex-shrink-0" />
                      <span>Solicitante:</span>
                      <span className="font-medium text-foreground truncate">{selectedRequest.user_name ?? '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="w-4 h-4 flex-shrink-0" />
                      <span>Departamento:</span>
                      <span className="font-medium text-foreground truncate">{selectedRequest.user_department ?? '-'}</span>
                    </div>
                  </>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>Data:</span>
                  <span className="font-medium text-foreground">{selectedRequest.created_at ?? '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge
                    variant={STATUS_VARIANT[selectedRequest.status] || 'outline'}
                    className={STATUS_BADGE_CLASS[selectedRequest.status] ?? ''}
                  >
                    {STATUS_LABEL[selectedRequest.status] ?? selectedRequest.status}
                  </Badge>
                </div>
              </div>
              {selectedRequest.notes && (
                <div className="text-sm flex-shrink-0 mb-4">
                  <span className="text-muted-foreground">Observações: </span>
                  <span className="text-foreground">{selectedRequest.notes}</span>
                </div>
              )}
              <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
                <p className="text-sm font-medium text-foreground mb-2 flex-shrink-0">Itens solicitados</p>
                <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border border-border scrollbar-thin">
                  <Table className="!overflow-visible">
                    <TableHeader>
                      <TableRow className="bg-muted/50 sticky top-0 z-10 [&_th]:bg-muted/50 [&_th]:shadow-[0_1px_0_0_hsl(var(--border))]">
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
              <div className="flex flex-wrap justify-end gap-2 pt-4 flex-shrink-0 border-t border-border mt-4">
                {canFulfill && selectedRequest.status === 'pendente' && (
                  <Button
                    className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={handleStartSeparation}
                    disabled={startingSeparation}
                  >
                    <PackageSearch className="w-4 h-4" />
                    {startingSeparation ? 'Iniciando...' : 'Separar'}
                  </Button>
                )}
                {canFulfill && selectedRequest.status === 'separation' && (
                  <>
                    <Button variant="outline" className="gap-2" onClick={() => printList(selectedRequest)}>
                      <Printer className="w-4 h-4" />
                      Imprimir Lista
                    </Button>
                    <Button
                      className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={handleFinalizar}
                      disabled={fulfilling}
                    >
                      <CheckCircle className="w-4 h-4" />
                      {fulfilling ? 'Finalizando...' : 'Finalizar'}
                    </Button>
                  </>
                )}
                {selectedRequest.status === 'atendida' && (
                  <Button variant="outline" className="gap-2" onClick={() => printReceipt(selectedRequest)}>
                    <Printer className="w-4 h-4" />
                    Imprimir Recibo
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
    </div>
  );
};

export default Solicitações;
