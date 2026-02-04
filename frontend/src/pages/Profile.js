import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { User, Mail, Lock, Save } from 'lucide-react';
import { toast } from 'sonner';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
      }));
    }
  }, [user?.id, user?.name, user?.email]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.password && formData.password !== formData.password_confirmation) {
      toast.error('As senhas não coincidem.');
      return;
    }
    setSaving(true);
    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
    };
    if (formData.password) {
      payload.password = formData.password;
      payload.password_confirmation = formData.password_confirmation;
    }
    api
      .put('/me', payload)
      .then((res) => {
        if (res.data?.user) {
          updateUser(res.data.user);
          setFormData((prev) => ({ ...prev, password: '', password_confirmation: '' }));
          toast.success('Perfil atualizado com sucesso!');
        }
      })
      .catch((err) => {
        const msg = err.response?.data?.message || err.response?.data?.errors?.email?.[0] || 'Erro ao atualizar perfil.';
        toast.error(msg);
      })
      .finally(() => setSaving(false));
  };

  if (!user) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Meu Perfil</h1>
        <p className="text-muted-foreground mt-1">Atualize seus dados e senha</p>
      </div>

      <Card className="border-border max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 rounded-xl bg-gradient-to-br from-[#0c4a6e] to-[#1e40af]">
              <AvatarFallback className="rounded-xl bg-transparent text-2xl text-white">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">{user.name}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
              <Badge variant="secondary" className="mt-2">
                {user.role || 'Usuário'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">
                <User className="inline w-4 h-4 mr-2 text-muted-foreground" />
                Nome
              </Label>
              <Input
                id="profile-name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Seu nome"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">
                <Mail className="inline w-4 h-4 mr-2 text-muted-foreground" />
                E-mail
              </Label>
              <Input
                id="profile-email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="seu@email.com"
                required
              />
            </div>
            <div className="pt-4 border-t border-border space-y-4">
              <p className="text-sm font-medium text-foreground">Alterar senha (opcional)</p>
              <div className="space-y-2">
                <Label htmlFor="profile-password">
                  <Lock className="inline w-4 h-4 mr-2 text-muted-foreground" />
                  Nova senha
                </Label>
                <Input
                  id="profile-password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-password-confirmation">Confirmar nova senha</Label>
                <Input
                  id="profile-password-confirmation"
                  name="password_confirmation"
                  type="password"
                  value={formData.password_confirmation}
                  onChange={handleInputChange}
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={saving}
              className="bg-gradient-to-r from-[#0c4a6e] to-[#1e40af]"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
