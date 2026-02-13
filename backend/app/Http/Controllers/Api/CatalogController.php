<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CatalogController extends Controller
{
    /**
     * Lista produtos disponíveis em estoque (quantity > 0).
     * Acesso: usuário com permissão request_products.
     */
    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->can('request_products')) {
            return response()->json(['message' => 'Sem permissão para visualizar e solicitar produtos.'], 403);
        }
        $query = Product::with('category')
            ->where('quantity', '>', 0)
            ->where('status', 'disponivel');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('products.name', 'like', "%{$s}%")
                    ->orWhere('products.code', 'like', "%{$s}%")
                    ->orWhere('products.brand', 'like', "%{$s}%");
            });
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        $query->orderBy('products.name', 'asc');
        $perPage = min((int) $request->get('per_page', 50), 100);
        $products = $query->paginate($perPage);
        $items = $products->getCollection()->map(fn ($p) => $this->formatItem($p));
        $products->setCollection($items);

        return response()->json($products);
    }

    private function formatItem(Product $product): array
    {
        return [
            'id' => $product->id,
            'code' => $product->code,
            'name' => $product->name,
            'brand' => $product->brand,
            'category' => $product->category?->name,
            'category_id' => $product->category_id,
            'quantity' => (int) $product->quantity,
            'value' => (float) $product->value,
        ];
    }
}
