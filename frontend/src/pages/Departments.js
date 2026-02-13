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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { SortableTableHead } from '../components/ui/sortable-table-head';
import { Plus, Search, Edit, Trash2, Building2 } from 'lucide-react';
import { toast } from 'sonner';

const Departments = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [formName, setFormName] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadDepartments = useCallback(() => {
    const params = { sort_by: sortBy, sort_dir: sortDir };
    if (searchTerm) params.search = searchTerm;
    return api.get('/departments', { params }).then((res) => {
      const data = res.data;
      setDepartments(Array.isArray(data) ? data : (data?.data || []));
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
    loadDepartments().finally(() => setLoading(false));
  }, [loadDepartments]);

  const handleAdd = (e) => {
    e.preventDefault();
    const name = formName.trim();
    if (!name) {
      toast.error('Informe o nome do departamento.');
      return;
    }
    api.post('/departments', { name })
      .then(() => {
        setFormName('');
        setIsAddDialogOpen(false);
        loadDepartments();
        toast.success('Departamento cadastrado com sucesso!');
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Erro ao cadastrar.'));
  };

  const handleEdit = (e) => {
    e.preventDefault();
    const name = formName.trim();
    if (!name || !editingDepartment) {
      toast.error('Informe o nome do departamento.');
      return;
    }
    api.put(`/departments/${editingDepartment.id}`, { name })
      .then(() => {
        setFormName('');
        setEditingDepartment(null);
        setIsEditDialogOpen(false);
        loadDepartments();
        toast.success('Departamento atualizado com sucesso!');
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Erro ao atualizar.'));
  };

  const openDeleteDialog = (dept) => {
    setDepartmentToDelete(dept);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!departmentToDelete) return;
    setDeleting(true);
    api.delete(`/departments/${departmentToDelete.id}`)
      .then(() => {
        setDepartments((prev) => prev.filter((d) => d.id !== departmentToDelete.id));
        setDeleteDialogOpen(false);
        setDepartmentToDelete(null);
        toast.success('Departamento removido com sucesso!');
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Erro ao remover.'))
      .finally(() => setDeleting(false));
  };

  const openEditDialog = (dept) => {
    setEditingDepartment(dept);
    setFormName(dept.name);
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-8 h-8 text-[#0c4a6e]" />
            Departamentos
          </h1>
          <p className="text-muted-foreground mt-1">Cadastro dos departamentos da empresa</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-department-btn" className="flex items-center gap-2 bg-gradient-to-r from-[#0c4a6e] to-[#1e40af]">
              <Plus className="w-4 h-4" />
              Cadastrar departamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Novo departamento</DialogTitle>
              <DialogDescription>Informe o nome do departamento da empresa</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="department-name">Nome do departamento</Label>
                <Input
                  id="department-name"
                  data-testid="department-name-input"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: TI, RH, Financeiro"
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
                data-testid="search-departments-input"
                placeholder="Buscar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Mostrando <span className="font-semibold">{departments.length}</span> departamentos
          </p>

          {loading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <SortableTableHead columnKey="code" label="Código" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                    <SortableTableHead columnKey="name" label="Nome" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                    <SortableTableHead columnKey="created_at" label="Data de cadastro" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                    <TableHead className="font-semibold text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map((dept) => (
                    <TableRow key={dept.id} data-testid={`department-row-${dept.id}`} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-muted-foreground">{dept.code ?? '-'}</TableCell>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {dept.created_at ? new Date(dept.created_at).toLocaleDateString('pt-BR') : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            data-testid={`edit-department-${dept.id}`}
                            onClick={() => openEditDialog(dept)}
                            variant="ghost"
                            size="sm"
                            className="hover:bg-blue-50 hover:text-[#1e40af]"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            data-testid={`delete-department-${dept.id}`}
                            onClick={() => openDeleteDialog(dept)}
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

          {!loading && departments.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Nenhum departamento cadastrado.</p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { if (!open) setDepartmentToDelete(null); setDeleteDialogOpen(open); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir departamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este departamento?
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
            <DialogTitle>Editar departamento</DialogTitle>
            <DialogDescription>Altere o nome do departamento</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-department-name">Nome do departamento</Label>
              <Input
                id="edit-department-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: TI, RH, Financeiro"
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

export default Departments;
