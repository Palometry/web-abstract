<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuoteService extends Model
{
    protected $table = 'quote_services';

    protected $fillable = [
        'quote_id',
        'service_id',
        'quantity',
        'unit_price',
        'line_total',
    ];

    protected $casts = [
        'quote_id' => 'integer',
        'service_id' => 'integer',
        'quantity' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'line_total' => 'decimal:2',
    ];

    public function quote(): BelongsTo
    {
        return $this->belongsTo(Quote::class, 'quote_id');
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class, 'service_id');
    }
}
