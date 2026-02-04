<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->can('manage_users')) {
            return response()->json(['message' => 'Sem permissão para listar usuários.'], 403);
        }
        $query = User::with(['department'])
            ->selectRaw('users.*, (SELECT r.name FROM model_has_roles mhr JOIN roles r ON r.id = mhr.role_id WHERE mhr.model_type = ? AND mhr.model_id = users.id LIMIT 1) as role_name', [User::class]);
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('users.name', 'like', "%{$s}%")->orWhere('users.email', 'like', "%{$s}%");
            });
        }
        if ($request->filled('role')) {
            $query->whereExists(function ($q) use ($request) {
                $q->select(DB::raw(1))
                    ->from('model_has_roles')
                    ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                    ->whereColumn('model_has_roles.model_id', 'users.id')
                    ->where('model_has_roles.model_type', User::class)
                    ->where('roles.name', $request->role);
            });
        }
        $sortBy = $request->get('sort_by', 'name');
        $sortDir = strtolower($request->get('sort_dir', 'asc')) === 'desc' ? 'desc' : 'asc';
        $allowedSort = ['code', 'name', 'email', 'role_name', 'join_date', 'created_at'];
        if (in_array($sortBy, $allowedSort)) {
            if ($sortBy === 'role_name') {
                $query->orderByRaw('(SELECT r.name FROM model_has_roles mhr JOIN roles r ON r.id = mhr.role_id WHERE mhr.model_type = ? AND mhr.model_id = users.id LIMIT 1) ' . $sortDir, [User::class]);
            } else {
                $col = $sortBy === 'join_date' ? 'users.join_date' : 'users.' . $sortBy;
                $query->orderBy($col, $sortDir);
            }
        } else {
            $query->orderBy('users.name', 'asc');
        }
        $users = $query->paginate($request->get('per_page', 50));
        $items = $users->getCollection()->map(fn ($u) => $this->formatUserFromAttributes($u));
        $users->setCollection($items);
        return response()->json($users);
    }

    public function store(Request $request): JsonResponse
    {
        if (!$request->user()->can('manage_users')) {
            return response()->json(['message' => 'Sem permissão para criar usuários.'], 403);
        }
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => ['required', Password::min(6)],
            'role' => 'required|string|exists:roles,name',
            'department_id' => 'nullable|exists:departments,id',
            'status' => 'nullable|in:active,inactive',
        ]);
        $code = $this->generateUserCode();
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'code' => $code,
            'department_id' => $request->department_id,
            'status' => $request->get('status', 'active'),
            'join_date' => $request->get('join_date', now()->format('Y-m-d')),
        ]);
        $roleId = DB::table('roles')->where('name', $request->role)->where('guard_name', 'web')->value('id');
        if ($roleId) {
            DB::table('model_has_roles')->insert([
                'role_id' => $roleId,
                'model_type' => User::class,
                'model_id' => $user->id,
            ]);
        }
        return response()->json($this->formatUserFromAttributes($user->load('department')->setAttribute('role_name', $request->role)), 201);
    }

    public function show(Request $request, User $user): JsonResponse
    {
        if (!$request->user()->can('manage_users')) {
            return response()->json(['message' => 'Sem permissão para visualizar usuários.'], 403);
        }
        $user->load('department');
        $roleName = DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_type', User::class)
            ->where('model_has_roles.model_id', $user->id)
            ->value('roles.name');
        $user->setAttribute('role_name', $roleName);
        return response()->json($this->formatUserFromAttributes($user));
    }

    public function update(Request $request, User $user): JsonResponse
    {
        if (!$request->user()->can('manage_users')) {
            return response()->json(['message' => 'Sem permissão para editar usuários.'], 403);
        }
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'password' => ['nullable', Password::min(6)],
            'role' => 'sometimes|string|exists:roles,name',
            'department_id' => 'nullable|exists:departments,id',
            'status' => 'nullable|in:active,inactive',
            'join_date' => 'nullable|date',
        ]);
        $data = $request->only(['name', 'email', 'department_id', 'status', 'join_date']);
        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }
        $user->update($data);
        if ($request->filled('role')) {
            DB::table('model_has_roles')
                ->where('model_type', User::class)
                ->where('model_id', $user->id)
                ->delete();
            $roleId = DB::table('roles')->where('name', $request->role)->where('guard_name', 'web')->value('id');
            if ($roleId) {
                DB::table('model_has_roles')->insert([
                    'role_id' => $roleId,
                    'model_type' => User::class,
                    'model_id' => $user->id,
                ]);
            }
        }
        $user = $user->fresh('department');
        $roleName = DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_type', User::class)
            ->where('model_has_roles.model_id', $user->id)
            ->value('roles.name');
        $user->setAttribute('role_name', $roleName);
        return response()->json($this->formatUserFromAttributes($user));
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if (!$request->user()->can('manage_users')) {
            return response()->json(['message' => 'Sem permissão para excluir usuários.'], 403);
        }
        $user->delete();
        return response()->json(null, 204);
    }

    private function formatUserFromAttributes(User $user): array
    {
        $roleName = $user->getAttribute('role_name') ?? '-';
        return [
            'id' => $user->id,
            'code' => $user->code,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $roleName,
            'department' => $user->department?->name,
            'department_id' => $user->department_id,
            'status' => $user->status === 'active' ? 'Ativo' : 'Inativo',
            'status_key' => $user->status,
            'join_date' => $user->join_date?->format('Y-m-d'),
        ];
    }

    private function generateUserCode(): string
    {
        $last = User::whereNotNull('code')
            ->get()
            ->max(fn ($u) => preg_match('/^\d{4}$/', (string) $u->code) ? (int) $u->code : 0);
        $num = ($last ?? 0) + 1;
        return str_pad((string) $num, 4, '0', STR_PAD_LEFT);
    }
}
