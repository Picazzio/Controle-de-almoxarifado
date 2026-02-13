<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockRequest extends Model
{
    public const STATUS_PENDING = 'pendente';
    public const STATUS_SEPARATION = 'separation';
    public const STATUS_FULFILLED = 'atendida';
    public const STATUS_CANCELLED = 'cancelada';

    /** @var array<string> */
    public static array $statuses = ['pendente', 'separation', 'atendida', 'cancelada'];

    protected $fillable = ['user_id', 'status', 'notes'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(StockRequestItem::class);
    }
}
