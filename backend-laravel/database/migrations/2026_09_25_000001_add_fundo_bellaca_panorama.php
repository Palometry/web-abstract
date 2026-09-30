<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const PANORAMA_URL = '/uploads/fundo-bellaca/fundo-bellaca-360.webp';

    public function up(): void
    {
        DB::table('projects')
            ->whereRaw('LOWER(name) = ?', ['fundo bellaca'])
            ->orderBy('id')
            ->each(function ($project): void {
                $details = json_decode($project->details_json ?: '{}', true);
                $details = is_array($details) ? $details : [];
                $details['panoramaUrl'] = self::PANORAMA_URL;

                DB::table('projects')
                    ->where('id', $project->id)
                    ->update(['details_json' => json_encode($details, JSON_UNESCAPED_SLASHES)]);
            });
    }

    public function down(): void
    {
        DB::table('projects')
            ->whereRaw('LOWER(name) = ?', ['fundo bellaca'])
            ->orderBy('id')
            ->each(function ($project): void {
                $details = json_decode($project->details_json ?: '{}', true);
                if (!is_array($details) || ($details['panoramaUrl'] ?? null) !== self::PANORAMA_URL) {
                    return;
                }

                unset($details['panoramaUrl']);
                DB::table('projects')
                    ->where('id', $project->id)
                    ->update(['details_json' => json_encode($details, JSON_UNESCAPED_SLASHES)]);
            });
    }
};
