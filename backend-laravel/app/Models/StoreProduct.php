<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StoreProduct extends Model
{
    protected $fillable = [
        'code',
        'title',
        'category',
        'software',
        'price_from',
        'currency',
        'delivery',
        'format',
        'support',
        'ideal_for',
        'description',
        'long_description',
        'includes_json',
        'extra_details_json',
        'image_url',
        'accent',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'price_from' => 'decimal:2',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];
}
