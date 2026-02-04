import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Package, Search, Plus, Trash2, Send } from 'lucide-react';
import { toast } from 'sonner';

const SolicitarProdutos = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, per_page: 50 });

  const loadCatalog = (page = 1) => {
    setLoading(true);
    api.get('/catalog', { params: { search: search || undefined, page, per_page: 50 } })
      .then((res) => {
        setProducts(res.data?.data ?? []);
        setPagination({
          current_page: res.data?.current_page ?? 1,
          last_page: res.data?.last_page ?? 1,
          per_page: res.data?.per_page ?? 50,
        });
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Erro ao carregar produtos disponíveis'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const handleSearch = (e) => {
    e?.preventDefault();
    loadCatalog(1);
  };

  const addToCart = (product, qty = 1) => {
    const q = Math.max(1, parseInt(qty, 10) || 1);
    const available = product.quantity ?? 0;
    if (q > available) {
      toast.error(`Quantidade disponível: ${available}`);
      return;
    }
    const existing = cart.find((c) => c.asset_id === product.id);
    const newQty = existing ? Math.min(existing.quantity + q, available) : q;
    if (existing) {
      setCart(cart.map((c) => c.asset_id === product.id ? { ...c, quantity: newQty } : c));
    } else {
      setCart([...cart, { asset_id: product.id, quantity: newQty, name: product.name, code: product.code }]);
    }
    toast.success(`${product.name} adicionado à solicitação`);
  };

  const removeFromCart = (assetId) => {
    setCart(cart.filter((c) => c.asset_id !== assetId));
  };

  const updateCartQty = (assetId, qty) => {
    const n = Math.max(1, parseInt(qty, 10) || 1);
    const product = products.find((p) => p.id === assetId);
    const maxQty = product ? product.quantity : 999;
    const clamped = Math.min(n, maxQty);
    setCart(cart.map((c) => c.asset_id === assetId ? { ...c, quantity: clamped } : c));
  };

  const submitRequest = (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      toast.error('Adicione pelo menos um item à solicitação.');
      return;
    }
    setSubmitting(true);
    api.post('/stock-requests', {
      items: cart.map((c) => ({ asset_id: c.asset_id, quantity: c.quantity })),
      notes: notes.trim() || undefined,
    })
      .then(() => {
        toast.success('Solicitação enviada! O almoxarifado será notificado.');
        setCart([]);
        setNotes('');
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Erro ao enviar solicitação'))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Package className="w-8 h-8 text-[#0c4a6e]" />
          Solicitar Produtos
        </h1>
        <p className="text-muted-foreground mt-1">
          Consulte os itens disponíveis em estoque e envie sua solicitação ao responsável pelo almoxarifado.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Catálogo */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Produtos disponíveis</CardTitle>
              <CardDescription>Itens em estoque com quantidade maior que zero</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, código ou marca..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button type="submit" variant="outline">Buscar</Button>
              </form>

              {loading ? (
                <div className="py-12 text-center text-muted-foreground">Carregando...</div>
              ) : products.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">Nenhum produto disponível no momento.</p>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Código</TableHead>
                        <TableHead className="font-semibold">Nome</TableHead>
                        <TableHead className="font-semibold">Categoria</TableHead>
                        <TableHead className="font-semibold text-right">Qtd.</TableHead>
                        <TableHead className="font-semibold text-right">Valor unit.</TableHead>
                        <TableHead className="text-right w-24">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((p) => (
                        <TableRow key={p.id} className="hover:bg-muted/30">
                          <TableCell className="font-mono text-muted-foreground">{p.code ?? '-'}</TableCell>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="text-muted-foreground">{p.category ?? '-'}</TableCell>
                          <TableCell className="text-right">{p.quantity ?? 0}</TableCell>
                          <TableCell className="text-right">
                            R$ {Number(p.value ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => addToCart(p)}
                              className="gap-1"
                            >
                              <Plus className="w-4 h-4" />
                              Solicitar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {pagination.last_page > 1 && (
                <div className="flex justify-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.current_page <= 1}
                    onClick={() => loadCatalog(pagination.current_page - 1)}
                  >
                    Anterior
                  </Button>
                  <span className="flex items-center px-2 text-sm text-muted-foreground">
                    Página {pagination.current_page} de {pagination.last_page}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.current_page >= pagination.last_page}
                    onClick={() => loadCatalog(pagination.current_page + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sua solicitação */}
        <div className="lg:col-span-1">
          <Card className="border-border sticky top-24">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Sua solicitação</CardTitle>
              <CardDescription>Itens que serão enviados ao almoxarifado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Nenhum item adicionado. Use &quot;Solicitar&quot; nos produtos acima.</p>
              ) : (
                <>
                  <ul className="space-y-2 max-h-48 overflow-y-auto">
                    {cart.map((c) => (
                      <li key={c.asset_id} className="flex items-center justify-between gap-2 py-2 border-b border-border last:border-0">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{c.name}</p>
                          {c.code && <p className="text-xs text-muted-foreground">{c.code}</p>}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Input
                            type="number"
                            min={1}
                            className="w-16 h-8 text-center text-sm"
                            value={c.quantity}
                            onChange={(e) => updateCartQty(c.asset_id, e.target.value)}
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => removeFromCart(c.asset_id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações (opcional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Ex: urgente, departamento X..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                  <Button
                    className="w-full gap-2 bg-gradient-to-r from-[#0c4a6e] to-[#1e40af]"
                    onClick={submitRequest}
                    disabled={submitting}
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? 'Enviando...' : 'Enviar solicitação'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SolicitarProdutos;
