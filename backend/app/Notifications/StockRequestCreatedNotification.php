<?php

namespace App\Notifications;

use App\Models\StockRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class StockRequestCreatedNotification extends Notification
{
    use Queueable;

    protected $stockRequest;

    public function __construct(StockRequest $stockRequest)
    {
        $this->stockRequest = $stockRequest;
    }

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toArray($notifiable): array
    {
        $userName = $this->stockRequest->user ? $this->stockRequest->user->name : 'Um usuário';
        $itemsCount = $this->stockRequest->items->count();
        $message = $itemsCount === 1
            ? 'solicitou 1 item.'
            : "solicitou {$itemsCount} itens.";

        return [
            'title' => 'Nova solicitação de produtos',
            'message' => $userName . ' ' . $message,
            'link' => '/solicitacoes',
            'stock_request_id' => $this->stockRequest->id,
            'type' => 'stock_request_created',
        ];
    }
}
