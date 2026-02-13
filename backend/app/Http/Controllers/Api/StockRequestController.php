<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockMovement;
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

        $query = StockRequest::with(['user.department', 'items.product']);

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
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'notes' => 'nullable|string|max:1000',
        ]);

        $user = $request->user();
        $items = $request->items;

        foreach ($items as $item) {
            $product = Product::find($item['product_id']);
            if (!$product) {
                return response()->json(['message' => 'Produto não encontrado.'], 422);
            }
            if ($product->quantity < (int) $item['quantity']) {
                return response()->json([
                    'message' => "Quantidade solicitada de \"{$product->name}\" excede o disponível em estoque.",
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
                'product_id' => $item['product_id'],
                'quantity' => (int) $item['quantity'],
            ]);
        }

        $stockRequest->load(['user.department', 'items.product']);

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

        $stockRequest->load(['user.department', 'items.product']);
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
            'status' => 'required|in:' . implode(',', StockRequest::$statuses),
        ]);

        $stockRequest->update(['status' => $request->status]);
        $stockRequest->load(['user.department', 'items.product']);

        return response()->json($this->formatRequest($stockRequest));
    }

    /**
     * Inicia a etapa de separação: altera o status para 'separation'.
     */
    public function startSeparation(Request $request, StockRequest $stockRequest): JsonResponse
    {
        if (!$request->user()->can('update')) {
            return response()->json(['message' => 'Sem permissão para alterar solicitações.'], 403);
        }

        if ($stockRequest->status !== StockRequest::STATUS_PENDING) {
            return response()->json(['message' => 'Apenas solicitações pendentes podem iniciar separação.'], 422);
        }

        $stockRequest->update(['status' => StockRequest::STATUS_SEPARATION]);
        $stockRequest->load(['user.department', 'items.product']);

        return response()->json([
            'message' => 'Separação iniciada.',
            'request' => $this->formatRequest($stockRequest),
        ]);
    }

    /**
     * Atende a solicitação: dá baixa no estoque e envia ao departamento do solicitante. Permitido quando status é pendente ou separation.
     */
    public function fulfill(Request $request, StockRequest $stockRequest): JsonResponse
    {
        if (!$request->user()->can('update')) {
            return response()->json(['message' => 'Sem permissão para atender solicitações.'], 403);
        }

        if (!in_array($stockRequest->status, [StockRequest::STATUS_PENDING, StockRequest::STATUS_SEPARATION], true)) {
            return response()->json(['message' => 'Esta solicitação já foi atendida ou cancelada.'], 422);
        }

        $stockRequest->load(['user.department', 'items.product']);
        $departmentId = $stockRequest->user?->department_id;
        if (!$departmentId) {
            return response()->json(['message' => 'O solicitante não possui departamento cadastrado.'], 422);
        }

        foreach ($stockRequest->items as $item) {
            $product = $item->product;
            if (!$product || $product->quantity < $item->quantity) {
                return response()->json([
                    'message' => "Quantidade insuficiente de \"{$product->name}\" (cód. {$product->code}). Disponível: {$product->quantity}, solicitado: {$item->quantity}.",
                ], 422);
            }
        }

        DB::transaction(function () use ($stockRequest, $departmentId, $request) {
            foreach ($stockRequest->items as $item) {
                $product = $item->product;
                StockMovement::create([
                    'product_id' => $product->id,
                    'user_id' => $request->user()->id,
                    'department_id' => $departmentId,
                    'type' => 'retirada',
                    'quantity' => $item->quantity,
                    'movement_date' => now()->format('Y-m-d'),
                    'notes' => "Atendimento da solicitação #{$stockRequest->id} - Envio ao departamento do solicitante.",
                ]);
                $product->decrement('quantity', $item->quantity);
                $product->update(['department_id' => $departmentId]);
                if ($product->quantity <= 0) {
                    $product->update(['status' => 'em_uso']);
                }
            }
            $stockRequest->update(['status' => StockRequest::STATUS_FULFILLED]);
        });

        $stockRequest->load(['user.department', 'items.product']);
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
                'product_id' => $i->product_id,
                'product_name' => $i->product?->name,
                'product_code' => $i->product?->code,
                'quantity' => $i->quantity,
            ]),
        ];
    }
}
