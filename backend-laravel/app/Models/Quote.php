<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Quote extends Model
{
    protected $table = 'quotes';

    protected $fillable = [
        'pricing_rate_id',
        'full_name',
        'phone',
        'email',
        'document_type',
        'document_number',
        'project_name',
        'project_address',
        'area_m2',
        'area_covered_m2',
        'area_uncovered_percent',
        'floor_count',
        'base_rate_per_m2',
        'base_cost',
        'extras_cost',
        'total_cost',
        'currency',
        'status',
        'notes',
        'expires_at',
        'plan_name',
        'plan_min_days',
        'plan_max_days',
    ];

    protected $casts = [
        'pricing_rate_id' => 'integer',
        'area_m2' => 'decimal:2',
        'area_covered_m2' => 'decimal:2',
        'area_uncovered_percent' => 'decimal:2',
        'floor_count' => 'integer',
        'base_rate_per_m2' => 'decimal:2',
        'base_cost' => 'decimal:2',
        'extras_cost' => 'decimal:2',
        'total_cost' => 'decimal:2',
        'expires_at' => 'date',
        'plan_min_days' => 'integer',
        'plan_max_days' => 'integer',
    ];

    public function pricingRate(): BelongsTo
    {
        return $this->belongsTo(PricingRate::class, 'pricing_rate_id');
    }

    public function services(): HasMany
    {
        return $this->hasMany(QuoteService::class, 'quote_id');
    }
}
