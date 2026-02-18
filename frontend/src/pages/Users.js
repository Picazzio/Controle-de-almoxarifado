import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Plus, Search, Edit, Trash2, Mail, Shield } from 'lucide-react';
import { toast } from 'sonner';
import PaginationBar from '../components/PaginationBar';

/** Formulário de usuário: definido fora de Users para não ser recriado a cada render e evitar perda de foco nos inputs. */
function UserForm({
  formData,
  onInputChange,
  onFieldChange,
  roleNames,
  departments,
  isEditing,
  onSubmit,
  submitText,
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome Completo</Label>
        <Input
          id="name"
          data-testid="user-name-input"
          name="name"
          value={formData.name}
          onChange={onInputChange}
          required
          placeholder="Ex: João Silva"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          data-testid="user-email-input"
          name="email"
          type="email"
          value={formData.email}
          onChange={onInputChange}
          required
          placeholder="usuario@empresa.com"
        />
      </div>
      {!isEditing && (
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={onInputChange}
            required={!isEditing}
            placeholder="Mínimo 6 caracteres"
          />
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="role">Função</Label>
          <Select value={formData.role} onValueChange={(value) => onFieldChange('role', value)}>
            <SelectTrigger data-testid="user-role-select">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {(roleNames.length ? roleNames : ['Admin', 'Gerente', 'Operador', 'Visualizador']).map((role) => (
                <SelectItem key={role} value={role}>{role}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="department">Departamento</Label>
          <Select value={String(formData.department_id || '')} onValueChange={(value) => onFieldChange('department_id', value || '')}>
            <SelectTrigger data-testid="user-department-select">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={String(dept.id)}>{dept.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {isEditing ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="new_password">Trocar senha</Label>
            <Input
              id="new_password"
              name="password"
              type="password"
              value={formData.password}
              onChange={onInputChange}
              placeholder="Deixe em branco para manter"
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => onFieldChange('status', value)}>
              <SelectTrigger data-testid="user-status-select">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(value) => onFieldChange('status', value)}>
            <SelectTrigger data-testid="user-status-select">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <Button type="submit" data-testid="user-form-submit-btn" className="w-full bg-gradient-to-r from-[#0c4a6e] to-[#1e40af]">
        {submitText}
      </Button>
    </form>
  );
}

const Users = () => {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Operador',
    department_id: '',
    status: 'active'
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });

  const loadUsers = useCallback((page, perPage) => {
    const params = { page, per_page: perPage, sort_by: sortBy, sort_dir: sortDir };
    if (searchTerm) params.search = searchTerm;
    if (filterRole !== 'all') params.role = filterRole;
    return api.get('/users', { params }).then((res) => {
      setUsers(res.data.data || []);
      setPagination({
        current_page: res.data.current_page ?? 1,
        last_page: res.data.last_page ?? 1,
        per_page: res.data.per_page ?? perPage,
        total: res.data.total ?? 0,
      });
    });
  }, [searchTerm, filterRole, sortBy, sortDir]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, current_page: 1 }));
  }, [searchTerm, filterRole]);

  useEffect(() => {
    setLoading(true);
    loadUsers(pagination.current_page, pagination.per_page).finally(() => setLoading(false));
  }, [loadUsers, pagination.current_page, pagination.per_page]);

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, current_page: newPage }));
  };

  const handlePerPageChange = (newPerPage) => {
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
      api.get('/departments').then((res) => setDepartments(res.data || [])),
      api.get('/roles').then((res) => setRoles(res.data || [])),
    ]).then(() => setLoading(false));
  }, []);


  const handleInputChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddUser = (e) => {
    e.preventDefault();
    if (!formData.password || formData.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    api.post('/users', {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role,
      department_id: formData.department_id || null,
      status: formData.status,
    })
      .then(() => {
        setFormData({ name: '', email: '', password: '', role: 'Operador', department_id: '', status: 'active' });
        setIsAddDialogOpen(false);
        loadUsers(pagination.current_page, pagination.per_page);
        toast.success('Usuário cadastrado com sucesso!');
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Erro ao cadastrar.'));
  };

  const handleEditUser = (e) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      email: formData.email,
      role: formData.role,
      department_id: formData.department_id || null,
      status: formData.status,
    };
    if (formData.password && formData.password.trim()) {
      if (formData.password.length < 6) {
        toast.error('A nova senha deve ter pelo menos 6 caracteres.');
        return;
      }
      payload.password = formData.password;
    }
    api.put(`/users/${editingUser.id}`, payload)
      .then(() => {
        setIsEditDialogOpen(false);
        setEditingUser(null);
        loadUsers(pagination.current_page, pagination.per_page);
        toast.success('Usuário atualizado com sucesso!');
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Erro ao atualizar.'));
  };

  const openDeleteDialog = (user) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!userToDelete) return;
    setDeleting(true);
    api.delete(`/users/${userToDelete.id}`)
      .then(() => {
        setDeleteDialogOpen(false);
        setUserToDelete(null);
        const isLastOnPage = users.length === 1 && pagination.current_page > 1;
        if (isLastOnPage) {
          setPagination((prev) => ({ ...prev, current_page: prev.current_page - 1 }));
        } else {
          loadUsers(pagination.current_page, pagination.per_page);
        }
        toast.success('Usuário removido com sucesso!');
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Erro ao remover.'))
      .finally(() => setDeleting(false));
  };

  const openEditDialog = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      department_id: user.department_id ? String(user.department_id) : '',
      status: user.status === 'Ativo' ? 'active' : 'inactive'
    });
    setIsEditDialogOpen(true);
  };

  const filteredUsers = users;
  const roleNames = roles.map((r) => r.name);

  const getRoleColor = (role) => {
    switch (role) {
      case 'Admin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Gerente': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Operador': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Visualizador': return 'bg-muted text-foreground border-border';
      default: return 'bg-muted text-foreground border-border';
    }
  };

  const getStatusColor = (status) => {
    return status === 'Ativo' 
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : 'bg-red-100 text-red-700 border-red-200';
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Usuários</h1>
          <p className="text-muted-foreground mt-1">Gerencie usuários e suas permissões</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-user-btn" className="flex items-center gap-2 bg-gradient-to-r from-[#0c4a6e] to-[#1e40af]">
              <Plus className="w-4 h-4" />
              Adicionar Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Usuário</DialogTitle>
              <DialogDescription>Preencha os dados do novo usuário</DialogDescription>
            </DialogHeader>
            <UserForm
              formData={formData}
              onInputChange={handleInputChange}
              onFieldChange={handleFieldChange}
              roleNames={roleNames}
              departments={departments}
              isEditing={false}
              onSubmit={handleAddUser}
              submitText="Cadastrar Usuário"
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  data-testid="search-users-input"
                  placeholder="Buscar por nome ou e-mail..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger data-testid="filter-role-select">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <SelectValue placeholder="Função" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Funções</SelectItem>
                {(roleNames.length ? roleNames : ['Admin', 'Gerente', 'Operador', 'Visualizador']).map((role) => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <SortableTableHead columnKey="code" label="Código" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <SortableTableHead columnKey="name" label="Usuário" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <SortableTableHead columnKey="email" label="E-mail" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <SortableTableHead columnKey="role_name" label="Função" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <TableHead className="font-semibold">Departamento</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <SortableTableHead columnKey="join_date" label="Data de Ingresso" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <TableHead className="font-semibold text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} data-testid={`user-row-${user.id}`} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-muted-foreground">{user.code ?? '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border-2 border-border">
                          <AvatarFallback className="bg-gradient-to-br from-[#0c4a6e] to-[#1e40af] text-white font-semibold">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getRoleColor(user.role)} border`}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.department}</TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(user.status)} border`}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.join_date ? new Date(user.join_date).toLocaleDateString('pt-BR') : '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          data-testid={`edit-user-${user.id}`}
                          onClick={() => openEditDialog(user)}
                          variant="ghost"
                          size="sm"
                          className="hover:bg-blue-50 hover:text-[#1e40af]"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          data-testid={`delete-user-${user.id}`}
                          onClick={() => openDeleteDialog(user)}
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
          <PaginationBar
            pagination={pagination}
            onPageChange={handlePageChange}
            onPerPageChange={handlePerPageChange}
            className="px-6 pb-4"
          />
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { if (!open) setUserToDelete(null); setDeleteDialogOpen(open); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este usuário?
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>Atualize os dados do usuário</DialogDescription>
          </DialogHeader>
          <UserForm
            formData={formData}
            onInputChange={handleInputChange}
            onFieldChange={handleFieldChange}
            roleNames={roleNames}
            departments={departments}
            isEditing={!!editingUser}
            onSubmit={handleEditUser}
            submitText="Salvar Alterações"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Users;