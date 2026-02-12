<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PortfolioImage extends Model
{
    protected $table = 'portfolio_images';

    protected $fillable = [
        'portfolio_id',
        'media_id',
        'image_type',
        'sort_order',
    ];

    protected $casts = [
        'portfolio_id' => 'integer',
        'media_id' => 'integer',
        'sort_order' => 'integer',
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
