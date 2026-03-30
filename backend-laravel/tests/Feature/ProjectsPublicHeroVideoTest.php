<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class ProjectsPublicHeroVideoTest extends TestCase
{
    private string $uploadsDir;

    protected function setUp(): void
    {
        parent::setUp();

        $this->uploadsDir = public_path('uploads/test-range');
        File::ensureDirectoryExists($this->uploadsDir);
        File::put($this->uploadsDir . '/hero-video.txt', '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->uploadsDir);
        parent::tearDown();
    }

    public function test_public_hero_video_supports_byte_ranges(): void
    {
        DB::shouldReceive('select')
            ->once()
            ->andReturn([
                (object) [
                    'details_json' => json_encode([
                        'heroVideoUrl' => '/uploads/test-range/hero-video.txt',
                    ]),
                ],
            ]);

        $response = $this->get('/api/projects/public/1/hero-video', [
            'Range' => 'bytes=5-9',
        ]);

        $response->assertStatus(206);
        $response->assertHeader('Accept-Ranges', 'bytes');
        $response->assertHeader('Content-Range', 'bytes 5-9/36');
        $response->assertHeader('Content-Length', '5');
        $this->assertSame('56789', $response->streamedContent());
    }

    public function test_public_hero_video_rejects_invalid_ranges(): void
    {
        DB::shouldReceive('select')
            ->once()
            ->andReturn([
                (object) [
                    'details_json' => json_encode([
                        'heroVideoUrl' => '/uploads/test-range/hero-video.txt',
                    ]),
                ],
            ]);

        $response = $this->get('/api/projects/public/1/hero-video', [
            'Range' => 'bytes=99-120',
        ]);

        $response->assertStatus(416);
        $response->assertHeader('Content-Range', 'bytes */36');
    }
}
