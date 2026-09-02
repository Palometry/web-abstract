<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_public_catalog', function (Blueprint $table) {
            $table->id();
            $table->string('scope');
            $table->string('type');
            $table->string('classification');
            $table->string('category')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->index(['scope', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_public_catalog');
    }
};
