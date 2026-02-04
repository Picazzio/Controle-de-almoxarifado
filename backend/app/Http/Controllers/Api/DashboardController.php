<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\AssetMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function stats(Request $request): JsonResponse
    {
        if (!$request->user()->can('read')) {
            return response()->json(['message' => 'Sem permissão para acessar o dashboard.'], 403);
        }

        $totalItems = Asset::sum('quantity');
        $totalValue = (float) Asset::selectRaw('SUM(value * quantity) as total')->value('total') ?? 0;
        $inUse = Asset::where('status', 'em_uso')->sum('quantity');
        $available = Asset::where('status', 'disponivel')->sum('quantity');
        $maintenance = Asset::where('status', 'manutencao')->sum('quantity');
        $discarded = Asset::where('status', 'descartado')->sum('quantity');

        $lowStockCount = Asset::whereRaw('quantity <= COALESCE(estoque_minimo, 0)')->count();
        $monthlyConsumptionValue = $this->getMonthlyConsumptionValue();
        $topConsumedProducts = $this->getTopConsumedProducts();
        $spendingBySector = $this->getSpendingBySector();
        $movementsTrend = $this->getMovementsTrend();
        $recentMovements = $this->getRecentMovements();

        return response()->json([
            'stats' => [
                'total_items' => $totalItems,
                'total_value' => $totalValue,
                'in_use' => $inUse,
                'available' => $available,
                'maintenance' => $maintenance,
                'discarded' => $discarded,
                'low_stock_count' => $lowStockCount,
                'monthly_consumption_value' => $monthlyConsumptionValue,
            ],
            'top_consumed_products' => $topConsumedProducts,
            'spending_by_sector' => $spendingBySector,
            'movements_trend' => $movementsTrend,
            'recent_movements' => $recentMovements,
        ]);
    }

    private function getMonthlyConsumptionValue(): float
    {
        $start = now()->startOfMonth();
        $end = now()->endOfMonth();
        $total = 0;
        AssetMovement::where('type', '!=', 'entrada')
            ->whereBetween('movement_date', [$start, $end])
            ->with('asset:id,value')
            ->get()
            ->each(function ($m) use (&$total) {
                $total += (float) $m->quantity * (float) ($m->asset?->value ?? 0);
            });
        return round($total, 2);
    }

    private function getTopConsumedProducts(): array
    {
        $start = now()->startOfMonth();
        $end = now()->endOfMonth();
        $aggregated = [];
        AssetMovement::where('type', '!=', 'entrada')
            ->whereBetween('movement_date', [$start, $end])
            ->selectRaw('asset_id, SUM(quantity) as total_qty')
            ->groupBy('asset_id')
            ->orderByRaw('SUM(quantity) DESC')
            ->limit(5)
            ->get()
            ->each(function ($row) use (&$aggregated) {
                $asset = Asset::find($row->asset_id);
                if ($asset) {
                    $aggregated[] = [
                        'name' => $asset->name,
                        'code' => $asset->code,
                        'quantidade' => (int) $row->total_qty,
                    ];
                }
            });
        return $aggregated;
    }

    private function getSpendingBySector(): array
    {
        $start = now()->startOfMonth();
        $end = now()->endOfMonth();
        $byDept = [];
        AssetMovement::where('type', '!=', 'entrada')
            ->whereNotNull('department_id')
            ->whereBetween('movement_date', [$start, $end])
            ->with(['asset:id,value', 'department:id,name'])
            ->get()
            ->groupBy('department_id')
            ->each(function ($movements, $deptId) use (&$byDept) {
                $valor = $movements->sum(fn ($m) => (float) $m->quantity * (float) ($m->asset?->value ?? 0));
                $name = $movements->first()->department?->name ?? 'Outros';
                $byDept[] = ['department_id' => (int) $deptId, 'name' => $name, 'value' => round($valor, 2), 'color' => $this->departmentColor($name)];
            });
        return collect($byDept)->sortByDesc('value')->take(5)->values()->all();
    }

    private function getMovementsTrend(): array
    {
        $months = [];
        for ($i = 5; $i >= 0; $i--) {
            $date = now()->subMonths($i);
            $months[] = [
                'month' => $date->format('Y-m'),
                'label' => $date->translatedFormat('M/Y'),
                'compras' => 0,
                'consumo' => 0,
            ];
        }

        $movements = AssetMovement::query()
            ->with('asset:id,value')
            ->where('movement_date', '>=', now()->subMonths(6)->startOfMonth())
            ->get();

        foreach ($movements as $m) {
            $mes = $m->movement_date->format('Y-m');
            $valor = (float) $m->quantity * (float) ($m->asset?->value ?? 0);
            $idx = array_search($mes, array_column($months, 'month'), true);
            if ($idx !== false) {
                if ($m->type === 'entrada') {
                    $months[$idx]['compras'] += round($valor, 2);
                } else {
                    $months[$idx]['consumo'] += round($valor, 2);
                }
            }
        }

        return $months;
    }

    private function getRecentMovements(): array
    {
        return AssetMovement::with(['asset:id,name,code', 'user:id,name', 'department:id,name'])
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(fn ($m) => [
                'id' => $m->id,
                'type' => $m->type,
                'type_label' => $m->type === 'entrada' ? 'Entrada' : 'Saída',
                'quantity' => $m->quantity,
                'movement_date' => $m->movement_date->format('Y-m-d'),
                'asset_name' => $m->asset?->name,
                'asset_code' => $m->asset?->code,
                'asset_id' => $m->asset_id,
                'user_name' => $m->user?->name,
                'department_name' => $m->department?->name,
            ])
            ->all();
    }

    /**
     * Lista detalhada dos consumos (saídas) de um setor/departamento no mês atual.
     */
    public function sectorConsumption(Request $request): JsonResponse
    {
        if (!$request->user()->can('read')) {
            return response()->json(['message' => 'Sem permissão para acessar o dashboard.'], 403);
        }
        $departmentId = $request->integer('department_id');
        if (!$departmentId) {
            return response()->json(['message' => 'department_id é obrigatório.'], 422);
        }
        $start = now()->startOfMonth();
        $end = now()->endOfMonth();
        $movements = AssetMovement::where('type', '!=', 'entrada')
            ->where('department_id', $departmentId)
            ->whereBetween('movement_date', [$start, $end])
            ->with(['asset:id,name,code,value', 'user:id,name'])
            ->orderByDesc('movement_date')
            ->get();
        $items = $movements->map(fn ($m) => [
            'id' => $m->id,
            'asset_name' => $m->asset?->name,
            'asset_code' => $m->asset?->code,
            'quantity' => (int) $m->quantity,
            'unit_value' => (float) ($m->asset?->value ?? 0),
            'total_value' => round((float) $m->quantity * (float) ($m->asset?->value ?? 0), 2),
            'movement_date' => $m->movement_date->format('Y-m-d'),
            'user_name' => $m->user?->name,
        ]);
        return response()->json(['items' => $items->all()]);
    }

    public function lowStockReport(Request $request): JsonResponse
    {
        if (!$request->user()->can('read')) {
            return response()->json(['message' => 'Sem permissão.'], 403);
        }
        $products = Asset::with(['category:id,name', 'department:id,name'])
            ->whereRaw('quantity <= COALESCE(estoque_minimo, 0)')
            ->orderBy('name')
            ->get(['id', 'code', 'name', 'brand', 'quantity', 'estoque_minimo', 'value', 'category_id', 'department_id']);

        $items = $products->map(fn ($a) => [
            'id' => $a->id,
            'code' => $a->code,
            'name' => $a->name,
            'brand' => $a->brand,
            'quantity' => (int) $a->quantity,
            'estoque_minimo' => (int) ($a->estoque_minimo ?? 0),
            'value' => (float) $a->value,
            'category' => $a->category?->name,
            'location' => $a->department?->name ?? 'Almoxarifado',
        ]);

        return response()->json($items);
    }

    private function departmentColor(?string $name): string
    {
        $colors = [
            'Almoxarifado' => '#64748b',
            'Financeiro' => '#0c4a6e',
            'TI' => '#1e40af',
            'RH' => '#3b82f6',
            'Marketing' => '#60a5fa',
            'Vendas' => '#93c5fd',
        ];
        return $colors[$name ?? ''] ?? '#' . substr(md5($name ?? ''), 0, 6);
    }
}
