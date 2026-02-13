<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StockMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StockMovementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->can('read')) {
            return response()->json(['message' => 'Sem permissão para visualizar movimentações.'], 403);
        }
        $query = StockMovement::with(['product', 'user', 'department']);
        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }
        $movements = $query->orderByDesc('movement_date')->orderByDesc('created_at')->paginate($request->get('per_page', 30));
        $items = $movements->getCollection()->map(fn ($m) => [
            'id' => $m->id,
            'product_id' => $m->product_id,
            'product_name' => $m->product?->name,
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
