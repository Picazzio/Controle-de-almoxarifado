/**
 * Regras de acesso baseadas nas permissões do usuário (retornadas pela API em user.permissions).
 * Se user.permissions não existir, usa role como fallback para compatibilidade.
 */

const RESTRICTED_PATHS_BY_PERMISSION = {
  '/': 'view_dashboard',
  '/dashboard': 'view_dashboard',
  '/users': 'manage_users',
  '/departments': 'manage_users',
  '/categories': 'manage_users',
  '/patrimonio': 'manage_users',
  '/roles': 'manage_roles',
  '/logs': 'view_logs',
  '/solicitar-produtos': 'request_products',
  '/products': 'read',
  '/solicitacoes': 'view_stock_requests',
};

export function hasPermission(user, permissionName) {
  if (!user) return false;
  const permissions = user.permissions;
  if (Array.isArray(permissions)) {
    return permissions.includes(permissionName);
  }
  // Fallback por role quando permissions não vier da API
  const role = user.role;
  if (role === 'Admin') return true;
  if (role === 'Visualizador') return ['view_dashboard', 'read'].includes(permissionName);
  if (role === 'Gerente') {
    return ['view_dashboard', 'create', 'read', 'update', 'delete', 'view_logs', 'export_data'].includes(permissionName);
  }
  if (role === 'Operador') {
    return ['view_dashboard', 'create', 'read', 'update'].includes(permissionName);
  }
  return false;
}

export function canAccessPath(pathname, user) {
  if (!user) return false;
  for (const [path, permission] of Object.entries(RESTRICTED_PATHS_BY_PERMISSION)) {
    if (pathname === path || pathname.startsWith(path + '/')) {
      return hasPermission(user, permission);
    }
  }
  return true;
}

export function canAccessUsers(user) {
  return hasPermission(user, 'manage_users');
}

export function canAccessDepartments(user) {
  return hasPermission(user, 'manage_users');
}

export function canAccessCategories(user) {
  return hasPermission(user, 'manage_users');
}

export function canAccessPatrimonio(user) {
  return hasPermission(user, 'manage_users');
}

export function canAccessLogs(user) {
  return hasPermission(user, 'view_logs');
}

export function canAccessSettings(user) {
  return hasPermission(user, 'manage_roles');
}

export function canAccessRoles(user) {
  return hasPermission(user, 'manage_roles');
}

export function isViewer(user) {
  return user?.role === 'Visualizador' && (!user?.permissions?.length || (user.permissions.length === 1 && user.permissions[0] === 'read'));
}

/** Acesso à página de Produtos (estoque completo) */
export function canAccessProductsPage(user) {
  return hasPermission(user, 'read');
}

/** Produtos: só leitura (sem criar, editar, excluir, exportar) */
export function canCreateProducts(user) {
  return hasPermission(user, 'create');
}

export function canUpdateProducts(user) {
  return hasPermission(user, 'update');
}

export function canDeleteProducts(user) {
  return hasPermission(user, 'delete');
}

export function canExportData(user) {
  return hasPermission(user, 'export_data');
}

/** Ver lista de solicitações de produtos (todas as solicitações) */
export function canViewStockRequests(user) {
  return hasPermission(user, 'view_stock_requests');
}

/** Visualizar e solicitar itens na página Solicitar Produtos */
export function canRequestProducts(user) {
  return hasPermission(user, 'request_products');
}

/** Acesso à página Dashboard */
export function canAccessDashboard(user) {
  return hasPermission(user, 'view_dashboard');
}
