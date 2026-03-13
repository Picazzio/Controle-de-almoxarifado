<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Contracts\Activity;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class FixedAsset extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'patrimony_code',
        'serial_number',
        'name',
        'brand',
        'description',
        'category_id',
        'department_id',
        'status',
        'acquisition_date',
        'acquisition_value',
        'invoice_number',
    ];

    protected $casts = [
        'acquisition_date' => 'date',
        'acquisition_value' => 'decimal:2',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'patrimony_code', 'serial_number', 'name', 'brand', 'description',
                'category_id', 'department_id', 'status', 'acquisition_date',
                'acquisition_value', 'invoice_number',
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    public function tapActivity(Activity $activity, string $eventName): void
    {
        $activity->properties = $activity->properties->merge(['ip' => request()->ip()]);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }
}
