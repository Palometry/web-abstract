<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->string('password_hash');
            $table->string('full_name');
            $table->string('phone')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->timestamps();
        });

        Schema::create('user_roles', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('role_id');
            $table->unique(['user_id', 'role_id']);
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('role_id')->references('id')->on('roles')->onDelete('cascade');
        });

        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description');
            $table->string('icon')->nullable();
            $table->integer('display_order')->default(0);
            $table->boolean('is_public')->default(true);
            $table->boolean('is_addon')->default(false);
            $table->string('pricing_type')->default('flat');
            $table->decimal('price', 12, 2)->default(0);
            $table->string('currency', 3)->default('PEN');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('client_name');
            $table->string('address');
            $table->text('description')->nullable();
            $table->string('status')->default('draft');
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->string('slug')->nullable();
            $table->json('details_json')->nullable();
            $table->timestamps();
        });

        Schema::create('portfolio_entries', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_id');
            $table->string('title_override')->nullable();
            $table->string('category')->nullable();
            $table->text('summary')->nullable();
            $table->string('autocad_url')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_visible')->default(true);
            $table->timestamps();
            $table->foreign('project_id')->references('id')->on('projects')->onDelete('cascade');
        });

        Schema::create('media_assets', function (Blueprint $table) {
            $table->id();
            $table->string('file_url');
            $table->string('file_path')->nullable();
            $table->string('mime_type')->nullable();
            $table->integer('file_size')->nullable();
            $table->string('title')->nullable();
            $table->string('alt_text')->nullable();
            $table->timestamps();
        });

        Schema::create('project_images', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_id');
            $table->unsignedBigInteger('media_id');
            $table->boolean('is_cover')->default(false);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->foreign('project_id')->references('id')->on('projects')->onDelete('cascade');
            $table->foreign('media_id')->references('id')->on('media_assets')->onDelete('cascade');
        });

        Schema::create('pages', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->string('status')->default('draft');
            $table->string('meta_title')->nullable();
            $table->text('meta_description')->nullable();
            $table->timestamps();
        });

        Schema::create('page_sections', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('page_id');
            $table->string('section_key');
            $table->string('title')->nullable();
            $table->text('description')->nullable();
            $table->string('image_url')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_visible')->default(false);
            $table->unique(['page_id', 'section_key']);
            $table->timestamps();
            $table->foreign('page_id')->references('id')->on('pages')->onDelete('cascade');
        });

        Schema::create('section_blocks', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('section_id');
            $table->string('block_type');
            $table->longText('content_json');
            $table->integer('sort_order')->default(0);
            $table->boolean('is_visible')->default(false);
            $table->timestamps();
            $table->foreign('section_id')->references('id')->on('page_sections')->onDelete('cascade');
        });

        Schema::create('pricing_rates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->decimal('base_price_per_m2', 12, 2);
            $table->string('currency', 3);
            $table->boolean('is_active')->default(true);
            $table->integer('min_days')->nullable();
            $table->integer('max_days')->nullable();
            $table->date('effective_from')->nullable();
            $table->timestamps();
        });

        Schema::create('quotes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('pricing_rate_id')->nullable();
            $table->string('full_name');
            $table->string('phone');
            $table->string('email');
            $table->string('document_type')->nullable();
            $table->string('document_number')->nullable();
            $table->string('project_name');
            $table->string('project_address')->nullable();
            $table->decimal('area_m2', 12, 2);
            $table->decimal('area_covered_m2', 12, 2)->nullable();
            $table->decimal('area_uncovered_percent', 5, 2)->nullable();
            $table->integer('floor_count')->nullable();
            $table->decimal('base_rate_per_m2', 12, 2);
            $table->decimal('base_cost', 12, 2);
            $table->decimal('extras_cost', 12, 2)->default(0);
            $table->decimal('total_cost', 12, 2)->default(0);
            $table->string('currency', 3);
            $table->string('status');
            $table->text('notes')->nullable();
            $table->date('expires_at')->nullable();
            $table->string('plan_name')->nullable();
            $table->integer('plan_min_days')->nullable();
            $table->integer('plan_max_days')->nullable();
            $table->timestamps();
            $table->foreign('pricing_rate_id')->references('id')->on('pricing_rates')->nullOnDelete();
        });

        Schema::create('quote_services', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('quote_id');
            $table->unsignedBigInteger('service_id');
            $table->decimal('quantity', 12, 2);
            $table->decimal('unit_price', 12, 2);
            $table->decimal('line_total', 12, 2);
            $table->timestamps();
            $table->foreign('quote_id')->references('id')->on('quotes')->onDelete('cascade');
            $table->foreign('service_id')->references('id')->on('services')->onDelete('cascade');
        });

        Schema::create('portfolio_images', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('portfolio_id');
            $table->unsignedBigInteger('media_id');
            $table->string('image_type');
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->foreign('portfolio_id')->references('id')->on('portfolio_entries')->onDelete('cascade');
            $table->foreign('media_id')->references('id')->on('media_assets')->onDelete('cascade');
        });

        Schema::create('portfolio_specs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('portfolio_id');
            $table->string('label');
            $table->string('value');
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->foreign('portfolio_id')->references('id')->on('portfolio_entries')->onDelete('cascade');
        });

        Schema::create('portfolio_tags', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('portfolio_id');
            $table->string('tag');
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->foreign('portfolio_id')->references('id')->on('portfolio_entries')->onDelete('cascade');
        });

        Schema::create('portfolio_blocks', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('portfolio_id');
            $table->string('block_type');
            $table->text('text_content')->nullable();
            $table->unsignedBigInteger('media_id')->nullable();
            $table->string('caption')->nullable();
            $table->string('layout')->default('inline');
            $table->integer('sort_order')->default(0);
            $table->boolean('is_visible')->default(true);
            $table->timestamps();
            $table->foreign('portfolio_id')->references('id')->on('portfolio_entries')->onDelete('cascade');
            $table->foreign('media_id')->references('id')->on('media_assets')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('portfolio_blocks');
        Schema::dropIfExists('portfolio_tags');
        Schema::dropIfExists('portfolio_specs');
        Schema::dropIfExists('portfolio_images');
        Schema::dropIfExists('quote_services');
        Schema::dropIfExists('quotes');
        Schema::dropIfExists('pricing_rates');
        Schema::dropIfExists('section_blocks');
        Schema::dropIfExists('page_sections');
        Schema::dropIfExists('pages');
        Schema::dropIfExists('project_images');
        Schema::dropIfExists('media_assets');
        Schema::dropIfExists('portfolio_entries');
        Schema::dropIfExists('projects');
        Schema::dropIfExists('services');
        Schema::dropIfExists('user_roles');
        Schema::dropIfExists('roles');
        Schema::dropIfExists('users');
    }
};
