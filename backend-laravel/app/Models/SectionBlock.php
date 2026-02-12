<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SectionBlock extends Model
{
    protected $table = 'section_blocks';

    protected $fillable = [
        'section_id',
        'block_type',
        'content_json',
        'sort_order',
        'is_visible',
    ];

    protected $casts = [
        'section_id' => 'integer',
        'sort_order' => 'integer',
        'is_visible' => 'boolean',
    ];

    public function section(): BelongsTo
    {
        return $this->belongsTo(PageSection::class, 'section_id');
    }
}
