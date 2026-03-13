<?php

namespace App\Http\Resources;

use App\Models\FixedAsset;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ActivityLogResource extends JsonResource
{
    private const ACTION_MAP = [
        'created' => 'Criou',
        'updated' => 'Editou',
        'deleted' => 'Excluiu',
    ];

    private const RESOURCE_MAP = [
        'App\Models\Product' => 'Produto',
        'App\Models\User' => 'Usuário',
        'App\Models\StockMovement' => 'Movimentação',
        'App\Models\Role' => 'Função',
        'Spatie\Permission\Models\Role' => 'Função',
        'App\Models\FixedAsset' => 'Patrimônio',
        'App\Models\Department' => 'Departamento',
        'App\Models\Category' => 'Categoria',
        'App\Models\Asset' => 'Produto',
        'App\Models\AssetMovement' => 'Movimentação',
    ];

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $subject = $this->resource->subject;
        $resourceLabel = self::RESOURCE_MAP[$this->resource->subject_type] ?? class_basename($this->resource->subject_type);
        $subjectName = $this->resolveSubjectName($subject);
        $description = $this->resolveDescription($resourceLabel);

        return [
            'id' => $this->resource->id,
            'user_name' => $this->resource->causer?->name ?? 'Sistema',
            'description' => $description,
            'subject_type' => $this->resource->subject_type,
            'resource_label' => $resourceLabel,
            'subject_name' => $subjectName,
            'created_at' => $this->resource->created_at->toIso8601String(),
            'ip' => $this->resource->properties['ip'] ?? null,
            'event_type' => $this->resource->description,
            'changes' => $this->resolveChanges(),
        ];
    }

    private function resolveSubjectName(?object $subject): string
    {
        if (!$subject) {
            $p = $this->resource->properties;
            $name = is_array($p) ? ($p['subject_name'] ?? null) : ($p->subject_name ?? null);
            return $name ?? 'N/A';
        }
        if ($subject instanceof StockMovement) {
            $subject->loadMissing(['product', 'department']);
            $typeLabel = $subject->type === 'retirada' ? 'Retirada' : ($subject->type === 'entrada' ? 'Entrada' : $subject->type);
            return $subject->notes
                ?: sprintf(
                    '%s · %d un. · %s%s',
                    $typeLabel,
                    $subject->quantity,
                    $subject->product?->name ?? 'Produto #' . $subject->product_id,
                    $subject->department ? ' → ' . $subject->department->name : ''
                );
        }
        if ($subject instanceof FixedAsset) {
            return $subject->patrimony_code . ($subject->name ? ' — ' . $subject->name : '');
        }
        if (is_object($subject) && isset($subject->name)) {
            return (string) $subject->name;
        }
        if (method_exists($subject, '__toString')) {
            $str = (string) $subject;
            return strlen($str) > 200 ? substr($str, 0, 197) . '...' : $str;
        }
        return 'N/A';
    }

    private function resolveDescription(string $resourceLabel): string
    {
        $action = self::ACTION_MAP[$this->resource->description] ?? $this->resource->description;
        $verb = strtolower($action);
        $article = in_array($resourceLabel, ['Função', 'Permissão', 'Categoria', 'Movimentação'], true) ? 'a' : 'o';
        return $verb . ' ' . $article . ' ' . strtolower($resourceLabel);
    }

    /**
     * @return array<int, array{field: string, old_value: mixed, new_value: mixed}>
     */
    private function resolveChanges(): array
    {
        $props = $this->resource->properties;
        if ($props === null) {
            return [];
        }
        $props = is_array($props) ? $props : (method_exists($props, 'toArray') ? $props->toArray() : []);
        $old = $props['old'] ?? [];
        $attributes = $props['attributes'] ?? [];
        if (!is_array($old) && !is_array($attributes)) {
            return [];
        }
        $old = is_array($old) ? $old : [];
        $attributes = is_array($attributes) ? $attributes : [];
        $allKeys = array_unique(array_merge(array_keys($old), array_keys($attributes)));
        $changes = [];
        $hidden = ['password', 'remember_token', 'created_at', 'updated_at'];
        foreach ($allKeys as $key) {
            if (in_array($key, $hidden, true)) {
                continue;
            }
            $oldVal = $old[$key] ?? null;
            $newVal = $attributes[$key] ?? null;
            if ($oldVal === $newVal && $oldVal !== null) {
                continue;
            }
            $changes[] = [
                'field' => $this->humanizeField($key),
                'old_value' => $oldVal,
                'new_value' => $newVal,
            ];
        }
        return $changes;
    }

    private function humanizeField(string $key): string
    {
        $map = [
            'name' => 'Nome',
            'email' => 'E-mail',
            'patrimony_code' => 'Etiqueta',
            'serial_number' => 'Número de série',
            'brand' => 'Marca',
            'description' => 'Descrição',
            'category_id' => 'Categoria',
            'department_id' => 'Departamento',
            'status' => 'Status',
            'acquisition_date' => 'Data de aquisição',
            'acquisition_value' => 'Valor',
            'quantity' => 'Quantidade',
            'value' => 'Valor',
            'product_id' => 'Produto',
            'user_id' => 'Usuário',
            'type' => 'Tipo',
            'movement_date' => 'Data da movimentação',
            'notes' => 'Observações',
            'permissions' => 'Permissões',
            'code' => 'Código',
        ];
        return $map[$key] ?? preg_replace('/_/', ' ', ucfirst($key));
    }
}
