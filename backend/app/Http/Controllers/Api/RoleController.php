<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

class RoleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->can('manage_roles')) {
            return response()->json(['message' => 'Sem permissão para visualizar funções.'], 403);
        }
        $roles = DB::table('roles')
            ->where('guard_name', 'web')
            ->orderBy('name')
            ->get()
            ->map(function ($role) {
                $userCount = DB::table('model_has_roles')
                    ->where('model_has_roles.role_id', $role->id)
                    ->where('model_has_roles.model_type', User::class)
                    ->count();
                $permissionNames = DB::table('role_has_permissions')
                    ->join('permissions', 'permissions.id', '=', 'role_has_permissions.permission_id')
                    ->where('role_has_permissions.role_id', $role->id)
                    ->pluck('permissions.name')
                    ->values()
                    ->all();
                return [
                    'id' => $role->id,
                    'name' => $role->name,
                    'description' => $this->roleDescription($role->name),
                    'user_count' => $userCount,
                    'permissions' => $permissionNames,
                ];
            });
        return response()->json($roles);
    }

    public function store(Request $request): JsonResponse
    {
        if (!$request->user()->can('manage_roles')) {
            return response()->json(['message' => 'Sem permissão para criar funções.'], 403);
        }
        $validPermissionNames = DB::table('permissions')->where('guard_name', 'web')->pluck('name')->all();
        $permissions = is_array($request->permissions) ? array_values(array_intersect($request->permissions, $validPermissionNames)) : [];
        $request->merge(['permissions' => $permissions]);
        $request->validate([
            'name' => 'required|string|max:255|unique:roles,name',
            'description' => 'nullable|string',
            'permissions' => 'array',
            'permissions.*' => 'string',
        ]);
        $roleId = DB::table('roles')->insertGetId([
            'name' => $request->name,
            'guard_name' => 'web',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        if ($request->filled('permissions')) {
            $permissionIds = DB::table('permissions')
                ->whereIn('name', $request->permissions)
                ->where('guard_name', 'web')
                ->pluck('id');
            foreach ($permissionIds as $permId) {
                DB::table('role_has_permissions')->insert([
                    'permission_id' => $permId,
                    'role_id' => $roleId,
                ]);
            }
            app(PermissionRegistrar::class)->forgetCachedPermissions();
        }
        $permissionNames = DB::table('role_has_permissions')
            ->join('permissions', 'permissions.id', '=', 'role_has_permissions.permission_id')
            ->where('role_has_permissions.role_id', $roleId)
            ->pluck('permissions.name')
            ->values()
            ->all();
        return response()->json([
            'id' => $roleId,
            'name' => $request->name,
            'description' => $request->description ?? $this->roleDescription($request->name),
            'user_count' => 0,
            'permissions' => $permissionNames,
        ], 201);
    }

    public function show(Request $request, int $role): JsonResponse
    {
        if (!$request->user()->can('manage_roles')) {
            return response()->json(['message' => 'Sem permissão para visualizar funções.'], 403);
        }
        $roleRow = DB::table('roles')->where('id', $role)->where('guard_name', 'web')->first();
        if (!$roleRow) {
            return response()->json(['message' => 'Função não encontrada.'], 404);
        }
        $userCount = DB::table('model_has_roles')
            ->where('model_has_roles.role_id', $roleRow->id)
            ->where('model_has_roles.model_type', User::class)
            ->count();
        $permissionNames = DB::table('role_has_permissions')
            ->join('permissions', 'permissions.id', '=', 'role_has_permissions.permission_id')
            ->where('role_has_permissions.role_id', $roleRow->id)
            ->pluck('permissions.name')
            ->values()
            ->all();
        return response()->json([
            'id' => $roleRow->id,
            'name' => $roleRow->name,
            'description' => $this->roleDescription($roleRow->name),
            'user_count' => $userCount,
            'permissions' => $permissionNames,
        ]);
    }

    public function update(Request $request, int $role): JsonResponse
    {
        if (!$request->user()->can('manage_roles')) {
            return response()->json(['message' => 'Sem permissão para editar funções.'], 403);
        }
        $roleRow = DB::table('roles')->where('id', $role)->where('guard_name', 'web')->first();
        if (!$roleRow) {
            return response()->json(['message' => 'Função não encontrada.'], 404);
        }
        $validPermissionNames = DB::table('permissions')->where('guard_name', 'web')->pluck('name')->all();
        $permissions = is_array($request->permissions) ? array_values(array_intersect($request->permissions, $validPermissionNames)) : [];
        $request->merge(['permissions' => $permissions]);
        $request->validate([
            'name' => 'sometimes|string|max:255|unique:roles,name,' . $roleRow->id,
            'description' => 'nullable|string',
            'permissions' => 'array',
            'permissions.*' => 'string',
        ]);
        if ($request->filled('name')) {
            DB::table('roles')->where('id', $roleRow->id)->update([
                'name' => $request->name,
                'updated_at' => now(),
            ]);
        }
        if (array_key_exists('permissions', $request->all())) {
            DB::table('role_has_permissions')->where('role_id', $roleRow->id)->delete();
            if (!empty($request->permissions)) {
                $permissionIds = DB::table('permissions')
                    ->whereIn('name', $request->permissions)
                    ->where('guard_name', 'web')
                    ->pluck('id');
                foreach ($permissionIds as $permId) {
                    DB::table('role_has_permissions')->insert([
                        'permission_id' => $permId,
                        'role_id' => $roleRow->id,
                    ]);
                }
            }
            app(PermissionRegistrar::class)->forgetCachedPermissions();
        }
        $roleRow = DB::table('roles')->where('id', $roleRow->id)->first();
        $userCount = DB::table('model_has_roles')
            ->where('model_has_roles.role_id', $roleRow->id)
            ->where('model_has_roles.model_type', User::class)
            ->count();
        $permissionNames = DB::table('role_has_permissions')
            ->join('permissions', 'permissions.id', '=', 'role_has_permissions.permission_id')
            ->where('role_has_permissions.role_id', $roleRow->id)
            ->pluck('permissions.name')
            ->values()
            ->all();
        return response()->json([
            'id' => $roleRow->id,
            'name' => $roleRow->name,
            'description' => $request->description ?? $this->roleDescription($roleRow->name),
            'user_count' => $userCount,
            'permissions' => $permissionNames,
        ]);
    }

    public function destroy(Request $request, int $role): JsonResponse
    {
        if (!$request->user()->can('manage_roles')) {
            return response()->json(['message' => 'Sem permissão para excluir funções.'], 403);
        }
        $roleRow = DB::table('roles')->where('id', $role)->where('guard_name', 'web')->first();
        if (!$roleRow) {
            return response()->json(['message' => 'Função não encontrada.'], 404);
        }
        $userCount = DB::table('model_has_roles')
            ->where('model_has_roles.role_id', $roleRow->id)
            ->where('model_has_roles.model_type', User::class)
            ->count();
        if ($userCount > 0) {
            return response()->json(['message' => 'Não é possível excluir função com usuários associados.'], 422);
        }
        DB::table('role_has_permissions')->where('role_id', $roleRow->id)->delete();
        DB::table('roles')->where('id', $roleRow->id)->delete();
        return response()->json(null, 204);
    }

    public function permissions(Request $request): JsonResponse
    {
        if (!$request->user()->can('manage_roles')) {
            return response()->json(['message' => 'Sem permissão para visualizar permissões.'], 403);
        }
        $labels = [
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
        $permissions = DB::table('permissions')
            ->where('guard_name', 'web')
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(function ($p) use ($labels) {
                return [
                    'id' => $p->name,
                    'name' => $p->name,
                    'label' => $labels[$p->name] ?? $p->name,
                ];
            });
        return response()->json($permissions);
    }

    private function roleDescription(string $name): string
    {
        $descriptions = [
            'Admin' => 'Acesso total ao sistema',
            'Gerente' => 'Gerenciamento de produtos e usuários',
            'Operador' => 'Operações básicas de produtos',
            'Visualizador' => 'Apenas visualização',
        ];
        return $descriptions[$name] ?? '';
    }
}
