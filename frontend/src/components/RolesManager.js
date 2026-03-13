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
import { Plus, Shield, Edit, Trash2, Check, LayoutDashboard, Package, ClipboardList, Building2, FolderTree, Users, Inbox, Clock, Settings, AlertTriangle, ChevronDown, Tag } from 'lucide-react';
import { toast } from 'sonner';

/** Páginas do sistema e a permissão necessária para acessá-las (nome da permissão no backend). */
const PAGES_BY_PERMISSION = [
  { key: 'dashboard', label: 'Dashboard', permission: 'view_dashboard', icon: LayoutDashboard },
  { key: 'products', label: 'Produtos', permission: 'read', icon: Package },
  { key: 'solicitar-produtos', label: 'Solicitar Produtos', permission: 'request_products', icon: ClipboardList },
  { key: 'departments', label: 'Departamentos', permission: 'view_departments', icon: Building2 },
  { key: 'categories', label: 'Categorias', permission: 'view_categories', icon: FolderTree },
  { key: 'patrimonio', label: 'Patrimônio', permission: 'fixed_assets_read', icon: Tag },
  { key: 'users', label: 'Usuários', permission: 'manage_users', icon: Users },
  { key: 'solicitacoes', label: 'Solicitações', permission: 'view_stock_requests', icon: Inbox },
  { key: 'logs', label: 'Logs', permission: 'view_logs', icon: Clock },
  { key: 'roles-settings', label: 'Funções e Configurações', permission: 'manage_roles', icon: Settings },
];

/** “página” /**
 * Estrutura de todas as páginas do menu do sistema.
 * Cada página é independente. Páginas sem `acoes` têm apenas o checkbox de liberação (sem seta/accordion).
 */
const PAGINAS_ESTRUTURA = [
  { id: 'dashboard', nome: 'Dashboard', viewPermissionId: 'view_dashboard' },
  {
    id: 'produtos',
    nome: 'Produtos (Estoque/Gerencial)',
    viewPermissionId: 'read',
    acoes: [
      { id: 'create', label: 'Criar', danger: false },
      { id: 'update', label: 'Editar', danger: false },
      { id: 'delete', label: 'Excluir', danger: true },
      { id: 'export_data', label: 'Exportar', danger: false },
    ],
  },
  { id: 'solicitar_produtos', nome: 'Solicitar Produtos', viewPermissionId: 'request_products' },
  {
    id: 'departamentos',
    nome: 'Departamentos',
    viewPermissionId: 'view_departments',
    acoes: [
      { id: 'department_create', label: 'Criar', danger: false },
      { id: 'department_update', label: 'Editar', danger: false },
      { id: 'department_delete', label: 'Excluir', danger: true },
    ],
  },
  {
    id: 'categorias',
    nome: 'Categorias',
    viewPermissionId: 'view_categories',
    acoes: [
      { id: 'category_create', label: 'Criar', danger: false },
      { id: 'category_update', label: 'Editar', danger: false },
      { id: 'category_delete', label: 'Excluir', danger: true },
    ],
  },
  {
    id: 'patrimonio',
    nome: 'Patrimônio',
    viewPermissionId: 'fixed_assets_read',
    acoes: [
      { id: 'fixed_assets_create', label: 'Criar', danger: false },
      { id: 'fixed_assets_update', label: 'Editar', danger: false },
      { id: 'fixed_assets_delete', label: 'Excluir', danger: true },
    ],
  },
  {
    id: 'usuarios',
    nome: 'Usuários',
    viewPermissionId: 'manage_users',
    acoes: [
      { id: 'user_create', label: 'Criar', danger: false },
      { id: 'user_update', label: 'Editar', danger: false },
      { id: 'user_delete', label: 'Excluir', danger: true },
    ],
  },
  { id: 'solicitacoes', nome: 'Solicitações', viewPermissionId: 'view_stock_requests' },
  { id: 'logs', nome: 'Logs', viewPermissionId: 'view_logs' },
  { id: 'configuracoes', nome: 'Configurações', viewPermissionId: 'manage_roles' },
];

