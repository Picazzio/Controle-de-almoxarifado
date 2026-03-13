import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { hasPermission, canAccessLogs } from '../lib/permissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Checkbox } from '../components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import RolesManager from '../components/RolesManager';
import Logs from './Logs';
import { Shield, Bell, Mail, Smartphone, Settings as SettingsIcon, Clock } from 'lucide-react';
import { toast } from 'sonner';

const ALERTS_STORAGE_KEY = 'sistema-ativos-alerts';

const defaultAlertSettings = {
  enabled: true,
  inApp: true,
  email: false,
  events: {
    newUsers: true,
    productChanges: true,
    importantLogs: true,
    systemSecurity: true,
  },
};

const Settings = () => {
  const { user } = useAuth();
  const canManageRoles = hasPermission(user, 'manage_roles');
  const isAdmin = user?.role === 'Admin';
  const canViewLogs = canAccessLogs(user);

  const [alertSettings, setAlertSettings] = useState(defaultAlertSettings);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(ALERTS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setAlertSettings((prev) => ({
          ...defaultAlertSettings,
          ...prev,
          ...parsed,
          events: { ...defaultAlertSettings.events, ...(parsed.events || {}) },
        }));
      }
    } catch {
      // mantém default
    }
  }, []);

  const saveAlertSettings = (next) => {
    setAlertSettings(next);
    try {
      localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  const handleAlertToggle = (key, value) => {
    const next = { ...alertSettings, [key]: value };
    saveAlertSettings(next);
    toast.success('Preferências de alertas salvas.');
  };

  const handleEventToggle = (eventKey, checked) => {
    const next = {
      ...alertSettings,
      events: { ...alertSettings.events, [eventKey]: checked },
    };
    saveAlertSettings(next);
    toast.success('Preferências de alertas salvas.');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
        {/* <p className="text-muted-foreground mt-1">Preferências do sistema</p> */}
      </div>

      <Tabs defaultValue="alerts" className="w-full">
        <TabsList className="grid w-full mb-4" style={{ gridTemplateColumns: `repeat(${1 + (canManageRoles ? 1 : 0) + (canViewLogs ? 1 : 0) + (isAdmin ? 1 : 0)}, minmax(0, 1fr))` }}>
          {canManageRoles && (
            <TabsTrigger value="permissions" className="gap-2">
              <Shield className="w-4 h-4" />
              Permissões
            </TabsTrigger>
          )}
          <TabsTrigger value="alerts" className="gap-2">
            <Bell className="w-4 h-4" />
            Alertas
          </TabsTrigger>
          {canViewLogs && (
            <TabsTrigger value="logs" className="gap-2">
              <Clock className="w-4 h-4" />
              Logs
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="gerais" className="gap-2">
              <SettingsIcon className="w-4 h-4" />
              Gerais
            </TabsTrigger>
          )}
        </TabsList>

        {canManageRoles && (
          <TabsContent value="permissions">
            <RolesManager embedded />
          </TabsContent>
        )}

        <TabsContent value="alerts">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-muted-foreground" />
                Alertas
              </CardTitle>
              {/* <CardDescription>
                Configure onde e sobre o que deseja receber notificações.
              </CardDescription> */}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="alerts-enabled" className="text-base font-medium text-foreground cursor-pointer">
                    Ativar notificações
                  </Label>
                  {/* <p className="text-sm text-muted-foreground">Receber alertas do sistema.</p> */}
                </div>
                <Switch
                  id="alerts-enabled"
                  checked={alertSettings.enabled}
                  onCheckedChange={(checked) => handleAlertToggle('enabled', checked)}
                />
              </div>

              {alertSettings.enabled && (
                <>
                  <div className="space-y-3">
                    <Label className="text-foreground">Onde receber alertas</Label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex items-center justify-between rounded-lg border border-border p-4">
                        <div className="flex items-center gap-3">
                          <Smartphone className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-foreground">No sistema</p>
                            {/* <p className="text-xs text-muted-foreground">Sino no header</p> */}
                          </div>
                        </div>
                        <Switch
                          checked={alertSettings.inApp}
                          onCheckedChange={(checked) => handleAlertToggle('inApp', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-border p-4">
                        <div className="flex items-center gap-3">
                          <Mail className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-foreground">Por e-mail</p>
                            {/* <p className="text-xs text-muted-foreground">Enviar para seu e-mail</p> */}
                          </div>
                        </div>
                        <Switch
                          checked={alertSettings.email}
                          onCheckedChange={(checked) => handleAlertToggle('email', checked)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-foreground">Sobre o que ser notificado</Label>
                    <div className="space-y-2 rounded-lg border border-border p-4">
                      <label className="flex items-center gap-3 cursor-pointer rounded-md py-2 hover:bg-muted/50 px-2 -mx-2">
                        <Checkbox
                          checked={alertSettings.events.newUsers}
                          onCheckedChange={(checked) => handleEventToggle('newUsers', !!checked)}
                        />
                        <span className="text-sm text-foreground">Novos usuários cadastrados</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer rounded-md py-2 hover:bg-muted/50 px-2 -mx-2">
                        <Checkbox
                          checked={alertSettings.events.productChanges}
                          onCheckedChange={(checked) => handleEventToggle('productChanges', !!checked)}
                        />
                        <span className="text-sm text-foreground">Alterações em produtos</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer rounded-md py-2 hover:bg-muted/50 px-2 -mx-2">
                        <Checkbox
                          checked={alertSettings.events.importantLogs}
                          onCheckedChange={(checked) => handleEventToggle('importantLogs', !!checked)}
                        />
                        <span className="text-sm text-foreground">Logs de atividade importantes</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer rounded-md py-2 hover:bg-muted/50 px-2 -mx-2">
                        <Checkbox
                          checked={alertSettings.events.systemSecurity}
                          onCheckedChange={(checked) => handleEventToggle('systemSecurity', !!checked)}
                        />
                        <span className="text-sm text-foreground">Alertas de sistema e segurança</span>
                      </label>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {canViewLogs && (
          <TabsContent value="logs" className="mt-0">
            <Logs />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="gerais">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5 text-muted-foreground" />
                  Gerais
                </CardTitle>
                <CardDescription>
                  Configurações gerais do sistema. Opções adicionais poderão ser incluídas aqui.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Nenhuma opção configurável no momento. Esta aba está disponível para futuras configurações gerais.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Settings;
