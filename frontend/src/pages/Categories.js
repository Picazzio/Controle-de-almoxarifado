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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
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

  const handleDelete = (id) => {
    api.delete(`/categories/${id}`)
      .then(() => {
        setCategories((prev) => prev.filter((c) => c.id !== id));
        toast.success('Categoria removida com sucesso!');
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Erro ao remover.'));
  };

  const openEditDialog = (cat) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <FolderTree className="w-8 h-8 text-[#0c4a6e]" />
            Categorias
          </h1>
          <p className="text-muted-foreground mt-1">Cadastro das categorias de produtos</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-category-btn" className="flex items-center gap-2 bg-gradient-to-r from-[#0c4a6e] to-[#1e40af]">
              <Plus className="w-4 h-4" />
              Cadastrar categoria
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

      <Card className="border-border">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                data-testid="search-categories-input"
                placeholder="Buscar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Mostrando <span className="font-semibold">{categories.length}</span> categorias
          </p>

          {loading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <SortableTableHead columnKey="name" label="Nome" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                    <SortableTableHead columnKey="created_at" label="Data de cadastro" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                    <TableHead className="font-semibold text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat) => (
                    <TableRow key={cat.id} data-testid={`category-row-${cat.id}`} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {cat.created_at ? new Date(cat.created_at).toLocaleDateString('pt-BR') : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            data-testid={`edit-category-${cat.id}`}
                            onClick={() => openEditDialog(cat)}
                            variant="ghost"
                            size="sm"
                            className="hover:bg-blue-50 hover:text-[#1e40af]"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            data-testid={`delete-category-${cat.id}`}
                            onClick={() => handleDelete(cat.id)}
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

          {!loading && categories.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Nenhuma categoria cadastrada.</p>
          )}
        </CardContent>
      </Card>

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
