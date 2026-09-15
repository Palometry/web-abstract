<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('uploads:apply-webp-map {map=database/upload-webp-map.json}', function (string $map) {
    $path = base_path($map);
    if (!is_file($path)) {
        $this->error("Map file not found: {$path}");
        return self::FAILURE;
    }

    $entries = json_decode((string) file_get_contents($path), true);
    if (!is_array($entries)) {
        $this->error("Map file is not valid JSON: {$path}");
        return self::FAILURE;
    }

    $sqlReplaceTargets = [
        ['media_assets', 'file_url'],
        ['media_assets', 'file_path'],
        ['page_sections', 'image_url'],
        ['blog_posts', 'cover_image_url'],
    ];
    $textReplaceTargets = [
        ['projects', 'details_json'],
        ['section_blocks', 'content_json'],
    ];

    $updated = 0;

    DB::transaction(function () use ($entries, $sqlReplaceTargets, $textReplaceTargets, &$updated) {
        foreach ($entries as $entry) {
            $oldUrl = $entry['oldUrl'] ?? null;
            $newUrl = $entry['newUrl'] ?? null;
            $oldRelativePath = $entry['oldRelativePath'] ?? null;
            $newRelativePath = $entry['newRelativePath'] ?? null;
            $newSize = $entry['newSize'] ?? null;

            if (!$oldUrl || !$newUrl || !$oldRelativePath || !$newRelativePath) {
                continue;
            }

            foreach ($sqlReplaceTargets as [$table, $column]) {
                $updated += DB::table($table)
                    ->where($column, 'like', '%' . $oldUrl . '%')
                    ->update([$column => DB::raw("REPLACE({$column}, " . DB::getPdo()->quote($oldUrl) . ', ' . DB::getPdo()->quote($newUrl) . ')')]);

                $updated += DB::table($table)
                    ->where($column, 'like', '%' . $oldRelativePath . '%')
                    ->update([$column => DB::raw("REPLACE({$column}, " . DB::getPdo()->quote($oldRelativePath) . ', ' . DB::getPdo()->quote($newRelativePath) . ')')]);
            }

            foreach ($textReplaceTargets as [$table, $column]) {
                DB::table($table)
                    ->where($column, 'like', '%' . $oldUrl . '%')
                    ->orWhere($column, 'like', '%' . $oldRelativePath . '%')
                    ->select('id', $column)
                    ->orderBy('id')
                    ->chunkById(100, function ($rows) use ($table, $column, $oldUrl, $newUrl, $oldRelativePath, $newRelativePath, &$updated) {
                        foreach ($rows as $row) {
                            $current = (string) $row->{$column};
                            $next = str_replace(
                                [$oldUrl, $oldRelativePath],
                                [$newUrl, $newRelativePath],
                                $current,
                            );

                            if ($next === $current) {
                                continue;
                            }

                            DB::table($table)
                                ->where('id', $row->id)
                                ->update([$column => $next]);
                            $updated++;
                        }
                    });
            }

            $mediaUpdates = [
                'mime_type' => 'image/webp',
            ];
            if (is_int($newSize)) {
                $mediaUpdates['file_size'] = $newSize;
            }

            DB::table('media_assets')
                ->where('file_url', $newUrl)
                ->update($mediaUpdates);
        }
    });

    $this->info("Applied WebP upload map. Updated {$updated} text fields.");
    return self::SUCCESS;
})->purpose('Apply converted upload WebP paths to database records');