/** Estado inicial de uma página (com ou sem acoes). */
const getPaginaInicial = (estrutura) => {
  const base = {
    id: estrutura.id,
    nome: estrutura.nome,
    liberado: false,
    expandido: false,
    viewPermissionId: estrutura.viewPermissionId,
  };
  if (estrutura.acoes && estrutura.acoes.length > 0) {
    return { ...base, acoes: estrutura.acoes.map((a) => ({ ...a, checked: false })) };
  }
  return base;
};

/** Gera o array de páginas no formato do estado (todas desmarcadas). */
const getPaginasInicial = () =>
  PAGINAS_ESTRUTURA.map((e) => getPaginaInicial(e));

/** Converte array de permissões da API para estado paginas. */
const buildPaginasFromPermissions = (permissions = []) => {
  const list = permissions;
  return PAGINAS_ESTRUTURA.map((estrutura) => {
    const viewChecked = list.includes(estrutura.viewPermissionId);
    const base = {
      id: estrutura.id,
      nome: estrutura.nome,
      liberado: viewChecked,
      expandido: false,
      viewPermissionId: estrutura.viewPermissionId,
    };
    if (estrutura.acoes && estrutura.acoes.length > 0) {
      return {
        ...base,
        acoes: estrutura.acoes.map((a) => ({ ...a, checked: list.includes(a.id) })),
      };
    }
    return base;
  });
};

/** Converte estado paginas para array de IDs de permissão para a API (sem duplicatas). */
const buildPermissionsFromPaginas = (paginas = []) => {
  const ids = new Set();
  paginas.forEach((p) => {
    if (p.liberado) ids.add(p.viewPermissionId);
    (p.acoes || []).forEach((a) => {
      if (a.checked) ids.add(a.id);
    });
  });
  return [...ids];
};

const ROLES_DESCRIPTIONS = {
  Admin: 'Acesso total ao sistema',
  Gerente: 'Gerenciamento de produtos e usuários',
  Operador: 'Operações básicas de produtos',
  Visualizador: 'Apenas visualização',
};

/** Nome reservado: a role Admin não pode ser criada nem editada pela interface. */
const RESERVED_ROLE_NAME = 'admin';
const isReservedRoleName = (name) => (name || '').trim().toLowerCase() === RESERVED_ROLE_NAME;

