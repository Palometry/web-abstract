<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('pricing_rates')
            ->whereRaw('LOWER(name) LIKE ?', ['%premium%'])
            ->where('currency', 'PEN')
            ->where('is_active', true)
            ->update(['base_price_per_m2' => 30.00]);
    }

    public function down(): void
    {
        // Published prices may have changed again; do not overwrite them on rollback.
    }
};
