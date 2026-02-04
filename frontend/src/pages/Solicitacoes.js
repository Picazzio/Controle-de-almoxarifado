import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { canViewStockRequests } from '../lib/permissions';
import { hasPermission } from '../lib/permissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
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
import { ClipboardList, User, Calendar, Package, ArrowRight, Building2, Printer } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_LABEL = { pendente: 'Pendente', atendida: 'Atendida', cancelada: 'Cancelada' };
const STATUS_VARIANT = { pendente: 'default', atendida: 'secondary', cancelada: 'outline' };

const Solicitações = () => {
  const { user } = useAuth();
  const canViewAll = canViewStockRequests(user);
  const canFulfill = hasPermission(user, 'update');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [fulfilling, setFulfilling] = useState(false);

  const loadRequests = () => {
    setLoading(true);
    const params = canViewAll ? { all: 1, per_page: 50 } : { per_page: 50 };
    api.get('/stock-requests', { params })
      .then((res) => setRequests(res.data?.data ?? []))
      .catch(() => toast.error('Erro ao carregar solicitações'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRequests();
  }, [canViewAll]);

  useEffect(() => {
    const onRefocus = () => loadRequests();
    window.addEventListener('app:refocus', onRefocus);
    return () => window.removeEventListener('app:refocus', onRefocus);
  }, [canViewAll]);

  const printRequest = (req) => {
    const items = (req.items ?? [])
      .map(
        (i) =>
          `<tr><td style="border:1px solid #ddd;padding:8px">${i.asset_code ?? '-'}</td><td style="border:1px solid #ddd;padding:8px">${i.asset_name ?? '-'}</td><td style="border:1px solid #ddd;padding:8px;text-align:right">${i.quantity ?? 0}</td></tr>`
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
        loadRequests();
        toast.success(res.data?.message ?? 'Solicitação atendida.');
        printRequest(updated);
      })
      .catch((err) => {
        toast.error(err.response?.data?.message ?? 'Erro ao atender solicitação.');
      })
      .finally(() => setFulfilling(false));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <ClipboardList className="w-8 h-8 text-[#0c4a6e]" />
          Solicitações de Produtos
        </h1>
        <p className="text-muted-foreground mt-1">
          {canViewAll
            ? 'Todas as solicitações enviadas ao almoxarifado.'
            : 'Suas solicitações enviadas ao almoxarifado.'}
        </p>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Lista de solicitações</CardTitle>
          <CardDescription>
            {canViewAll ? 'Solicitações de todos os usuários' : 'Apenas suas solicitações'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Carregando...</div>
          ) : requests.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Nenhuma solicitação encontrada.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">#</TableHead>
                    {canViewAll && <TableHead className="font-semibold">Solicitante</TableHead>}
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Itens</TableHead>
                    <TableHead className="font-semibold">Data</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
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
                        <Badge variant={STATUS_VARIANT[r.status] || 'outline'}>
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
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: detalhes da solicitação e itens */}
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
                {canViewAll && (
                  <>
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
                  </>
                )}
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
                            <TableCell className="font-mono text-muted-foreground text-sm">{item.asset_code ?? '-'}</TableCell>
                            <TableCell className="text-sm font-medium">{item.asset_name ?? '-'}</TableCell>
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
    </div>
  );
};

export default Solicitações;
