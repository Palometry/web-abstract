<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Service extends Model
{
    protected $table = 'services';

    protected $fillable = [
        'name',
        'description',
        'icon',
        'display_order',
        'is_public',
        'is_addon',
        'pricing_type',
        'price',
        'currency',
        'is_active',
    ];

    protected $casts = [
        'display_order' => 'integer',
        'is_public' => 'boolean',
        'is_addon' => 'boolean',
        'price' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function quoteServices(): HasMany
    {
        return $this->hasMany(QuoteService::class, 'service_id');
    }
}
