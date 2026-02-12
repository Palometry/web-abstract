<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('portfolio_entries', function (Blueprint $table) {
            $table->dropForeign(['project_id']);
        });

        DB::statement('ALTER TABLE portfolio_entries MODIFY project_id BIGINT UNSIGNED NULL');

        Schema::table('portfolio_entries', function (Blueprint $table) {
            $table
                ->foreign('project_id')
                ->references('id')
                ->on('projects')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('portfolio_entries', function (Blueprint $table) {
            $table->dropForeign(['project_id']);
        });

        DB::statement('ALTER TABLE portfolio_entries MODIFY project_id BIGINT UNSIGNED NOT NULL');

        Schema::table('portfolio_entries', function (Blueprint $table) {
            $table
                ->foreign('project_id')
                ->references('id')
                ->on('projects')
                ->onDelete('cascade');
        });
    }
};
