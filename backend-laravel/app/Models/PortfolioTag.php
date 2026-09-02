<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PortfolioTag extends Model
{
    protected $table = 'portfolio_tags';

    protected $fillable = [
        'portfolio_id',
        'tag',
        'sort_order',
    ];

    protected $casts = [
        'portfolio_id' => 'integer',
        'sort_order' => 'integer',
    ];

    public function entry(): BelongsTo
    {
        return $this->belongsTo(PortfolioEntry::class, 'portfolio_id');
    }
}
