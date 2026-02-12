<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PageSection extends Model
{
    protected $table = 'page_sections';

    protected $fillable = [
        'page_id',
        'section_key',
        'title',
        'description',
        'image_url',
        'sort_order',
        'is_visible',
    ];

    protected $casts = [
        'page_id' => 'integer',
        'sort_order' => 'integer',
        'is_visible' => 'boolean',
    ];

    public function page(): BelongsTo
    {
        return $this->belongsTo(Page::class, 'page_id');
    }

    public function blocks(): HasMany
    {
        return $this->hasMany(SectionBlock::class, 'section_id');
    }
}
