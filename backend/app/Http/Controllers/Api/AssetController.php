<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\AssetMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssetController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->can('read')) {
            return response()->json(['message' => 'Sem permissão para visualizar produtos.'], 403);
        }
        $query = Asset::with(['category', 'department']);
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('assets.name', 'like', "%{$s}%")
                    ->orWhere('assets.code', 'like', "%{$s}%")
                    ->orWhere('assets.brand', 'like', "%{$s}%")
                    ->orWhereHas('department', fn ($q) => $q->where('name', 'like', "%{$s}%"));
            });
        }
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        $sortBy = $request->get('sort_by', 'name');
        $sortDir = strtolower($request->get('sort_dir', 'asc')) === 'desc' ? 'desc' : 'asc';
        $allowedSort = ['code', 'name', 'brand', 'quantity', 'value', 'status', 'created_at'];
        if (in_array($sortBy, $allowedSort)) {
            $query->orderBy('assets.' . $sortBy, $sortDir);
        } else {
            $query->orderBy('assets.name', 'asc');
        }
        $assets = $query->paginate($request->get('per_page', 50));
        $items = $assets->getCollection()->map(fn ($a) => $this->formatAsset($a));
        $assets->setCollection($items);
        return response()->json($assets);
    }

    public function store(Request $request): JsonResponse
    {
        if (!$request->user()->can('create')) {
            return response()->json(['message' => 'Sem permissão para criar produtos.'], 403);
        }
        $request->validate([
            'name' => 'required|string|max:255',
            'brand' => 'nullable|string|max:255',
            'category_id' => 'required|exists:categories,id',
            'department_id' => 'nullable|exists:departments,id',
            'value' => 'required|numeric|min:0',
            'status' => 'required|in:em_uso,disponivel,manutencao,descartado',
            'description' => 'nullable|string',
            'quantity' => 'nullable|integer|min:0',
            'estoque_minimo' => 'nullable|integer|min:0',
        ]);
        $data = $request->only(['name', 'brand', 'category_id', 'department_id', 'value', 'status', 'description', 'estoque_minimo']);
        $data['quantity'] = $request->get('quantity', 0);
        $data['estoque_minimo'] = $request->get('estoque_minimo', 0);
        $data['code'] = $this->generateAssetCode();
        $asset = Asset::create($data);
        return response()->json($this->formatAsset($asset->load('category', 'department')), 201);
    }

    public function show(Request $request, Asset $asset): JsonResponse
    {
        if (!$request->user()->can('read')) {
            return response()->json(['message' => 'Sem permissão para visualizar produtos.'], 403);
        }
        $asset->load(['category', 'department', 'movements.user', 'movements.department']);
        return response()->json($this->formatAsset($asset, true));
    }

    public function update(Request $request, Asset $asset): JsonResponse
    {
        if (!$request->user()->can('update')) {
            return response()->json(['message' => 'Sem permissão para editar produtos.'], 403);
        }
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'brand' => 'nullable|string|max:255',
            'category_id' => 'sometimes|exists:categories,id',
            'department_id' => 'nullable|exists:departments,id',
            'value' => 'sometimes|numeric|min:0',
            'status' => 'sometimes|in:em_uso,disponivel,manutencao,descartado',
            'description' => 'nullable|string',
            'estoque_minimo' => 'nullable|integer|min:0',
        ]);
        $asset->update($request->only(['name', 'brand', 'category_id', 'department_id', 'value', 'status', 'description', 'estoque_minimo']));
        return response()->json($this->formatAsset($asset->fresh(['category', 'department'])));
    }

    public function destroy(Request $request, Asset $asset): JsonResponse
    {
        if (!$request->user()->can('delete')) {
            return response()->json(['message' => 'Sem permissão para excluir produtos.'], 403);
        }
        $asset->delete();
        return response()->json(null, 204);
    }

    public function withdraw(Request $request, Asset $asset): JsonResponse
    {
        if (!$request->user()->can('update')) {
            return response()->json(['message' => 'Sem permissão para realizar retiradas.'], 403);
        }
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'department_id' => 'required|exists:departments,id',
            'quantity' => 'nullable|integer|min:1',
            'notes' => 'nullable|string',
        ]);
        $quantity = $request->get('quantity', 1);
        if ($asset->quantity < $quantity) {
            return response()->json(['message' => 'Quantidade indisponível.'], 422);
        }
        $movement = AssetMovement::create([
            'asset_id' => $asset->id,
            'user_id' => $request->user_id,
            'department_id' => $request->department_id,
            'type' => 'retirada',
            'quantity' => $quantity,
            'movement_date' => $request->get('movement_date', now()->format('Y-m-d')),
            'notes' => $request->notes,
        ]);
        $asset->decrement('quantity', $quantity);
        $asset->update(['department_id' => $request->department_id]);
        if ($asset->quantity <= 0) {
            $asset->update(['status' => 'em_uso']);
        }
        $movement->load(['user', 'department', 'asset']);
        return response()->json([
            'message' => 'Retirada registrada.',
            'movement' => [
                'id' => $movement->id,
                'asset_name' => $movement->asset->name,
                'user_name' => $movement->user->name,
                'department_name' => $movement->department?->name,
                'type' => $movement->type,
                'quantity' => $movement->quantity,
                'movement_date' => $movement->movement_date->format('Y-m-d'),
                'notes' => $movement->notes,
            ],
        ], 201);
    }

    public function entry(Request $request, Asset $asset): JsonResponse
    {
        if (!$request->user()->can('update')) {
            return response()->json(['message' => 'Sem permissão para registrar entrada.'], 403);
        }
        $request->validate([
            'quantity' => 'required|integer|min:1',
            'notes' => 'nullable|string',
        ]);
        $quantity = $request->integer('quantity');
        $movement = AssetMovement::create([
            'asset_id' => $asset->id,
            'user_id' => $request->user()->id,
            'department_id' => null,
            'type' => 'entrada',
            'quantity' => $quantity,
            'movement_date' => $request->get('movement_date', now()->format('Y-m-d')),
            'notes' => $request->notes,
        ]);
        $asset->increment('quantity', $quantity);
        if ($asset->quantity > 0 && $asset->status === 'em_uso') {
            $asset->update(['status' => 'disponivel']);
        }
        return response()->json([
            'message' => 'Entrada registrada.',
            'movement' => [
                'id' => $movement->id,
                'type' => $movement->type,
                'quantity' => $movement->quantity,
                'movement_date' => $movement->movement_date->format('Y-m-d'),
                'notes' => $movement->notes,
            ],
        ], 201);
    }

    private function formatAsset(Asset $asset, bool $withMovements = false): array
    {
        $statusMap = [
            'em_uso' => 'Em Uso',
            'disponivel' => 'Disponível',
            'manutencao' => 'Manutenção',
            'descartado' => 'Descartado',
        ];
        $qty = (int) $asset->quantity;
        $unitValue = (float) $asset->value;
        $data = [
            'id' => $asset->id,
            'code' => $asset->code,
            'name' => $asset->name,
            'brand' => $asset->brand,
            'category' => $asset->category?->name,
            'category_id' => $asset->category_id,
            'location' => $asset->department?->name ?? 'Almoxarifado',
            'department_id' => $asset->department_id,
            'value' => $unitValue,
            'value_total' => round($unitValue * $qty, 2),
            'status' => $statusMap[$asset->status] ?? $asset->status,
            'status_key' => $asset->status,
            'description' => $asset->description,
            'quantity' => $qty,
            'estoque_minimo' => (int) ($asset->estoque_minimo ?? 0),
            'date' => $asset->created_at->format('Y-m-d'),
        ];
        if ($withMovements && $asset->relationLoaded('movements')) {
            $data['movements'] = $asset->movements->map(function ($m) {
                return [
                    'id' => $m->id,
                    'user_name' => $m->user?->name,
                    'department_name' => $m->department?->name,
                    'type' => $m->type,
                    'quantity' => $m->quantity,
                    'movement_date' => $m->movement_date->format('Y-m-d'),
                    'notes' => $m->notes,
                ];
            });
        }
        return $data;
    }

    private function generateAssetCode(): string
    {
        $last = Asset::whereNotNull('code')
            ->get()
            ->max(fn ($a) => preg_match('/^\d{4}$/', (string) $a->code) ? (int) $a->code : 0);
        $num = ($last ?? 0) + 1;
        return str_pad((string) $num, 4, '0', STR_PAD_LEFT);
    }
}
