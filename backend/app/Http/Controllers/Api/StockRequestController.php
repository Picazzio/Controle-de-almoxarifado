<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\AssetMovement;
use App\Models\StockRequest;
use App\Models\StockRequestItem;
use App\Models\User;
use App\Notifications\StockRequestCreatedNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockRequestController extends Controller
{
    /**
     * Lista solicitações: do próprio usuário ou todas (se tiver permissão view_stock_requests).
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $scopeAll = $request->boolean('all') && $user->can('view_stock_requests');

        $query = StockRequest::with(['user.department', 'items.asset']);

        if (!$scopeAll) {
            $query->where('user_id', $user->id);
        }

        $query->orderByDesc('created_at');
        $requests = $query->paginate($request->get('per_page', 15));
        $requests->getCollection()->transform(fn ($r) => $this->formatRequest($r));

        return response()->json($requests);
    }

    /**
     * Cria uma nova solicitação de produtos.
     */
    public function store(Request $request): JsonResponse
    {
        if (!$request->user()->can('request_products')) {
            return response()->json(['message' => 'Sem permissão para solicitar produtos.'], 403);
        }
        $request->validate([
            'items' => 'required|array|min:1',
            'items.*.asset_id' => 'required|exists:assets,id',
            'items.*.quantity' => 'required|integer|min:1',
            'notes' => 'nullable|string|max:1000',
        ]);

        $user = $request->user();
        $items = $request->items;

        foreach ($items as $item) {
            $asset = Asset::find($item['asset_id']);
            if (!$asset || $asset->quantity < (int) $item['quantity']) {
                return response()->json([
                    'message' => "Quantidade solicitada de \"{$asset->name}\" excede o disponível em estoque.",
                ], 422);
            }
        }

        $stockRequest = StockRequest::create([
            'user_id' => $user->id,
            'status' => 'pendente',
            'notes' => $request->notes,
        ]);

        foreach ($items as $item) {
            StockRequestItem::create([
                'stock_request_id' => $stockRequest->id,
                'asset_id' => $item['asset_id'],
                'quantity' => (int) $item['quantity'],
            ]);
        }

        $stockRequest->load(['user.department', 'items.asset']);

        // Notifica usuários com permissão de ver solicitações (exceto o próprio solicitante)
        $recipients = User::permission('view_stock_requests')->where('id', '!=', $user->id)->get();
        foreach ($recipients as $recipient) {
            $recipient->notify(new StockRequestCreatedNotification($stockRequest));
        }

        return response()->json($this->formatRequest($stockRequest), 201);
    }

    /**
     * Exibe uma solicitação.
     */
    public function show(Request $request, StockRequest $stockRequest): JsonResponse
    {
        $user = $request->user();
        if ($stockRequest->user_id !== $user->id && !$user->can('view_stock_requests')) {
            return response()->json(['message' => 'Sem permissão.'], 403);
        }

        $stockRequest->load(['user.department', 'items.asset']);
        return response()->json($this->formatRequest($stockRequest));
    }

    /**
     * Atualiza status da solicitação (almoxarifado).
     */
    public function update(Request $request, StockRequest $stockRequest): JsonResponse
    {
        if (!$request->user()->can('update')) {
            return response()->json(['message' => 'Sem permissão para alterar solicitações.'], 403);
        }

        $request->validate([
            'status' => 'required|in:pendente,atendida,cancelada',
        ]);

        $stockRequest->update(['status' => $request->status]);
        $stockRequest->load(['user.department', 'items.asset']);

        return response()->json($this->formatRequest($stockRequest));
    }

    /**
     * Atende a solicitação: imprime a lista, retira os itens do almoxarifado e envia ao departamento do solicitante.
     */
    public function fulfill(Request $request, StockRequest $stockRequest): JsonResponse
    {
        if (!$request->user()->can('update')) {
            return response()->json(['message' => 'Sem permissão para atender solicitações.'], 403);
        }

        if ($stockRequest->status !== 'pendente') {
            return response()->json(['message' => 'Esta solicitação já foi atendida ou cancelada.'], 422);
        }

        $stockRequest->load(['user.department', 'items.asset']);
        $departmentId = $stockRequest->user?->department_id;
        if (!$departmentId) {
            return response()->json(['message' => 'O solicitante não possui departamento cadastrado.'], 422);
        }

        foreach ($stockRequest->items as $item) {
            $asset = $item->asset;
            if (!$asset || $asset->quantity < $item->quantity) {
                return response()->json([
                    'message' => "Quantidade insuficiente de \"{$asset->name}\" (cód. {$asset->code}). Disponível: {$asset->quantity}, solicitado: {$item->quantity}.",
                ], 422);
            }
        }

        DB::transaction(function () use ($stockRequest, $departmentId, $request) {
            foreach ($stockRequest->items as $item) {
                $asset = $item->asset;
                AssetMovement::create([
                    'asset_id' => $asset->id,
                    'user_id' => $request->user()->id,
                    'department_id' => $departmentId,
                    'type' => 'retirada',
                    'quantity' => $item->quantity,
                    'movement_date' => now()->format('Y-m-d'),
                    'notes' => "Atendimento da solicitação #{$stockRequest->id} - Envio ao departamento do solicitante.",
                ]);
                $asset->decrement('quantity', $item->quantity);
                $asset->update(['department_id' => $departmentId]);
                if ($asset->quantity <= 0) {
                    $asset->update(['status' => 'em_uso']);
                }
            }
            $stockRequest->update(['status' => 'atendida']);
        });

        $stockRequest->load(['user.department', 'items.asset']);
        return response()->json([
            'message' => 'Solicitação atendida. Itens retirados do almoxarifado e enviados ao departamento.',
            'request' => $this->formatRequest($stockRequest),
        ]);
    }

    private function formatRequest(StockRequest $r): array
    {
        return [
            'id' => $r->id,
            'user_id' => $r->user_id,
            'user_name' => $r->user?->name,
            'user_department' => $r->user?->department?->name,
            'status' => $r->status,
            'notes' => $r->notes,
            'created_at' => $r->created_at->format('Y-m-d H:i'),
            'items' => $r->items->map(fn ($i) => [
                'id' => $i->id,
                'asset_id' => $i->asset_id,
                'asset_name' => $i->asset?->name,
                'asset_code' => $i->asset?->code,
                'quantity' => $i->quantity,
            ]),
        ];
    }
}
