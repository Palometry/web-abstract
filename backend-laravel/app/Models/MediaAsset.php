<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MediaAsset extends Model
{
    protected $table = 'media_assets';

    protected $fillable = [
        'file_url',
        'file_path',
        'mime_type',
        'file_size',
        'title',
        'alt_text',
    ];

    protected $casts = [
        'file_size' => 'integer',
    ];

    public function projectImages(): HasMany
    {
        return $this->hasMany(ProjectImage::class, 'media_id');
    }

    public function portfolioImages(): HasMany
    {
        return $this->hasMany(PortfolioImage::class, 'media_id');
    }
}
