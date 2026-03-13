import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '../components/ui/table';
import { SortableTableHead } from '../components/ui/sortable-table-head';
import { Plus, Search, Edit, Trash2, FolderTree } from 'lucide-react';
import { toast } from 'sonner';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formName, setFormName] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadCategories = useCallback(() => {
    const params = { sort_by: sortBy, sort_dir: sortDir };
    if (searchTerm) params.search = searchTerm;
    return api.get('/categories', { params }).then((res) => {
      const data = res.data;
      setCategories(Array.isArray(data) ? data : (data?.data || []));
    });
  }, [searchTerm, sortBy, sortDir]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  };

  useEffect(() => {
    loadCategories().finally(() => setLoading(false));
  }, [loadCategories]);

  const handleAdd = (e) => {
    e.preventDefault();
    const name = formName.trim();
    if (!name) {
      toast.error('Informe o nome da categoria.');
      return;
    }
    api.post('/categories', { name })
      .then(() => {
        setFormName('');
        setIsAddDialogOpen(false);
        loadCategories();
        toast.success('Categoria cadastrada com sucesso!');
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Erro ao cadastrar.'));
  };

  const handleEdit = (e) => {
    e.preventDefault();
    const name = formName.trim();
    if (!name || !editingCategory) {
      toast.error('Informe o nome da categoria.');
      return;
    }
    api.put(`/categories/${editingCategory.id}`, { name })
      .then(() => {
        setFormName('');
        setEditingCategory(null);
        setIsEditDialogOpen(false);
        loadCategories();
        toast.success('Categoria atualizada com sucesso!');
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Erro ao atualizar.'));
  };

  const openDeleteDialog = (cat) => {
    setCategoryToDelete(cat);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!categoryToDelete) return;
    setDeleting(true);
    api.delete(`/categories/${categoryToDelete.id}`)
      .then(() => {
        setCategories((prev) => prev.filter((c) => c.id !== categoryToDelete.id));
        setDeleteDialogOpen(false);
        setCategoryToDelete(null);
        toast.success('Categoria removida com sucesso!');
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Erro ao remover.'))
      .finally(() => setDeleting(false));
  };

  const openEditDialog = (cat) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setIsEditDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in min-h-0" style={{ height: 'calc(100vh - 220px)' }}>
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <FolderTree className="w-8 h-8 text-[#0c4a6e]" />
          Categorias
        </h1>
      </div>

      <Card className="border-border flex-1 flex flex-col min-h-0">
        <CardContent className="p-6 flex-1 flex flex-col min-h-0 gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-shrink-0 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                data-testid="search-categories-input"
                placeholder="Buscar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="add-category-btn" size="icon" className="h-9 w-9 bg-gradient-to-r from-[#0c4a6e] to-[#1e40af] hover:opacity-90 shrink-0" aria-label="Cadastrar categoria">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Nova categoria</DialogTitle>
                  <DialogDescription>Informe o nome da categoria</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAdd} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="category-name">Nome da categoria</Label>
                    <Input
                      id="category-name"
                      data-testid="category-name-input"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Ex: Material de escritório, TI, Limpeza"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-to-r from-[#0c4a6e] to-[#1e40af]">
                    Cadastrar
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <p className="text-muted-foreground flex-shrink-0">Carregando...</p>
          ) : (
            <>
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto scrollbar-table border border-border rounded-md" aria-label="Tabela de categorias com rolagem">
                <div className="min-w-0">
                  <table className="w-full caption-bottom text-sm border-collapse">
                    <thead className="[&_tr]:border-b">
                      <TableRow className="sticky top-0 z-20 border-b border-border bg-background shadow-[0_1px_0_0_hsl(var(--border))] hover:bg-background [&_th]:bg-background [&_th]:shadow-[0_1px_0_0_hsl(var(--border))]">
                        <SortableTableHead columnKey="name" label="Nome" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="h-10 px-2 bg-background first:rounded-tl-md" />
                        <SortableTableHead columnKey="created_at" label="Data de cadastro" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="h-10 px-2 bg-background" />
                        <TableHead className="font-semibold text-right h-10 px-2 bg-background last:rounded-tr-md">Ações</TableHead>
                      </TableRow>
                    </thead>
                    <TableBody>
                      {categories.map((cat) => (
                        <TableRow key={cat.id} data-testid={`category-row-${cat.id}`} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{cat.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {cat.created_at ? new Date(cat.created_at).toLocaleDateString('pt-BR') : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button data-testid={`edit-category-${cat.id}`} onClick={() => openEditDialog(cat)} variant="ghost" size="sm" className="hover:bg-blue-50 hover:text-[#1e40af]">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button data-testid={`delete-category-${cat.id}`} onClick={() => openDeleteDialog(cat)} variant="ghost" size="sm" className="hover:bg-red-50 hover:text-red-600">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </table>
                </div>
              </div>
              {categories.length === 0 && (
                <p className="text-center text-muted-foreground py-8 flex-shrink-0">Nenhuma categoria cadastrada.</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { if (!open) setCategoryToDelete(null); setDeleteDialogOpen(open); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta categoria?
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

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar categoria</DialogTitle>
            <DialogDescription>Altere o nome da categoria</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category-name">Nome da categoria</Label>
              <Input
                id="edit-category-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Material de escritório, TI, Limpeza"
                required
              />
            </div>
            <Button type="submit" className="w-full bg-gradient-to-r from-[#0c4a6e] to-[#1e40af]">
              Salvar alterações
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Categories;
