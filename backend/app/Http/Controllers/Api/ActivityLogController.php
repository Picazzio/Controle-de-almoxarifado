<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ActivityLogResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Activitylog\Models\Activity;

class ActivityLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->can('view_logs')) {
            return response()->json(['message' => 'Sem permissão para visualizar logs.'], 403);
        }

        $query = Activity::with(['causer', 'subject'])->latest();

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('description', 'like', "%{$s}%")
                    ->orWhere('subject_type', 'like', "%{$s}%")
                    ->orWhereHas('causer', fn ($q) => $q->where('name', 'like', "%{$s}%"));
            });
        }
        if ($request->filled('type')) {
            $query->where('description', $request->type);
        }
        if ($request->filled('resource')) {
            $resourceToType = [
                'Produto' => 'Product',
                'Usuário' => 'User',
                'Movimentação' => 'StockMovement',
                'Permissão' => 'Role',
                'Função' => 'Role',
                'Patrimônio' => 'FixedAsset',
                'Departamento' => 'Department',
                'Categoria' => 'Category',
            ];
            $needle = $resourceToType[$request->resource] ?? $request->resource;
            $query->where('subject_type', 'like', '%' . $needle . '%');
        }

        $sortBy = $request->get('sort_by', 'created_at');
        $sortDir = strtolower($request->get('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';
        $allowedSort = ['created_at', 'description', 'subject_type'];
        if (in_array($sortBy, $allowedSort)) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            $query->orderByDesc('created_at');
        }

        $perPage = (int) $request->get('per_page', 30);
        $logs = $query->paginate($perPage);

        return response()->json([
            'data' => ActivityLogResource::collection($logs->items()),
            'current_page' => $logs->currentPage(),
            'last_page' => $logs->lastPage(),
            'per_page' => $logs->perPage(),
            'total' => $logs->total(),
        ]);
    }
}
