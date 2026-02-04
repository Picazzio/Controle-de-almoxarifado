<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'view_dashboard' => 'Acessar Dashboard',
            'create' => 'Criar',
            'read' => 'Visualizar',
            'update' => 'Editar',
            'delete' => 'Excluir',
            'manage_users' => 'Gerenciar Usuários',
            'manage_roles' => 'Gerenciar Permissões',
            'view_logs' => 'Ver Logs',
            'export_data' => 'Exportar Dados',
            'view_stock_requests' => 'Ver Solicitações de Produtos',
            'request_products' => 'Solicitar Produtos',
        ];

        foreach ($permissions as $name => $label) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        $adminRole = Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
        $adminRole->givePermissionTo(Permission::all());

        $gerenteRole = Role::firstOrCreate(['name' => 'Gerente', 'guard_name' => 'web']);
        $gerenteRole->syncPermissions(['view_dashboard', 'create', 'read', 'update', 'delete', 'view_logs', 'export_data']);

        $operadorRole = Role::firstOrCreate(['name' => 'Operador', 'guard_name' => 'web']);
        $operadorRole->syncPermissions(['view_dashboard', 'create', 'read', 'update']);

        $visualizadorRole = Role::firstOrCreate(['name' => 'Visualizador', 'guard_name' => 'web']);
        $visualizadorRole->syncPermissions(['view_dashboard', 'read']);

        foreach (Role::all() as $role) {
            $role->givePermissionTo('view_dashboard');
        }
    }
}
