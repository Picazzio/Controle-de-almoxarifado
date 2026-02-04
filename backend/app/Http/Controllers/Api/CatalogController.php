<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
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
        $query = Asset::with('category')
            ->where('quantity', '>', 0)
            ->where('status', 'disponivel');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('assets.name', 'like', "%{$s}%")
                    ->orWhere('assets.code', 'like', "%{$s}%")
                    ->orWhere('assets.brand', 'like', "%{$s}%");
            });
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        $query->orderBy('assets.name', 'asc');
        $perPage = min((int) $request->get('per_page', 50), 100);
        $assets = $query->paginate($perPage);
        $items = $assets->getCollection()->map(fn ($a) => $this->formatItem($a));
        $assets->setCollection($items);

        return response()->json($assets);
    }

    private function formatItem(Asset $asset): array
    {
        return [
            'id' => $asset->id,
            'code' => $asset->code,
            'name' => $asset->name,
            'brand' => $asset->brand,
            'category' => $asset->category?->name,
            'category_id' => $asset->category_id,
            'quantity' => (int) $asset->quantity,
            'value' => (float) $asset->value,
        ];
    }
}
