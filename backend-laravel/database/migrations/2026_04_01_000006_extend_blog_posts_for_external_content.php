<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('blog_posts')) {
            Schema::create('blog_posts', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->string('slug')->unique();
                $table->string('content_type')->default('article');
                $table->string('status')->default('draft');
                $table->text('excerpt')->nullable();
                $table->longText('content')->nullable();
                $table->string('cover_image_url')->nullable();
                $table->string('external_url')->nullable();
                $table->string('external_platform')->nullable();
                $table->string('external_account')->nullable();
                $table->string('external_cta')->nullable();
                $table->timestamp('published_at')->nullable();
                $table->timestamps();
            });

            return;
        }

        $missingColumns = array_values(array_filter([
            !Schema::hasColumn('blog_posts', 'content_type') ? 'content_type' : null,
            !Schema::hasColumn('blog_posts', 'external_url') ? 'external_url' : null,
            !Schema::hasColumn('blog_posts', 'external_platform') ? 'external_platform' : null,
            !Schema::hasColumn('blog_posts', 'external_account') ? 'external_account' : null,
            !Schema::hasColumn('blog_posts', 'external_cta') ? 'external_cta' : null,
        ]));

        if ($missingColumns !== []) {
            Schema::table('blog_posts', function (Blueprint $table) use ($missingColumns) {
                if (in_array('content_type', $missingColumns, true)) {
                    $table->string('content_type')->default('article');
                }
                if (in_array('external_url', $missingColumns, true)) {
                    $table->string('external_url')->nullable();
                }
                if (in_array('external_platform', $missingColumns, true)) {
                    $table->string('external_platform')->nullable();
                }
                if (in_array('external_account', $missingColumns, true)) {
                    $table->string('external_account')->nullable();
                }
                if (in_array('external_cta', $missingColumns, true)) {
                    $table->string('external_cta')->nullable();
                }
            });
        }

        if (Schema::hasColumn('blog_posts', 'content_type')) {
            DB::table('blog_posts')
                ->whereNull('content_type')
                ->update(['content_type' => 'article']);
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('blog_posts')) {
            return;
        }

        $droppableColumns = array_values(array_filter([
            Schema::hasColumn('blog_posts', 'content_type') ? 'content_type' : null,
            Schema::hasColumn('blog_posts', 'external_url') ? 'external_url' : null,
            Schema::hasColumn('blog_posts', 'external_platform') ? 'external_platform' : null,
            Schema::hasColumn('blog_posts', 'external_account') ? 'external_account' : null,
            Schema::hasColumn('blog_posts', 'external_cta') ? 'external_cta' : null,
        ]));

        if ($droppableColumns !== []) {
            Schema::table('blog_posts', function (Blueprint $table) use ($droppableColumns) {
                $table->dropColumn($droppableColumns);
            });
        }
    }
};
