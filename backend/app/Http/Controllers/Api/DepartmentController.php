<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Department::query();
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where('name', 'like', "%{$s}%");
        }
        $sortBy = $request->get('sort_by', 'name');
        $sortDir = strtolower($request->get('sort_dir', 'asc')) === 'desc' ? 'desc' : 'asc';
        $allowedSort = ['id', 'code', 'name', 'created_at'];
        if (in_array($sortBy, $allowedSort)) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            $query->orderBy('name', 'asc');
        }
        $departments = $query->get(['id', 'name', 'code', 'created_at']);
        $items = $departments->map(fn ($d) => [
            'id' => $d->id,
            'name' => $d->name,
            'code' => $d->code,
            'created_at' => $d->created_at->toIso8601String(),
        ]);
        return response()->json($items);
    }

    public function store(Request $request): JsonResponse
    {
        if (!$request->user()->can('manage_users')) {
            return response()->json(['message' => 'Sem permissão para cadastrar departamentos.'], 403);
        }
        $request->validate([
            'name' => 'required|string|max:255|unique:departments,name',
        ]);
        $code = $this->generateDepartmentCode();
        $department = Department::create(['name' => $request->name, 'code' => $code]);
        return response()->json([
            'id' => $department->id,
            'name' => $department->name,
            'code' => $department->code,
            'created_at' => $department->created_at->toIso8601String(),
        ], 201);
    }

    public function show(Request $request, Department $department): JsonResponse
    {
        return response()->json([
            'id' => $department->id,
            'name' => $department->name,
            'code' => $department->code,
            'created_at' => $department->created_at->toIso8601String(),
        ]);
    }

    public function update(Request $request, Department $department): JsonResponse
    {
        if (!$request->user()->can('manage_users')) {
            return response()->json(['message' => 'Sem permissão para editar departamentos.'], 403);
        }
        $request->validate([
            'name' => 'required|string|max:255|unique:departments,name,' . $department->id,
        ]);
        $department->update(['name' => $request->name]);
        return response()->json([
            'id' => $department->id,
            'name' => $department->name,
            'code' => $department->code,
            'created_at' => $department->created_at->toIso8601String(),
        ]);
    }

    private function generateDepartmentCode(): string
    {
        $last = Department::whereNotNull('code')->get()->max(function ($d) {
            if (preg_match('/^SET-(\d+)$/', $d->code, $m)) {
                return (int) $m[1];
            }
            if (preg_match('/^\d{4}$/', $d->code)) {
                return (int) $d->code;
            }
            return 0;
        });
        $num = ($last ?? 0) + 1;
        return str_pad((string) $num, 4, '0', STR_PAD_LEFT);
    }

    public function destroy(Request $request, Department $department): JsonResponse
    {
        if (!$request->user()->can('manage_users')) {
            return response()->json(['message' => 'Sem permissão para excluir departamentos.'], 403);
        }
        if ($department->users()->exists() || $department->products()->exists() || $department->fixedAssets()->exists()) {
            return response()->json(['message' => 'Não é possível excluir departamento com usuários, produtos ou ativos imobilizados vinculados.'], 422);
        }
        $department->delete();
        return response()->json(null, 204);
    }
}
