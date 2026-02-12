<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectImage extends Model
{
    protected $table = 'project_images';

    protected $fillable = [
        'project_id',
        'media_id',
        'is_cover',
        'sort_order',
    ];

    protected $casts = [
        'project_id' => 'integer',
        'media_id' => 'integer',
        'is_cover' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function media(): BelongsTo
    {
        return $this->belongsTo(MediaAsset::class, 'media_id');
    }
}
