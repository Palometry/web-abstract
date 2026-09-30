<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('store_products', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('title');
            $table->string('category');
            $table->string('software')->nullable();
            $table->decimal('price_from', 12, 2)->default(0);
            $table->string('currency', 3)->default('PEN');
            $table->string('delivery')->nullable();
            $table->string('format')->nullable();
            $table->string('support')->nullable();
            $table->text('ideal_for')->nullable();
            $table->text('description');
            $table->longText('long_description')->nullable();
            $table->longText('includes_json')->nullable();
            $table->longText('extra_details_json')->nullable();
            $table->string('image_url')->nullable();
            $table->string('accent', 20)->default('#9f3232');
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('store_products');
    }
};
