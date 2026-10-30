<?php

namespace App\Support;

final class PublicAssetUrl
{
    public static function normalize(?string $url): ?string
    {
        $url = is_string($url) ? trim($url) : '';
        if ($url === '') {
            return null;
        }

        if (preg_match('#^https?://#i', $url)) {
            $parts = parse_url($url);
            $path = $parts['path'] ?? '';

            if ($path !== '' && str_starts_with($path, '/uploads/')) {
                $query = isset($parts['query']) ? '?' . $parts['query'] : '';
                return $path . $query;
            }

            return $url;
        }

        return str_starts_with($url, '/') ? $url : '/' . $url;
    }
}
