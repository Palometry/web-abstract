<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PortfolioSpec extends Model
{
    protected $table = 'portfolio_specs';

    protected $fillable = [
        'portfolio_id',
        'label',
        'value',
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
