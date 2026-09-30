<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('services')
            ->whereRaw('LOWER(name) LIKE ?', ['%edificacion inmobiliari%'])
            ->update(['icon' => '/services#cotizacion']);
    }

    public function down(): void
    {
        DB::table('services')
            ->whereRaw('LOWER(name) LIKE ?', ['%edificacion inmobiliari%'])
            ->where('icon', '/services#cotizacion')
            ->update(['icon' => null]);
    }
};
