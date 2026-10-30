<?php

namespace Tests\Feature\Security;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PublicApiExposureTest extends TestCase
{
    use RefreshDatabase;

    public function test_draft_project_cannot_be_read_through_public_detail(): void
    {
        $projectId = DB::table('projects')->insertGetId([
            'name' => 'Draft project',
            'client_name' => 'Private client',
            'address' => 'Private address',
            'status' => 'draft',
            'details_json' => json_encode(['shortDesc' => 'Not published']),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->getJson("/api/projects/public/{$projectId}")->assertStatus(404);
    }

    public function test_draft_project_media_cannot_be_read(): void
    {
        $projectId = DB::table('projects')->insertGetId([
            'name' => 'Draft media project',
            'client_name' => 'Private client',
            'address' => 'Private address',
            'status' => 'draft',
            'details_json' => json_encode([
                'brochurePdfUrl' => '/uploads/private.pdf',
                'heroVideoUrl' => '/uploads/private.mp4',
                'panoramaUrl' => '/uploads/private.webp',
            ]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->get("/api/projects/public/{$projectId}/brochure")->assertStatus(404);
        $this->get("/api/projects/public/{$projectId}/hero-video")->assertStatus(404);
        $this->get("/api/projects/public/{$projectId}/panorama")->assertStatus(404);
    }

    public function test_internal_dashboard_stats_are_not_public(): void
    {
        $this->getJson('/api/dashboard/public')->assertStatus(404);
    }

    public function test_public_quote_options_only_include_active_records(): void
    {
        foreach ([true, false] as $active) {
            DB::table('pricing_rates')->insert([
                'name' => $active ? 'Active plan' : 'Retired plan',
                'base_price_per_m2' => $active ? 100 : 1,
                'currency' => 'PEN',
                'is_active' => $active ? 1 : 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            DB::table('services')->insert([
                'name' => $active ? 'Active service' : 'Retired service',
                'description' => 'Test service',
                'is_active' => $active ? 1 : 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $response = $this->getJson('/api/quotes/public/options');

        $response
            ->assertOk()
            ->assertJsonCount(1, 'pricingRates')
            ->assertJsonCount(1, 'services')
            ->assertJsonPath('pricingRates.0.name', 'Active plan')
            ->assertJsonPath('services.0.name', 'Active service');
    }

    public function test_api_responses_include_defensive_headers(): void
    {
        $response = $this->getJson('/api/health');

        $response
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Referrer-Policy', 'no-referrer');
    }
}
