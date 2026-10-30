<?php

namespace Tests\Unit;

use App\Support\PublicAssetUrl;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class PublicAssetUrlTest extends TestCase
{
    public static function urlProvider(): array
    {
        return [
            'empty value' => [null, null],
            'absolute backend upload' => [
                'http://localhost:8000/uploads/portfolio/cover.webp',
                '/uploads/portfolio/cover.webp',
            ],
            'absolute upload with query' => [
                'https://api.example.com/uploads/video.mp4?v=2',
                '/uploads/video.mp4?v=2',
            ],
            'relative upload' => ['uploads/services/image.webp', '/uploads/services/image.webp'],
            'root relative upload' => ['/uploads/store/image.webp', '/uploads/store/image.webp'],
            'external asset' => [
                'https://images.unsplash.com/photo-123',
                'https://images.unsplash.com/photo-123',
            ],
        ];
    }

    #[DataProvider('urlProvider')]
    public function test_it_normalizes_public_asset_urls(?string $input, ?string $expected): void
    {
        $this->assertSame($expected, PublicAssetUrl::normalize($input));
    }
}
