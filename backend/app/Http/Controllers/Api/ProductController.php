<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->can('read')) {
            return response()->json(['message' => 'Sem permissão para visualizar produtos.'], 403);
        }
        $query = Product::with(['category', 'department']);
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('products.name', 'like', "%{$s}%")
                    ->orWhere('products.code', 'like', "%{$s}%")
                    ->orWhere('products.brand', 'like', "%{$s}%")
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
            $query->orderBy('products.' . $sortBy, $sortDir);
        } else {
            $query->orderBy('products.name', 'asc');
        }
        $products = $query->paginate($request->get('per_page', 50));
        $items = $products->getCollection()->map(fn ($p) => $this->formatProduct($p));
        $products->setCollection($items);
        return response()->json($products);
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
        $data['code'] = $this->generateProductCode();
        $product = Product::create($data);
        return response()->json($this->formatProduct($product->load('category', 'department')), 201);
    }

    public function show(Request $request, Product $product): JsonResponse
    {
        if (!$request->user()->can('read')) {
            return response()->json(['message' => 'Sem permissão para visualizar produtos.'], 403);
        }
        $product->load(['category', 'department', 'movements.user', 'movements.department']);
        return response()->json($this->formatProduct($product, true));
    }

    public function update(Request $request, Product $product): JsonResponse
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
        $product->update($request->only(['name', 'brand', 'category_id', 'department_id', 'value', 'status', 'description', 'estoque_minimo']));
        return response()->json($this->formatProduct($product->fresh(['category', 'department'])));
    }

    public function destroy(Request $request, Product $product): JsonResponse
    {
        if (!$request->user()->can('delete')) {
            return response()->json(['message' => 'Sem permissão para excluir produtos.'], 403);
        }
        $product->delete();
        return response()->json(null, 204);
    }

    public function withdraw(Request $request, Product $product): JsonResponse
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
        if ($product->quantity < $quantity) {
            return response()->json(['message' => 'Quantidade indisponível.'], 422);
        }
        $movement = StockMovement::create([
            'product_id' => $product->id,
            'user_id' => $request->user_id,
            'department_id' => $request->department_id,
            'type' => 'retirada',
            'quantity' => $quantity,
            'movement_date' => $request->get('movement_date', now()->format('Y-m-d')),
            'notes' => $request->notes,
        ]);
        $product->decrement('quantity', $quantity);
        $product->update(['department_id' => $request->department_id]);
        if ($product->quantity <= 0) {
            $product->update(['status' => 'em_uso']);
        }
        $movement->load(['user', 'department', 'product']);
        return response()->json([
            'message' => 'Retirada registrada.',
            'movement' => [
                'id' => $movement->id,
                'product_name' => $movement->product->name,
                'user_name' => $movement->user->name,
                'department_name' => $movement->department?->name,
                'type' => $movement->type,
                'quantity' => $movement->quantity,
                'movement_date' => $movement->movement_date->format('Y-m-d'),
                'notes' => $movement->notes,
            ],
        ], 201);
    }

    public function entry(Request $request, Product $product): JsonResponse
    {
        if (!$request->user()->can('update')) {
            return response()->json(['message' => 'Sem permissão para registrar entrada.'], 403);
        }
        $request->validate([
            'quantity' => 'required|integer|min:1',
            'notes' => 'nullable|string',
        ]);
        $quantity = $request->integer('quantity');
        $movement = StockMovement::create([
            'product_id' => $product->id,
            'user_id' => $request->user()->id,
            'department_id' => null,
            'type' => 'entrada',
            'quantity' => $quantity,
            'movement_date' => $request->get('movement_date', now()->format('Y-m-d')),
            'notes' => $request->notes,
        ]);
        $product->increment('quantity', $quantity);
        if ($product->quantity > 0 && $product->status === 'em_uso') {
            $product->update(['status' => 'disponivel']);
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

    private function formatProduct(Product $product, bool $withMovements = false): array
    {
        $statusMap = [
            'em_uso' => 'Em Uso',
            'disponivel' => 'Disponível',
            'manutencao' => 'Manutenção',
            'descartado' => 'Descartado',
        ];
        $qty = (int) $product->quantity;
        $unitValue = (float) $product->value;
        $data = [
            'id' => $product->id,
            'code' => $product->code,
            'name' => $product->name,
            'brand' => $product->brand,
            'category' => $product->category?->name,
            'category_id' => $product->category_id,
            'location' => $product->department?->name ?? 'Almoxarifado',
            'department_id' => $product->department_id,
            'value' => $unitValue,
            'value_total' => round($unitValue * $qty, 2),
            'status' => $statusMap[$product->status] ?? $product->status,
            'status_key' => $product->status,
            'description' => $product->description,
            'quantity' => $qty,
            'estoque_minimo' => (int) ($product->estoque_minimo ?? 0),
            'date' => $product->created_at->format('Y-m-d'),
        ];
        if ($withMovements && $product->relationLoaded('movements')) {
            $data['movements'] = $product->movements->map(function ($m) {
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

    private function generateProductCode(): string
    {
        $last = Product::whereNotNull('code')
            ->get()
            ->max(fn ($p) => preg_match('/^\d{4}$/', (string) $p->code) ? (int) $p->code : 0);
        $num = ($last ?? 0) + 1;
        return str_pad((string) $num, 4, '0', STR_PAD_LEFT);
    }
}
