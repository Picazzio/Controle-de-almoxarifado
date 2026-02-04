<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AssetMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Activitylog\Models\Activity;

class ActivityLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->can('view_logs')) {
            return response()->json(['message' => 'Sem permissão para visualizar logs.'], 403);
        }
        $query = Activity::with('causer');
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('description', 'like', "%{$s}%")
                    ->orWhere('subject_type', 'like', "%{$s}%")
                    ->orWhereHas('causer', fn ($q) => $q->where('name', 'like', "%{$s}%"));
            });
        }
        if ($request->filled('type')) {
            $query->where('description', $request->type);
        }
        if ($request->filled('resource')) {
            $query->where('subject_type', 'like', '%' . $request->resource . '%');
        }
        $sortBy = $request->get('sort_by', 'created_at');
        $sortDir = strtolower($request->get('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';
        $allowedSort = ['created_at', 'description', 'subject_type'];
        if (in_array($sortBy, $allowedSort)) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            $query->orderByDesc('created_at');
        }
        $logs = $query->paginate($request->get('per_page', 30));
        $actionMap = [
            'created' => 'Criou',
            'updated' => 'Editou',
            'deleted' => 'Excluiu',
        ];
        $resourceMap = [
            'App\Models\Asset' => 'Produto',
            'App\Models\User' => 'Usuário',
            'App\Models\AssetMovement' => 'Movimentação',
            'App\Models\Role' => 'Permissão',
        ];
        $items = $logs->getCollection()->map(function ($log) use ($actionMap, $resourceMap) {
            $subject = $log->subject;
            $resourceName = $resourceMap[$log->subject_type] ?? class_basename($log->subject_type);
            $subjectName = 'N/A';
            if ($subject) {
                if ($subject instanceof AssetMovement) {
                    $subject->loadMissing(['asset', 'department']);
                    $typeLabel = $subject->type === 'retirada' ? 'Retirada' : ($subject->type === 'entrada' ? 'Entrada' : $subject->type);
                    $subjectName = $subject->notes
                        ?: sprintf(
                            '%s · %d un. · %s%s',
                            $typeLabel,
                            $subject->quantity,
                            $subject->asset?->name ?? 'Produto #' . $subject->asset_id,
                            $subject->department ? ' → ' . $subject->department->name : ''
                        );
                } elseif (is_object($subject) && isset($subject->name)) {
                    $subjectName = $subject->name;
                } elseif (method_exists($subject, '__toString')) {
                    $str = (string) $subject;
                    $subjectName = strlen($str) > 200 ? substr($str, 0, 197) . '...' : $str;
                }
            }
            return [
                'id' => $log->id,
                'user' => $log->causer?->name ?? 'Sistema',
                'action' => $actionMap[$log->description] ?? $log->description,
                'resource' => $resourceName,
                'resource_name' => $subjectName,
                'timestamp' => $log->created_at->toIso8601String(),
                'ip' => $log->properties['ip'] ?? request()->ip(),
                'type' => $log->description,
            ];
        });
        $logs->setCollection($items);
        return response()->json($logs);
    }
}
