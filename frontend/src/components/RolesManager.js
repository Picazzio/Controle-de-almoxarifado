import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Badge } from './ui/badge';
import { Plus, Shield, Edit, Trash2, Check, LayoutDashboard, Package, ClipboardList, Building2, FolderTree, Users, Inbox, Clock, Settings } from 'lucide-react';
import { toast } from 'sonner';

/** Páginas do sistema e a permissão necessária para acessá-las (nome da permissão no backend). */
const PAGES_BY_PERMISSION = [
  { key: 'dashboard', label: 'Dashboard', permission: 'view_dashboard', icon: LayoutDashboard },
  { key: 'products', label: 'Produtos', permission: 'read', icon: Package },
  { key: 'solicitar-produtos', label: 'Solicitar Produtos', permission: 'request_products', icon: ClipboardList },
  { key: 'departments', label: 'Departamentos', permission: 'manage_users', icon: Building2 },
  { key: 'categories', label: 'Categorias', permission: 'manage_users', icon: FolderTree },
  { key: 'users', label: 'Usuários', permission: 'manage_users', icon: Users },
  { key: 'solicitacoes', label: 'Solicitações', permission: 'view_stock_requests', icon: Inbox },
  { key: 'logs', label: 'Logs de Atividade', permission: 'view_logs', icon: Clock },
  { key: 'roles-settings', label: 'Funções e Configurações', permission: 'manage_roles', icon: Settings },
];

/** Permissões que não são “página” mas ações (ex.: criar/editar/excluir produtos). */
const ACTION_PERMISSION_IDS = ['create', 'update', 'delete', 'export_data'];

const ROLES_DESCRIPTIONS = {
  Admin: 'Acesso total ao sistema',
  Gerente: 'Gerenciamento de produtos e usuários',
  Operador: 'Operações básicas de produtos',
  Visualizador: 'Apenas visualização',
};

