import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Package, Mail, Lock, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/login', { email, password });
      login(data.user, data.token);
      toast.success('Login realizado com sucesso!');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.email?.[0] || 'Erro ao fazer login. Tente novamente.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0c4a6e] to-[#1e40af] px-8 py-10 text-center">
            <div className="flex justify-center mb-4">
              <div className={`w-24 h-24 rounded-2xl flex items-center justify-center overflow-hidden ${logoError ? 'bg-white/20 backdrop-blur-md shadow-xl' : ''}`}>
                {!logoError ? (
                  <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" onError={() => setLogoError(true)} />
                ) : (
                  <Package className="w-12 h-12 text-white" />
                )}
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Bem-vindo de volta</h1>
            <p className="text-blue-100 text-sm">Sistema de Gestão de Ativos de TI</p>
          </div>

          {/* Form */}
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-medium">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    data-testid="login-email-input"
                    type="email"
                    placeholder="seu.email@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-11 h-12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground font-medium">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    data-testid="login-password-input"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-11 h-12"
                  />
                </div>
              </div>

              <Button
                type="submit"
                data-testid="login-submit-btn"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-[#0c4a6e] to-[#1e40af] hover:from-[#0c4a6e] hover:to-[#1e3a8a] text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 group"
              >
                {loading ? (
                  <span>Entrando...</span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Entrar
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Não tem uma conta?{' '}
                <Link
                  to="/register"
                  data-testid="register-link"
                  className="text-primary font-semibold hover:underline transition-colors"
                >
                  Registre-se
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Sistema seguro para gestão de ativos corporativos
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;