function RoleForm({ formData, onInputChange, onPaginasChange, onSubmit, submitText, onCancel }) {
  const paginas = formData.paginas ?? [];

  const setPagina = (pageId, updater) => {
    onPaginasChange((prev) =>
      prev.map((p) => (p.id === pageId ? (typeof updater === 'function' ? updater(p) : updater) : p))
    );
  };

  const hasAcoes = (pagina) => pagina.acoes && pagina.acoes.length > 0;

  /** Ao desmarcar a página pai: todas as acoes ficam unchecked e o painel fecha (expandido: false). */
  const toggleLiberado = (pagina) => {
    const nextLiberado = !pagina.liberado;
    onPaginasChange((prev) =>
      prev.map((p) => {
        if (p.id !== pagina.id) return p;
        const next = {
          ...p,
          liberado: nextLiberado,
          expandido: nextLiberado ? p.expandido : false,
        };
        if (p.acoes && p.acoes.length > 0) {
          next.acoes = p.acoes.map((a) => ({ ...a, checked: nextLiberado ? a.checked : false }));
        }
        return next;
      })
    );
  };

  const toggleExpandido = (pagina) => {
    if (!pagina.liberado || !hasAcoes(pagina)) return;
    setPagina(pagina.id, (p) => ({ ...p, expandido: !p.expandido }));
  };

  const toggleAcao = (pageId, acaoId) => {
    onPaginasChange((prev) =>
      prev.map((p) => {
        if (p.id !== pageId || !p.acoes) return p;
        return {
          ...p,
          acoes: p.acoes.map((a) =>
            a.id === acaoId ? { ...a, checked: !a.checked } : a
          ),
        };
      })
    );
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

      <div className="space-y-0">
        <Label className="text-base font-medium mb-2 block">Páginas e permissões</Label>
        <p className="text-sm text-muted-foreground mb-3">
          Libere o acesso à página (visualizar) e expanda para configurar ações.
        </p>
        <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
          {paginas.map((pagina) => (
            <div key={pagina.id} className="bg-background">
              <div
                className="flex items-center gap-3 py-3 px-4 hover:bg-muted/30 transition-colors"
                style={{ minHeight: '44px' }}
              >
                <label className="flex items-center gap-3 flex-1 cursor-pointer">
                  <Checkbox
                    checked={pagina.liberado}
                    onCheckedChange={() => toggleLiberado(pagina)}
                  />
                  <span className="text-sm font-medium text-foreground">{pagina.nome}</span>
                </label>
                {pagina.liberado && hasAcoes(pagina) && (
                  <button
                    type="button"
                    onClick={() => toggleExpandido(pagina)}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    aria-expanded={pagina.expandido}
                  >
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${pagina.expandido ? 'rotate-180' : ''}`}
                      aria-hidden
                    />
                  </button>
                )}
              </div>
              {pagina.liberado && hasAcoes(pagina) && pagina.expandido && (
                <div className="border-t border-border bg-slate-50 w-full pl-12 pr-4 py-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Ações permitidas</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(pagina.acoes || []).map((acao) => (
                      <label
                        key={acao.id}
                        className={`flex items-center gap-2 rounded-md py-2 px-2.5 cursor-pointer transition-colors hover:bg-muted/50 ${
                          acao.danger ? 'text-destructive' : ''
                        }`}
                      >
                        <Checkbox
                          checked={acao.checked}
                          onCheckedChange={() => toggleAcao(pagina.id, acao.id)}
                        />
                        {acao.danger && (
                          <AlertTriangle
                            className="w-3.5 h-3.5 text-destructive shrink-0"
                            aria-hidden
                          />
                        )}
                        <span
                          className={`text-sm font-medium ${acao.danger ? 'text-destructive' : ''}`}
                        >
                          {acao.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
        <Button type="submit" className="w-full sm:w-auto">
          {submitText}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} className="w-full sm:w-auto">
            Cancelar
          </Button>
        )}
      </div>
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
    paginas: getPaginasInicial(),
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

  const handlePaginasChange = (updater) => {
    setFormData(prev => ({
      ...prev,
      paginas: typeof updater === 'function' ? updater(prev.paginas ?? []) : updater,
    }));
  };

  const handleAddRole = (e) => {
    e.preventDefault();
    if (isReservedRoleName(formData.name)) {
      toast.error('O nome "Admin" é reservado e não pode ser usado para uma nova função.');
      return;
    }
    const permissions = buildPermissionsFromPaginas(formData.paginas);
    api.post('/roles', { name: formData.name, description: formData.description, permissions })
      .then(() => {
        setFormData({ name: '', description: '', paginas: getPaginasInicial() });
        setIsAddDialogOpen(false);
        loadRoles();
        toast.success('Função criada com sucesso!');
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Erro ao criar.'));
  };

  const handleEditRole = (e) => {
    e.preventDefault();
    if (isReservedRoleName(formData.name)) {
      toast.error('O nome "Admin" é reservado e não pode ser alterado.');
      return;
    }
    const permissions = buildPermissionsFromPaginas(formData.paginas);
    api.put(`/roles/${editingRole.id}`, { name: formData.name, description: formData.description, permissions })
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
      paginas: buildPaginasFromPermissions(role.permissions || []),
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
            {/* <p className="text-sm text-muted-foreground">Crie e edite funções e escolha quais páginas cada uma pode acessar.</p> */}
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
              onPaginasChange={handlePaginasChange}
              onSubmit={handleAddRole}
              submitText="Criar Função"
              onCancel={() => setIsAddDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {roles
          .filter((role) => role.name?.toLowerCase() !== 'admin')
          .map((role) => (
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
            onPaginasChange={handlePaginasChange}
            onSubmit={handleEditRole}
            submitText="Salvar Alterações"
            onCancel={() => { setIsEditDialogOpen(false); setEditingRole(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RolesManager;
