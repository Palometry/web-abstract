<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [
        'http://localhost:4200',
        'http://127.0.0.1:4200',
        'https://booth-herbs-politicians-evaluation.trycloudflare.com',
    ],
    'allowed_origins_patterns' => [
        'https://.*\\.brs\\.devtunnels\\.ms',
        'https://.*\\.trycloudflare\\.com',
    ],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];

