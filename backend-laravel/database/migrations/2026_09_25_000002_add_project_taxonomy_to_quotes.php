<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotes', function (Blueprint $table) {
            if (!Schema::hasColumn('quotes', 'project_type')) {
                $table->string('project_type')->nullable()->after('project_name');
            }
            if (!Schema::hasColumn('quotes', 'project_classification')) {
                $table->string('project_classification')->nullable()->after('project_type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('quotes', function (Blueprint $table) {
            if (Schema::hasColumn('quotes', 'project_classification')) {
                $table->dropColumn('project_classification');
            }
            if (Schema::hasColumn('quotes', 'project_type')) {
                $table->dropColumn('project_type');
            }
        });
    }
};