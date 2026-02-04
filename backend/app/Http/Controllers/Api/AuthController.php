<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if (!Auth::attempt($request->only('email', 'password'))) {
            throw ValidationException::withMessages(['email' => ['Credenciais inválidas.']]);
        }

        $user = User::where('email', $request->email)->with('department')->first();
        $user->setAttribute('role_name', $this->getUserRoleName($user->id));
        $user->tokens()->delete();
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'user' => $this->formatUser($user),
            'token' => $token,
            'token_type' => 'Bearer',
        ]);
    }

    public function register(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => ['required', 'confirmed', Password::min(6)],
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'status' => 'active',
            'join_date' => now(),
        ]);

        $roleId = DB::table('roles')->where('name', 'Visualizador')->where('guard_name', 'web')->value('id');
        if ($roleId) {
            DB::table('model_has_roles')->insert([
                'role_id' => $roleId,
                'model_type' => User::class,
                'model_id' => $user->id,
            ]);
        }
        $user->load('department');
        $user->setAttribute('role_name', 'Visualizador');
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'user' => $this->formatUser($user),
            'token' => $token,
            'token_type' => 'Bearer',
        ], 201);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logout realizado com sucesso.']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('department');
        $user->setAttribute('role_name', $this->getUserRoleName($user->id));
        return response()->json(['user' => $this->formatUser($user)]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $user->id,
            'password' => ['nullable', 'confirmed', Password::min(6)],
        ]);
        $data = ['name' => $request->name, 'email' => $request->email];
        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }
        $user->update($data);
        $user = $user->fresh('department');
        $user->setAttribute('role_name', $this->getUserRoleName($user->id));
        return response()->json(['user' => $this->formatUser($user)]);
    }

    private function getUserRoleName(int $userId): string
    {
        return DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_type', User::class)
            ->where('model_has_roles.model_id', $userId)
            ->value('roles.name') ?? 'Visualizador';
    }

    private function formatUser(User $user): array
    {
        $roleName = $user->getAttribute('role_name') ?? $this->getUserRoleName($user->id);
        $permissions = $this->getUserPermissions($user->id, $roleName);
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $roleName,
            'permissions' => $permissions,
            'department' => $user->department?->name,
            'department_id' => $user->department_id,
            'status' => $user->status === 'active' ? 'Ativo' : 'Inativo',
            'join_date' => $user->join_date?->format('Y-m-d'),
        ];
    }

    /**
     * Obtém as permissões do usuário usando guard 'web' (evita guard mismatch em API/Sanctum).
     * Admin recebe todas as permissões.
     */
    private function getUserPermissions(int $userId, string $roleName): array
    {
        if ($roleName === 'Admin') {
            return DB::table('permissions')
                ->where('guard_name', 'web')
                ->pluck('name')
                ->values()
                ->all();
        }
        return DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->join('role_has_permissions', 'role_has_permissions.role_id', '=', 'roles.id')
            ->join('permissions', 'permissions.id', '=', 'role_has_permissions.permission_id')
            ->where('model_has_roles.model_type', User::class)
            ->where('model_has_roles.model_id', $userId)
            ->where('roles.guard_name', 'web')
            ->where('permissions.guard_name', 'web')
            ->pluck('permissions.name')
            ->values()
            ->unique()
            ->values()
            ->all();
    }
}
