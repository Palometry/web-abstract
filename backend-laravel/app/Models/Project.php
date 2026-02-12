<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Project extends Model
{
    protected $table = 'projects';

    protected $fillable = [
        'name',
        'client_name',
        'address',
        'description',
        'status',
        'start_date',
        'end_date',
        'slug',
        'details_json',
    ];

    protected $casts = [
        'details_json' => 'array',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function portfolioEntries(): HasMany
    {
        return $this->hasMany(PortfolioEntry::class, 'project_id');
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProjectImage::class, 'project_id');
    }
}
