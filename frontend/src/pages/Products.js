import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { canCreateProducts, canUpdateProducts, canDeleteProducts, canExportData } from '../lib/permissions';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { SortableTableHead } from '../components/ui/sortable-table-head';
import { Badge } from '../components/ui/badge';
import { Plus, Search, Edit, Trash2, Filter, Download, Package, Send, ArrowDownToLine } from 'lucide-react';
import { toast } from 'sonner';
import PaginationBar from '../components/PaginationBar';

const STATUS_OPTIONS = [
  { label: 'Disponível', value: 'disponivel' },
  { label: 'Em Uso', value: 'em_uso' },
  { label: 'Manutenção', value: 'manutencao' },
  { label: 'Descartado', value: 'descartado' },
];

/** Formulário de item do almoxarifado */
function ProductForm({
  formData,
  onInputChange,
  onFieldChange,
  categories,
  departments,
  onSubmit,
  submitText,
  isEditing,
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome do item</Label>
          <Input
            id="name"
            data-testid="product-name-input"
            name="name"
            value={formData.name}
            onChange={onInputChange}
            required
            placeholder="Ex: Papel A4, Caneta, Toner"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="brand">Marca</Label>
          <Input
            id="brand"
            data-testid="product-brand-input"
            name="brand"
            value={formData.brand ?? ''}
            onChange={onInputChange}
            placeholder="Ex: Faber-Castell, HP"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Categoria</Label>
          <Select value={String(formData.category_id)} onValueChange={(value) => onFieldChange('category_id', value)}>
            <SelectTrigger data-testid="product-category-select">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {!isEditing ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade inicial</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min="0"
                value={formData.quantity}
                onChange={onInputChange}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estoque_minimo">Estoque mínimo</Label>
              <Input
                id="estoque_minimo"
                name="estoque_minimo"
                type="number"
                min="0"
                value={formData.estoque_minimo ?? 0}
                onChange={onInputChange}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">Alerta no dashboard quando saldo ficar abaixo</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Valor unitário (R$)</Label>
              <Input
                id="value"
                data-testid="product-value-input"
                name="value"
                type="number"
                step="0.01"
                min="0"
                value={formData.value}
                onChange={onInputChange}
                required
                placeholder="0.00"
              />
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="estoque_minimo">Estoque mínimo</Label>
              <Input
                id="estoque_minimo"
                name="estoque_minimo"
                type="number"
                min="0"
                value={formData.estoque_minimo ?? 0}
                onChange={onInputChange}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">Alerta no dashboard quando saldo ficar abaixo</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Valor unitário (R$)</Label>
              <Input
                id="value"
                data-testid="product-value-input"
                name="value"
                type="number"
                step="0.01"
                min="0"
                value={formData.value}
                onChange={onInputChange}
                required
                placeholder="0.00"
              />
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="location">Localização (departamento)</Label>
          <Select
            value={formData.department_id === '' || formData.department_id == null ? '' : String(formData.department_id)}
            onValueChange={(value) => onFieldChange('department_id', value)}
          >
            <SelectTrigger data-testid="product-location-select">
              <SelectValue placeholder="Selecione o departamento" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={String(dept.id)}>{dept.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(value) => onFieldChange('status', value)}>
            <SelectTrigger data-testid="product-status-select">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição (opcional)</Label>
        <Textarea
          id="description"
          data-testid="product-description-input"
          name="description"
          value={formData.description}
          onChange={onInputChange}
          placeholder="Detalhes do item..."
          rows={2}
        />
      </div>

      <Button type="submit" data-testid="product-form-submit-btn" className="w-full bg-gradient-to-r from-[#0c4a6e] to-[#1e40af]">
        {submitText}
      </Button>
    </form>
  );
}

const Products = () => {
  const { user } = useAuth();
  const canCreate = canCreateProducts(user);
  const canUpdate = canUpdateProducts(user);
  const canDelete = canDeleteProducts(user);
  const canExport = canExportData(user);
  const readOnly = !canUpdate && !canDelete;
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [withdrawProduct, setWithdrawProduct] = useState(null);
  const [entryProduct, setEntryProduct] = useState(null);
  const [withdrawForm, setWithdrawForm] = useState({ department_id: '', user_id: '', quantity: 1, notes: '' });
  const [entryForm, setEntryForm] = useState({ quantity: 1, notes: '' });
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    category_id: '',
    department_id: '',
    value: '',
    status: 'disponivel',
    quantity: 0,
    estoque_minimo: 0,
    description: ''
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const DEFAULT_PER_PAGE = 15;
  const PER_PAGE_OPTIONS = [15, 25, 50, 100];
  const [pagination, setPagination] = useState(() => {
    const saved = localStorage.getItem('products-per-page');
    const perPage = saved ? parseInt(saved, 10) : DEFAULT_PER_PAGE;
    const valid = PER_PAGE_OPTIONS.includes(perPage) ? perPage : DEFAULT_PER_PAGE;
    return {
      current_page: 1,
      last_page: 1,
      per_page: valid,
      total: 0,
    };
  });

  const loadProducts = useCallback((page, perPage) => {
    const params = { page, per_page: perPage, sort_by: sortBy, sort_dir: sortDir };
    if (searchTerm) params.search = searchTerm;
    if (filterCategory !== 'all') params.category_id = filterCategory;
    return api.get('/products', { params }).then((res) => {
      setProducts(res.data.data || []);
      setPagination((prev) => ({
        ...prev,
        current_page: res.data.current_page ?? 1,
        last_page: res.data.last_page ?? 1,
        total: res.data.total ?? 0,
      }));
    });
  }, [searchTerm, filterCategory, sortBy, sortDir]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, current_page: 1 }));
  }, [searchTerm, filterCategory]);

  useEffect(() => {
    setLoading(true);
    loadProducts(pagination.current_page, pagination.per_page).finally(() => setLoading(false));
  }, [loadProducts, pagination.current_page, pagination.per_page]);

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, current_page: newPage }));
  };

  const handlePerPageChange = (newPerPage) => {
    localStorage.setItem('products-per-page', String(newPerPage));
    setPagination((prev) => ({ ...prev, per_page: newPerPage, current_page: 1 }));
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  };

  useEffect(() => {
    Promise.all([
      api.get('/categories').then((res) => setCategories(res.data || [])),
      api.get('/departments').then((res) => setDepartments(res.data || [])),
      api.get('/users', { params: { per_page: 200 } })
        .then((res) => setUsers(res.data?.data || []))
        .catch(() => setUsers([])),
    ]).finally(() => setLoading(false));
  }, []);

  const refetchProducts = useCallback(() => {
    loadProducts(pagination.current_page, pagination.per_page);
  }, [loadProducts, pagination.current_page, pagination.per_page]);

  useEffect(() => {
    const onRefocus = () => refetchProducts();
    window.addEventListener('app:refocus', onRefocus);
    return () => window.removeEventListener('app:refocus', onRefocus);
  }, [refetchProducts]);

  const handleAddProduct = (e) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      brand: formData.brand || null,
      category_id: Number(formData.category_id),
      department_id: formData.department_id ? Number(formData.department_id) : null,
      value: parseFloat(formData.value),
      status: formData.status,
      quantity: Math.max(0, parseInt(formData.quantity, 10) || 0),
      description: formData.description || null,
    };
    api.post('/products', payload)
      .then(() => {
        setFormData({ name: '', brand: '', category_id: '', department_id: '', value: '', status: 'disponivel', quantity: 0, description: '' });
        setIsAddDialogOpen(false);
        refetchProducts();
        toast.success('Item cadastrado no almoxarifado!');
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Erro ao cadastrar.'));
  };

  const handleEditProduct = (e) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      brand: formData.brand || null,
      category_id: Number(formData.category_id),
      department_id: formData.department_id ? Number(formData.department_id) : null,
      value: parseFloat(formData.value),
      status: formData.status,
      estoque_minimo: Math.max(0, parseInt(formData.estoque_minimo, 10) || 0),
      description: formData.description || null,
    };
    api.put(`/products/${editingProduct.id}`, payload)
      .then(() => {
        setIsEditDialogOpen(false);
        setEditingProduct(null);
        setFormData({ name: '', brand: '', category_id: '', department_id: '', value: '', status: 'disponivel', quantity: 0, estoque_minimo: 0, description: '' });
        refetchProducts();
        toast.success('Item atualizado!');
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Erro ao atualizar.'));
  };

  const openDeleteDialog = (product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!productToDelete) return;
    setDeleting(true);
    api.delete(`/products/${productToDelete.id}`)
      .then(() => {
        setDeleteDialogOpen(false);
        setProductToDelete(null);
        const isLastOnPage = products.length === 1 && pagination.current_page > 1;
        if (isLastOnPage) {
          setPagination((prev) => ({ ...prev, current_page: prev.current_page - 1 }));
        } else {
          loadProducts(pagination.current_page, pagination.per_page);
        }
        toast.success('Item removido do almoxarifado!');
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Erro ao remover.'))
      .finally(() => setDeleting(false));
  };

  const openEditDialog = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      brand: product.brand ?? '',
      category_id: String(product.category_id ?? ''),
      department_id: product.department_id ? String(product.department_id) : '',
      value: String(product.value ?? ''),
      status: product.status_key || product.status || 'disponivel',
      quantity: product.quantity ?? 0,
      estoque_minimo: product.estoque_minimo ?? 0,
      description: product.description || ''
    });
    setIsEditDialogOpen(true);
  };

  const openEntryDialog = (product) => {
    setEntryProduct(product);
    setEntryForm({ quantity: 1, notes: '' });
    setIsEntryDialogOpen(true);
  };

  const openWithdrawDialog = (product) => {
    setWithdrawProduct(product);
    const currentUserId = user?.id ? String(user.id) : '';
    setWithdrawForm({ department_id: '', user_id: currentUserId, quantity: 1, notes: '' });
    setIsWithdrawDialogOpen(true);
  };

  const withdrawUserOptions = users.length > 0 ? users : (user?.id ? [{ id: user.id, name: user.name, email: user.email }] : []);

  const handleWithdraw = (e) => {
    e.preventDefault();
    if (!withdrawProduct) return;
    if (!withdrawForm.department_id || !withdrawForm.user_id) {
      toast.error('Selecione o departamento destino e o responsável.');
      return;
    }
    const qty = Math.max(1, parseInt(withdrawForm.quantity, 10) || 1);
    if (qty > (withdrawProduct.quantity ?? 0)) {
      toast.error('Quantidade indisponível em estoque.');
      return;
    }
    api.post(`/products/${withdrawProduct.id}/withdraw`, {
      department_id: Number(withdrawForm.department_id),
      user_id: Number(withdrawForm.user_id),
      quantity: qty,
      notes: withdrawForm.notes || null,
    })
      .then(() => {
        setIsWithdrawDialogOpen(false);
        setWithdrawProduct(null);
        refetchProducts();
        toast.success('Expedição registrada para o departamento!');
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Erro ao expedir.'));
  };

  const handleEntry = (e) => {
    e.preventDefault();
    if (!entryProduct) return;
    const qty = Math.max(1, parseInt(entryForm.quantity, 10) || 1);
    api.post(`/products/${entryProduct.id}/entry`, {
      quantity: qty,
      notes: entryForm.notes || null,
    })
      .then(() => {
        setIsEntryDialogOpen(false);
        setEntryProduct(null);
        refetchProducts();
        toast.success('Entrada de estoque registrada!');
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Erro ao registrar entrada.'));
  };

  const filteredProducts = products;

  const handleInputChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getStatusColor = (status) => {
    const s = status || '';
    if (s.includes('Uso') || s === 'em_uso') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (s.includes('Dispon') || s === 'disponivel') return 'bg-blue-100 text-blue-700 border-blue-200';
    if (s.includes('Manuten') || s === 'manutencao') return 'bg-amber-100 text-amber-700 border-amber-200';
    if (s.includes('Descart') || s === 'descartado') return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-muted text-foreground border-border';
  };

  const exportToCSV = () => {
    const headers = ['Código', 'Nome', 'Marca', 'Categoria', 'Valor unit.', 'Valor total', 'Quantidade', 'Localização'];
    const csvData = filteredProducts.map(p => [
      p.code ?? '',
      p.name,
      p.brand ?? '',
      p.category,
      p.value,
      p.value_total ?? (Number(p.value) * (p.quantity ?? 0)),
      p.quantity ?? 0,
      p.location ?? '-'
    ]);
    
    const csv = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `almoxarifado-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado com sucesso!');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Package className="w-8 h-8 text-[#0c4a6e]" />
            Produtos
          </h1>
          <p className="text-muted-foreground mt-1">{readOnly ? 'Estoque e expedição para departamentos' : 'Controle de estoque e expedição para departamentos'}</p>
        </div>
        {canCreate && (
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-product-btn" className="flex items-center gap-2 bg-gradient-to-r from-[#0c4a6e] to-[#1e40af]">
              <Plus className="w-4 h-4" />
              Cadastrar item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Cadastrar item no almoxarifado</DialogTitle>
              <DialogDescription>Preencha os dados do novo item em estoque</DialogDescription>
            </DialogHeader>
            <ProductForm
              formData={formData}
              onInputChange={handleInputChange}
              onFieldChange={handleFieldChange}
              categories={categories}
              departments={departments}
              onSubmit={handleAddProduct}
              submitText="Cadastrar Produto"
              isEditing={false}
            />
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  data-testid="search-products-input"
                  placeholder="Buscar por nome, código, marca ou departamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger data-testid="filter-category-select">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <SelectValue placeholder="Categoria" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Categorias</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-4 flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
            </p>
            {canExport && (
            <Button data-testid="export-csv-btn" onClick={exportToCSV} variant="outline" size="sm" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Exportar CSV
            </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card className="border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <SortableTableHead columnKey="code" label="Código" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <SortableTableHead columnKey="name" label="Nome" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <SortableTableHead columnKey="brand" label="Marca" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <TableHead className="font-semibold">Categoria</TableHead>
                  <SortableTableHead columnKey="value" label="Valor unit." sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <TableHead className="font-semibold text-right">Valor total</TableHead>
                  <SortableTableHead columnKey="quantity" label="Qtd. atual" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="text-center" />
                  <TableHead className="font-semibold">Localização</TableHead>
                  {(canUpdate || canDelete) && <TableHead className="font-semibold text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id} data-testid={`product-row-${product.id}`} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-muted-foreground">{product.code ?? '-'}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.brand ?? '-'}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>R$ {Number(product.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">R$ {Number(product.value_total ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-center font-medium">{product.quantity ?? 0}</TableCell>
                    <TableCell>{product.location ?? '-'}</TableCell>
                    {(canUpdate || canDelete) && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {canUpdate && (
                        <Button
                          data-testid={`entry-product-${product.id}`}
                          onClick={() => openEntryDialog(product)}
                          variant="ghost"
                          size="sm"
                          className="hover:bg-blue-50 hover:text-blue-700"
                          title="Registrar entrada"
                        >
                          <ArrowDownToLine className="w-4 h-4" />
                        </Button>
                        )}
                        {canUpdate && (product.quantity ?? 0) > 0 && (
                        <Button
                          data-testid={`withdraw-product-${product.id}`}
                          onClick={() => openWithdrawDialog(product)}
                          variant="ghost"
                          size="sm"
                          className="hover:bg-emerald-50 hover:text-emerald-700"
                          title="Expedir (saída)"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                        )}
                        {canUpdate && (
                        <Button
                          data-testid={`edit-product-${product.id}`}
                          onClick={() => openEditDialog(product)}
                          variant="ghost"
                          size="sm"
                          className="hover:bg-blue-50 hover:text-[#1e40af]"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        )}
                        {canDelete && (
                        <Button
                          data-testid={`delete-product-${product.id}`}
                          onClick={() => openDeleteDialog(product)}
                          variant="ghost"
                          size="sm"
                          className="hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        )}
                      </div>
                    </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationBar
            pagination={pagination}
            onPageChange={handlePageChange}
            onPerPageChange={handlePerPageChange}
            className="px-6 pb-4"
          />
        </CardContent>
      </Card>

      {/* Confirmação de exclusão (padrão igual ao Patrimônio) */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { if (!open) setProductToDelete(null); setDeleteDialogOpen(open); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este produto?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleConfirmDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar item</DialogTitle>
            <DialogDescription>Atualize os dados do item no almoxarifado</DialogDescription>
          </DialogHeader>
          <ProductForm
            formData={formData}
            onInputChange={handleInputChange}
            onFieldChange={handleFieldChange}
            categories={categories}
            departments={departments}
            onSubmit={handleEditProduct}
            submitText="Salvar alterações"
            isEditing={true}
          />
        </DialogContent>
      </Dialog>

      {/* Entrada de estoque Dialog */}
      <Dialog open={isEntryDialogOpen} onOpenChange={setIsEntryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownToLine className="w-5 h-5" />
              Registrar entrada
            </DialogTitle>
            <DialogDescription>
              {entryProduct && (
                <>Adicionar quantidade ao estoque de <strong>{entryProduct.name}</strong> (atual: {entryProduct.quantity ?? 0})</>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEntry} className="space-y-4">
            <div className="space-y-2">
              <Label>Quantidade de entrada</Label>
              <Input
                type="number"
                min={1}
                value={entryForm.quantity}
                onChange={(e) => setEntryForm((prev) => ({ ...prev, quantity: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Input
                value={entryForm.notes}
                onChange={(e) => setEntryForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Ex: Compra, doação"
              />
            </div>
            <Button type="submit" className="w-full bg-gradient-to-r from-[#0c4a6e] to-[#1e40af]">
              <ArrowDownToLine className="w-4 h-4 mr-2" />
              Registrar entrada
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Expedir (Withdraw) Dialog */}
      <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Expedir para departamento
            </DialogTitle>
            <DialogDescription>
              {withdrawProduct && (
                <>Registrar saída de <strong>{withdrawProduct.name}</strong> (estoque: {withdrawProduct.quantity ?? 0})</>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleWithdraw} className="space-y-4">
            <div className="space-y-2">
              <Label>Departamento destino</Label>
              <Select
                value={withdrawForm.department_id}
                onValueChange={(v) => setWithdrawForm((prev) => ({ ...prev, department_id: v }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o departamento" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsável pela retirada</Label>
              <Select
                value={withdrawForm.user_id}
                onValueChange={(v) => setWithdrawForm((prev) => ({ ...prev, user_id: v }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  {withdrawUserOptions.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.name} {u.email ? `(${u.email})` : ''}</SelectItem>
                  ))}
                  {withdrawUserOptions.length === 0 && (
                    <SelectItem value="__nenhum__" disabled>Nenhum responsável disponível</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input
                type="number"
                min={1}
                max={withdrawProduct?.quantity ?? 1}
                value={withdrawForm.quantity}
                onChange={(e) => setWithdrawForm((prev) => ({ ...prev, quantity: e.target.value }))}
                required
              />
              {withdrawProduct && (
                <p className="text-xs text-muted-foreground">Máximo: {withdrawProduct.quantity ?? 0}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Input
                value={withdrawForm.notes}
                onChange={(e) => setWithdrawForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Ex: Solicitação do RH"
              />
            </div>
            <Button type="submit" className="w-full bg-gradient-to-r from-[#0c4a6e] to-[#1e40af]">
              <Send className="w-4 h-4 mr-2" />
              Registrar expedição
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;