<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AssetMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssetMovementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->can('read')) {
            return response()->json(['message' => 'Sem permissão para visualizar movimentações.'], 403);
        }
        $query = AssetMovement::with(['asset', 'user', 'department']);
        if ($request->filled('asset_id')) {
            $query->where('asset_id', $request->asset_id);
        }
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }
        $movements = $query->orderByDesc('movement_date')->orderByDesc('created_at')->paginate($request->get('per_page', 30));
        $items = $movements->getCollection()->map(fn ($m) => [
            'id' => $m->id,
            'asset_id' => $m->asset_id,
            'asset_name' => $m->asset?->name,
            'user_id' => $m->user_id,
            'user_name' => $m->user?->name,
            'department_id' => $m->department_id,
            'department_name' => $m->department?->name,
            'type' => $m->type,
            'quantity' => $m->quantity,
            'movement_date' => $m->movement_date->format('Y-m-d'),
            'notes' => $m->notes,
        ]);
        $movements->setCollection($items);
        return response()->json($movements);
    }
}
