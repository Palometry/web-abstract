<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_values(array_filter(array_map(
        static fn (string $origin) => trim($origin),
        explode(',', (string) env('CORS_ALLOWED_ORIGINS', 'http://localhost:4200,http://127.0.0.1:4200'))
    ))),
    'allowed_origins_patterns' => array_values(array_filter(array_map(
        static fn (string $pattern) => trim($pattern),
        explode(',', (string) env('CORS_ALLOWED_ORIGIN_PATTERNS', ''))
    ))),
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];