function RoleForm({ formData, onInputChange, onPermissionChange, allPermissions, onSubmit, submitText }) {
  const permissionsList = Array.isArray(allPermissions) ? allPermissions : [];
  const actionPermissions = permissionsList.filter((p) => ACTION_PERMISSION_IDS.includes(p.id));

  const isPageChecked = (page) => {
    return formData.permissions?.includes(page.permission) ?? false;
  };

  const handlePageChange = (page) => {
    onPermissionChange(page.permission);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="role-name">Nome</Label>
        <Input
          id="role-name"
          name="name"
          value={formData.name}
          onChange={onInputChange}
          placeholder="Ex: Operador"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role-description">Descrição</Label>
        <Textarea
          id="role-description"
          name="description"
          value={formData.description}
          onChange={onInputChange}
          placeholder="Breve descrição da função"
          rows={2}
        />
      </div>

      <div className="space-y-3">
        <Label className="text-base font-medium">Páginas liberadas para esta função</Label>
        <p className="text-sm text-muted-foreground">
          Selecione quais páginas do sistema esta função poderá acessar.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border border-border p-4 bg-muted/30">
          {PAGES_BY_PERMISSION.map((page) => {
            const Icon = page.icon;
            const checked = isPageChecked(page);
            return (
              <label
                key={page.key}
                className="flex items-center gap-3 rounded-md py-2.5 px-3 cursor-pointer transition-colors hover:bg-muted/50"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => handlePageChange(page)}
                />
                <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium">{page.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-base font-medium">Ações em Produtos</Label>
        <p className="text-sm text-muted-foreground">
          Permissões adicionais na página de Produtos (criar, editar, excluir, exportar).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border rounded-md p-3">
          {actionPermissions.map((perm) => (
            <div key={perm.id} className="flex items-center space-x-2">
              <Checkbox
                id={`perm-${perm.id}`}
                checked={formData.permissions?.includes(perm.id)}
                onCheckedChange={() => onPermissionChange(perm.id)}
              />
              <label htmlFor={`perm-${perm.id}`} className="text-sm cursor-pointer">
                {perm.label || perm.name}
              </label>
            </div>
          ))}
        </div>
      </div>

      <Button type="submit" className="w-full sm:w-auto">
        {submitText}
      </Button>
    </form>
  );
}

const getRoleColor = (name) => {
  switch (name) {
    case 'Admin': return 'from-purple-600 to-purple-500';
    case 'Gerente': return 'from-blue-600 to-blue-500';
    case 'Operador': return 'from-emerald-600 to-emerald-500';
    case 'Visualizador': return 'from-slate-600 to-slate-500';
    default: return 'from-slate-600 to-slate-500';
  }
};

/**
 * Gerencia funções e permissões. Pode ser usado em página dedicada ou dentro da aba Permissões em Configurações.
 * @param {boolean} embedded - Se true, não exibe o título da seção (para uso dentro de abas).
 */
const RolesManager = ({ embedded = false }) => {
  const [roles, setRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: []
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadRoles = () => {
    api.get('/roles').then((res) => setRoles(res.data || []));
  };

  useEffect(() => {
    loadRoles();
    api.get('/roles/permissions').then((res) => setAllPermissions(res.data || []));
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePermissionChange = (permissionId) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const handleAddRole = (e) => {
    e.preventDefault();
    api.post('/roles', { name: formData.name, description: formData.description, permissions: formData.permissions })
      .then(() => {
        setFormData({ name: '', description: '', permissions: [] });
        setIsAddDialogOpen(false);
        loadRoles();
        toast.success('Função criada com sucesso!');
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Erro ao criar.'));
  };

  const handleEditRole = (e) => {
    e.preventDefault();
    api.put(`/roles/${editingRole.id}`, { name: formData.name, description: formData.description, permissions: formData.permissions })
      .then(() => {
        setIsEditDialogOpen(false);
        setEditingRole(null);
        loadRoles();
        toast.success('Função atualizada com sucesso!');
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Erro ao atualizar.'));
  };

  const openDeleteDialog = (role) => {
    if (role?.user_count > 0) {
      toast.error('Não é possível excluir uma função com usuários associados!');
      return;
    }
    setRoleToDelete(role);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!roleToDelete) return;
    setDeleting(true);
    api.delete(`/roles/${roleToDelete.id}`)
      .then(() => {
        setRoles((prev) => prev.filter((r) => r.id !== roleToDelete.id));
        setDeleteDialogOpen(false);
        setRoleToDelete(null);
        toast.success('Função removida com sucesso!');
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Erro ao remover.'))
      .finally(() => setDeleting(false));
  };

  const openEditDialog = (role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || ROLES_DESCRIPTIONS[role.name] || '',
      permissions: [...(role.permissions || [])]
    });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="text-3xl font-bold text-foreground">Permissões e Funções</h1>
          <p className="text-muted-foreground mt-1">Gerencie funções e suas permissões</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {embedded && (
          <div>
            <h2 className="text-lg font-semibold text-foreground">Funções e permissões</h2>
            <p className="text-sm text-muted-foreground">Crie e edite funções e escolha quais páginas cada uma pode acessar.</p>
          </div>
        )}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-role-btn" className="flex items-center gap-2 bg-gradient-to-r from-[#0c4a6e] to-[#1e40af]">
              <Plus className="w-4 h-4" />
              Adicionar Função
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
            <DialogHeader>
              <DialogTitle>Criar Nova Função</DialogTitle>
              <DialogDescription>Defina as permissões para a nova função</DialogDescription>
            </DialogHeader>
            <RoleForm
              formData={formData}
              onInputChange={handleInputChange}
              onPermissionChange={handlePermissionChange}
              allPermissions={allPermissions}
              onSubmit={handleAddRole}
              submitText="Criar Função"
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {roles.map((role) => (
          <Card key={role.id} data-testid={`role-card-${role.id}`} className="border-border hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getRoleColor(role.name)} flex items-center justify-center shadow-lg`}>
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{role.name}</CardTitle>
                    <Badge variant="secondary" className="mt-1">
                      {role.user_count ?? role.userCount ?? 0} usuários
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    data-testid={`edit-role-${role.id}`}
                    onClick={() => openEditDialog(role)}
                    variant="ghost"
                    size="sm"
                    className="hover:bg-blue-50 hover:text-[#1e40af]"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    data-testid={`delete-role-${role.id}`}
                    onClick={() => openDeleteDialog(role)}
                    variant="ghost"
                    size="sm"
                    className="hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <CardDescription className="mt-2">{role.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Páginas liberadas:</p>
                <div className="flex flex-wrap gap-2">
                  {PAGES_BY_PERMISSION.filter((p) => (role.permissions || []).includes(p.permission)).map((page) => {
                    const Icon = page.icon;
                    return (
                      <Badge
                        key={page.key}
                        variant="outline"
                        className="bg-primary/10 text-primary border-primary/30 flex items-center gap-1"
                      >
                        <Icon className="w-3 h-3" />
                        {page.label}
                      </Badge>
                    );
                  })}
                </div>
                {(() => {
                  const roleActionPerms = (role.permissions || []).filter((p) => ACTION_PERMISSION_IDS.includes(p));
                  if (roleActionPerms.length === 0) return null;
                  return (
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Ações em Produtos:</p>
                      <div className="flex flex-wrap gap-1">
                        {roleActionPerms.map((permName) => {
                          const perm = allPermissions.find((p) => p.id === permName);
                          return (
                            <Badge key={permName} variant="secondary" className="text-xs">
                              {perm?.label || permName}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { if (!open) setRoleToDelete(null); setDeleteDialogOpen(open); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir função</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta função?
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>Editar Função</DialogTitle>
            <DialogDescription>Atualize as permissões da função</DialogDescription>
          </DialogHeader>
          <RoleForm
            formData={formData}
            onInputChange={handleInputChange}
            onPermissionChange={handlePermissionChange}
            allPermissions={allPermissions}
            onSubmit={handleEditRole}
            submitText="Salvar Alterações"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RolesManager;
