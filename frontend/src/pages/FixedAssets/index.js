import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../lib/api';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Plus, Search, Edit, Trash2, Tag, Upload } from 'lucide-react';
import { toast } from 'sonner';
import PaginationBar from '../../components/PaginationBar';
import FixedAssetForm, { STATUS_OPTIONS } from './FixedAssetForm';

const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.label]));
const STATUS_COLORS = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  maintenance: 'bg-amber-100 text-amber-700 border-amber-200',
  written_off: 'bg-slate-100 text-slate-600 border-slate-200',
  reserved: 'bg-blue-100 text-blue-700 border-blue-200',
};

const initialFormData = {
  patrimony_code: '',
  serial_number: '',
  name: '',
  brand: '',
  description: '',
  category_id: '',
  department_id: '',
  status: 'active',
  acquisition_date: '',
  acquisition_value: '',
};

const FixedAssetsIndex = () => {
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });

  const loadAssets = useCallback((page, perPage) => {
    const params = { page, per_page: perPage };
    if (searchTerm.trim()) params.search = searchTerm.trim();
    return api.get('/fixed-assets', { params }).then((res) => {
      const data = res.data?.data ?? res.data;
      setAssets(Array.isArray(data) ? data : []);
      setPagination({
        current_page: res.data?.current_page ?? 1,
        last_page: res.data?.last_page ?? 1,
        per_page: res.data?.per_page ?? perPage,
        total: res.data?.total ?? 0,
      });
    });
  }, [searchTerm]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, current_page: 1 }));
  }, [searchTerm]);

  useEffect(() => {
    setLoading(true);
    loadAssets(pagination.current_page, pagination.per_page)
      .catch((err) => {
        if (err.response?.status === 429) {
          toast.error('Muitas requisições. Aguarde um momento e tente novamente.');
        } else {
          toast.error(err.response?.data?.message || 'Erro ao carregar patrimônio.');
        }
      })
      .finally(() => setLoading(false));
  }, [loadAssets, pagination.current_page, pagination.per_page]);

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, current_page: newPage }));
  };

  const handlePerPageChange = (newPerPage) => {
    setPagination((prev) => ({ ...prev, per_page: newPerPage, current_page: 1 }));
  };

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data || [])).catch(() => setCategories([]));
    api.get('/departments').then((res) => setDepartments(res.data || [])).catch(() => setDepartments([]));
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingAsset(null);
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!formData.patrimony_code?.trim()) {
      toast.error('Etiqueta é obrigatória.');
      return;
    }
    const payload = {
      patrimony_code: formData.patrimony_code.trim(),
      serial_number: formData.serial_number?.trim() || null,
      name: formData.name?.trim() || '',
      brand: formData.brand?.trim() || null,
      description: formData.description?.trim() || null,
      category_id: formData.category_id || null,
      department_id: formData.department_id || null,
      status: formData.status || 'active',
      acquisition_date: formData.acquisition_date || null,
      acquisition_value: formData.acquisition_value ? parseFloat(formData.acquisition_value) : null,
    };
    if (!payload.category_id) {
      toast.error('Selecione uma categoria.');
      return;
    }
    if (!payload.department_id) {
      toast.error('Selecione um departamento.');
      return;
    }
    api.post('/fixed-assets', payload)
      .then(() => {
        resetForm();
        setIsAddDialogOpen(false);
        loadAssets(pagination.current_page, pagination.per_page);
        toast.success('Patrimônio cadastrado com sucesso!');
      })
      .catch((err) => {
        const data = err.response?.data;
        const firstError = data?.errors && Object.values(data.errors).flat()[0];
        toast.error(firstError || data?.message || 'Erro ao cadastrar.');
      });
  };

  const handleEdit = (e) => {
    e.preventDefault();
    if (!editingAsset || !formData.patrimony_code?.trim()) {
      toast.error('Etiqueta é obrigatória.');
      return;
    }
    const payload = {
      patrimony_code: formData.patrimony_code.trim(),
      serial_number: formData.serial_number?.trim() || null,
      name: formData.name?.trim() || '',
      brand: formData.brand?.trim() || null,
      description: formData.description?.trim() || null,
      category_id: formData.category_id || null,
      department_id: formData.department_id || null,
      status: formData.status || 'active',
      acquisition_date: formData.acquisition_date || null,
      acquisition_value: formData.acquisition_value ? parseFloat(formData.acquisition_value) : null,
    };
    if (!payload.category_id) {
      toast.error('Selecione uma categoria.');
      return;
    }
    if (!payload.department_id) {
      toast.error('Selecione um departamento.');
      return;
    }
    api.put(`/fixed-assets/${editingAsset.id}`, payload)
      .then(() => {
        resetForm();
        setEditingAsset(null);
        setIsEditDialogOpen(false);
        loadAssets(pagination.current_page, pagination.per_page);
        toast.success('Patrimônio atualizado com sucesso!');
      })
      .catch((err) => {
        const data = err.response?.data;
        const firstError = data?.errors && Object.values(data.errors).flat()[0];
        toast.error(firstError || data?.message || 'Erro ao atualizar.');
      });
  };

  const openDeleteDialog = (asset) => {
    setAssetToDelete(asset);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!assetToDelete) return;
    setDeleting(true);
    api.delete(`/fixed-assets/${assetToDelete.id}`)
      .then(() => {
        setDeleteDialogOpen(false);
        setAssetToDelete(null);
        const isLastOnPage = assets.length === 1 && pagination.current_page > 1;
        if (isLastOnPage) {
          setPagination((prev) => ({ ...prev, current_page: prev.current_page - 1 }));
        } else {
          loadAssets(pagination.current_page, pagination.per_page);
        }
        toast.success('Patrimônio excluído com sucesso.');
      })
      .catch((err) => {
        const data = err.response?.data;
        const firstError = data?.errors && Object.values(data.errors).flat()[0];
        toast.error(firstError || data?.message || 'Erro ao excluir.');
      })
      .finally(() => setDeleting(false));
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    api.post('/fixed-assets/import', formData, {
      transformRequest: [(data, headers) => {
        delete headers['Content-Type'];
        return data;
      }],
    })
      .then(() => {
        loadAssets(1, pagination.per_page);
        toast.success('Importação concluída com sucesso.');
      })
      .catch((err) => {
        const msg = err.response?.data?.message || err.response?.data?.errors?.file?.[0] || 'Erro ao importar.';
        toast.error(msg);
      })
      .finally(() => {
        setImporting(false);
        e.target.value = '';
      });
  };

  const openEditDialog = (asset) => {
    setEditingAsset(asset);
    setFormData({
      patrimony_code: asset.patrimony_code ?? '',
      serial_number: asset.serial_number ?? '',
      name: asset.name ?? '',
      brand: asset.brand ?? '',
      description: asset.description ?? '',
      category_id: asset.category_id ?? '',
      department_id: asset.department_id ?? '',
      status: asset.status ?? 'active',
      acquisition_date: asset.acquisition_date ?? '',
      acquisition_value: asset.acquisition_value ?? '',
    });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Tag className="w-8 h-8 text-[#0c4a6e]" />
            Patrimônio
          </h1>
          <p className="text-muted-foreground mt-1">Ativos imobilizados (etiquetas)</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.csv"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          className="flex items-center gap-2"
          onClick={handleImportClick}
          disabled={importing}
        >
          <Upload className="w-4 h-4" />
          {importing ? 'Importando...' : 'Importar'}
        </Button>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 bg-gradient-to-r from-[#0c4a6e] to-[#1e40af]">
              <Plus className="w-4 h-4" />
              Cadastrar patrimônio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo patrimônio</DialogTitle>
              <DialogDescription>Preencha os dados do ativo imobilizado</DialogDescription>
            </DialogHeader>
            <FixedAssetForm
              formData={formData}
              onInputChange={handleInputChange}
              onFieldChange={handleFieldChange}
              categories={categories}
              departments={departments}
              onSubmit={handleAdd}
              submitText="Cadastrar"
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Buscar por etiqueta ou nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          {loading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Etiqueta</TableHead>
                    <TableHead className="font-semibold">Nome</TableHead>
                    <TableHead className="font-semibold">N/S</TableHead>
                    <TableHead className="font-semibold">Localização</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((asset) => (
                    <TableRow key={asset.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono font-medium">{asset.patrimony_code ?? '-'}</TableCell>
                      <TableCell>{asset.name ?? '-'}</TableCell>
                      <TableCell className="font-mono text-muted-foreground text-sm">{asset.serial_number ?? '-'}</TableCell>
                      <TableCell>{asset.department ?? '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_COLORS[asset.status] ?? ''}>
                          {STATUS_LABELS[asset.status] ?? asset.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => openEditDialog(asset)}
                            variant="ghost"
                            size="sm"
                            className="hover:bg-blue-50 hover:text-[#1e40af]"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => openDeleteDialog(asset)}
                            variant="ghost"
                            size="sm"
                            className="hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {!loading && assets.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Nenhum patrimônio cadastrado.</p>
          )}

          <PaginationBar
            pagination={pagination}
            onPageChange={handlePageChange}
            onPerPageChange={handlePerPageChange}
          />
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { if (!open) { setEditingAsset(null); resetForm(); } setIsEditDialogOpen(open); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar patrimônio</DialogTitle>
            <DialogDescription>Altere os dados do ativo imobilizado</DialogDescription>
          </DialogHeader>
          <FixedAssetForm
            formData={formData}
            onInputChange={handleInputChange}
            onFieldChange={handleFieldChange}
            categories={categories}
            departments={departments}
            onSubmit={handleEdit}
            submitText="Salvar alterações"
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { if (!open) { setAssetToDelete(null); } setDeleteDialogOpen(open); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir patrimônio</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este patrimônio?
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
    </div>
  );
};

export default FixedAssetsIndex;
