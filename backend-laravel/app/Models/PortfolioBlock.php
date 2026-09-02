<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PortfolioBlock extends Model
{
    protected $table = 'portfolio_blocks';

    protected $fillable = [
        'portfolio_id',
        'block_type',
        'text_content',
        'media_id',
        'caption',
        'layout',
        'sort_order',
        'is_visible',
    ];

    protected $casts = [
        'portfolio_id' => 'integer',
        'media_id' => 'integer',
        'sort_order' => 'integer',
        'is_visible' => 'boolean',
    ];

    public function entry(): BelongsTo
    {
        return $this->belongsTo(PortfolioEntry::class, 'portfolio_id');
    }

    public function media(): BelongsTo
    {
        return $this->belongsTo(MediaAsset::class, 'media_id');
    }
}
