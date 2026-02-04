<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;

class NotificationController extends Controller
{
    /**
     * Lista notificações do usuário autenticado.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $limit = min((int) $request->get('limit', 20), 50);
        $notifications = $user->notifications()
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->map(fn ($n) => $this->formatNotification($n));

        $unreadCount = $user->unreadNotifications()->count();

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * Marca uma notificação como lida.
     */
    public function markAsRead(Request $request, string $id): JsonResponse
    {
        $notification = $request->user()->notifications()->where('id', $id)->first();
        if (!$notification) {
            return response()->json(['message' => 'Notificação não encontrada.'], 404);
        }
        $notification->markAsRead();
        return response()->json(['message' => 'OK']);
    }

    /**
     * Marca todas as notificações como lidas.
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();
        return response()->json(['message' => 'OK']);
    }

    /**
     * Remove todas as notificações do usuário (limpar lista).
     */
    public function clear(Request $request): JsonResponse
    {
        $request->user()->notifications()->delete();
        return response()->json(['message' => 'OK']);
    }

    private function formatNotification(DatabaseNotification $n): array
    {
        $data = $n->data ?? [];
        return [
            'id' => $n->id,
            'title' => $data['title'] ?? 'Notificação',
            'message' => $data['message'] ?? '',
            'link' => $data['link'] ?? null,
            'type' => $data['type'] ?? null,
            'read_at' => $n->read_at ? $n->read_at->format('Y-m-d H:i') : null,
            'created_at' => $n->created_at->format('Y-m-d H:i'),
        ];
    }
}
