<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PricingRate extends Model
{
    protected $table = 'pricing_rates';

    protected $fillable = [
        'name',
        'base_price_per_m2',
        'currency',
        'is_active',
        'min_days',
        'max_days',
        'effective_from',
    ];

    protected $casts = [
        'base_price_per_m2' => 'decimal:2',
        'is_active' => 'boolean',
        'min_days' => 'integer',
        'max_days' => 'integer',
        'effective_from' => 'date',
    ];

    public function quotes(): HasMany
    {
        return $this->hasMany(Quote::class, 'pricing_rate_id');
    }
}
