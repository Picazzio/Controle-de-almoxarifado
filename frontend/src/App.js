import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import SolicitarProdutos from './pages/SolicitarProdutos';
import Solicitacoes from './pages/Solicitacoes';
import Departments from './pages/Departments';
import Categories from './pages/Categories';
import Users from './pages/Users';
import Roles from './pages/Roles';
import Logs from './pages/Logs';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import { canAccessPath } from './lib/permissions';
import '@/App.css';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;

  if (!canAccessPath(location.pathname, user)) {
    return <Navigate to={canAccessPath('/dashboard', user) ? '/dashboard' : '/profile'} replace />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }
  
  return user ? <Navigate to="/dashboard" /> : children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/register" element={
        <PublicRoute>
          <Register />
        </PublicRoute>
      } />
      <Route path="/" element={
        <PrivateRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/dashboard" element={
        <PrivateRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/products" element={
        <PrivateRoute>
          <Layout>
            <Products />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/solicitar-produtos" element={
        <PrivateRoute>
          <Layout>
            <SolicitarProdutos />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/solicitacoes" element={
        <PrivateRoute>
          <Layout>
            <Solicitacoes />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/departments" element={
        <PrivateRoute>
          <Layout>
            <Departments />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/categories" element={
        <PrivateRoute>
          <Layout>
            <Categories />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/users" element={
        <PrivateRoute>
          <Layout>
            <Users />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/roles" element={
        <PrivateRoute>
          <Layout>
            <Roles />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/logs" element={
        <PrivateRoute>
          <Layout>
            <Logs />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/profile" element={
        <PrivateRoute>
          <Layout>
            <Profile />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/settings" element={
        <PrivateRoute>
          <Layout>
            <Settings />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="sistema-ativos-theme">
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;