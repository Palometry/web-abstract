<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PortfolioEntry extends Model
{
    protected $table = 'portfolio_entries';

    protected $fillable = [
        'project_id',
        'title_override',
        'category',
        'summary',
        'autocad_url',
        'sort_order',
        'is_visible',
    ];

    protected $casts = [
        'project_id' => 'integer',
        'sort_order' => 'integer',
        'is_visible' => 'boolean',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function images(): HasMany
    {
        return $this->hasMany(PortfolioImage::class, 'portfolio_id');
    }

    public function specs(): HasMany
    {
        return $this->hasMany(PortfolioSpec::class, 'portfolio_id');
    }

    public function tags(): HasMany
    {
        return $this->hasMany(PortfolioTag::class, 'portfolio_id');
    }

    public function blocks(): HasMany
    {
        return $this->hasMany(PortfolioBlock::class, 'portfolio_id');
    }
}
