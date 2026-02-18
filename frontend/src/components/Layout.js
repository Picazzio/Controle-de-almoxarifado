import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { canAccessUsers, canAccessLogs, canAccessDepartments, canAccessCategories, canAccessPatrimonio, canRequestProducts, canAccessProductsPage, canViewStockRequests, canAccessDashboard } from '../lib/permissions';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Inbox,
  Users,
  Building2,
  FolderTree,
  Tag,
  Clock,
  Menu,
  X,
  LogOut,
  User,
  ChevronRight,
  Settings,
  Bell
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const fetchNotifications = useCallback((options = {}) => {
    const { silent = false } = options;
    if (!silent) setLoadingNotifications(true);
    api.get('/notifications', { params: { limit: 15 } })
      .then((res) => {
        setNotifications(res.data?.notifications ?? []);
        setUnreadCount(res.data?.unread_count ?? 0);
      })
      .catch(() => {})
      .finally(() => { if (!silent) setLoadingNotifications(false); });
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    fetchNotifications();
    const interval = setInterval(() => fetchNotifications({ silent: true }), 25 * 1000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications({ silent: true });
        window.dispatchEvent(new CustomEvent('app:refocus'));
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [user?.id, fetchNotifications]);

  const handleNotificationOpen = (open) => {
    setNotificationsOpen(open);
    if (open) fetchNotifications();
  };

  const markAsRead = (id, link) => {
    api.patch(`/notifications/${id}/read`).catch(() => {});
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    if (link) {
      setNotificationsOpen(false);
      navigate(link);
    }
  };

  const markAllAsRead = () => {
    api.post('/notifications/read-all').then(() => {
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    }).catch(() => {});
  };

  const clearNotifications = () => {
    api.delete('/notifications').then(() => {
      setNotifications([]);
      setUnreadCount(0);
    }).catch(() => {});
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    ...(canAccessDashboard(user) ? [{ name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }] : []),
    ...(canAccessProductsPage(user) ? [{ name: 'Produtos', href: '/products', icon: Package }] : []),
    ...(canRequestProducts(user) ? [{ name: 'Solicitar Produtos', href: '/solicitar-produtos', icon: ClipboardList }] : []),
    ...(canAccessDepartments(user) ? [{ name: 'Departamentos', href: '/departments', icon: Building2 }] : []),
    ...(canAccessCategories(user) ? [{ name: 'Categorias', href: '/categories', icon: FolderTree }] : []),
    ...(canAccessPatrimonio(user) ? [{ name: 'Patrimônio', href: '/patrimonio', icon: Tag }] : []),
    ...(canAccessUsers(user) ? [{ name: 'Usuários', href: '/users', icon: Users }] : []),
    ...(canViewStockRequests(user) ? [{ name: 'Solicitações', href: '/solicitacoes', icon: Inbox }] : []),
    ...(canAccessLogs(user) ? [{ name: 'Logs de Atividade', href: '/logs', icon: Clock }] : []),
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border shadow-sm">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              data-testid="menu-toggle-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors text-foreground"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden ${logoError ? 'bg-gradient-to-br from-[#0c4a6e] to-[#1e40af] shadow-lg' : ''}`}>
                {!logoError ? (
                  <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" onError={() => setLogoError(true)} />
                ) : (
                  <Package className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Sistema de Gestão</h1>
                <p className="text-xs text-muted-foreground">Controle de Ativos de TI</p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button data-testid="user-menu-btn" variant="ghost" className="flex items-center gap-2 hover:bg-muted text-foreground">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0c4a6e] to-[#1e40af] flex items-center justify-center text-white font-semibold shadow-md">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-semibold text-foreground">{user?.name || 'Usuário'}</p>
                    <p className="text-xs text-muted-foreground">{user?.role || 'Admin'}</p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center gap-3 p-2">
                  <Avatar className="h-10 w-10 rounded-full bg-gradient-to-br from-[#0c4a6e] to-[#1e40af]">
                    {user?.avatar && <AvatarImage src={user.avatar} alt={user?.name} />}
                    <AvatarFallback className="rounded-full bg-transparent text-sm font-semibold text-white">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{user?.name || 'Usuário'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email || ''}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="cursor-pointer flex items-center">
                    <Settings className="w-4 h-4 mr-2" />
                    Configurações
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem data-testid="logout-btn" onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu open={notificationsOpen} onOpenChange={handleNotificationOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-lg hover:bg-muted text-foreground relative"
                  aria-label="Notificações"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                  <span className="font-semibold text-sm flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Notificações
                  </span>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllAsRead}>
                      Marcar todas como lidas
                    </Button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {loadingNotifications ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">Carregando...</div>
                  ) : notifications.length === 0 ? (
                    <div className="py-6 px-3 text-center text-sm text-muted-foreground">
                      Nenhuma notificação no momento.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => markAsRead(n.id, n.link)}
                        className={`w-full text-left px-3 py-2.5 border-b border-border last:border-0 hover:bg-muted/50 transition-colors ${!n.read_at ? 'bg-primary/5' : ''}`}
                      >
                        <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{n.created_at}</p>
                      </button>
                    ))
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="border-t border-border px-3 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs h-8 text-muted-foreground hover:text-foreground"
                      onClick={clearNotifications}
                    >
                      Limpar notificações
                    </Button>
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Sidebar / Menu mobile - z-[100] para abrir por cima do header (z-50) e itens não ficarem escondidos */}
      <aside
        className={`fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out z-[100] lg:z-40 lg:top-16 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <nav className="p-4 pt-20 space-y-2 lg:pt-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center justify-between px-4 py-3 rounded-lg transition-all group ${
                  active
                    ? 'bg-gradient-to-r from-[#0c4a6e] to-[#1e40af] text-white shadow-md'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${
                    active ? 'text-white' : 'text-muted-foreground group-hover:text-primary'
                  }`} />
                  <span className="font-medium">{item.name}</span>
                </div>
                {active && <ChevronRight className="w-4 h-4" />}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content - pt compensa o header fixo (nada fica atrás do header) */}
      <main className="pt-20 lg:pl-64 min-h-screen lg:pt-16">
        <div className="p-6">
          {children}
        </div>
      </main>

      {/* Overlay for mobile - z-[99] para ficar acima do header e abaixo do menu (z-[100]) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-[99] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;