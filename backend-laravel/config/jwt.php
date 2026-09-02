<?php

return [
    'secret' => env('JWT_SECRET'),
    'expires_in' => env('JWT_EXPIRES_IN', '12h'),
    'cookie_name' => env('JWT_COOKIE_NAME', 'arqui_admin_session'),
    'cookie_path' => env('JWT_COOKIE_PATH', '/'),
    'cookie_domain' => env('JWT_COOKIE_DOMAIN'),
    'cookie_secure' => env('JWT_COOKIE_SECURE', env('APP_ENV') === 'production'),
    'cookie_same_site' => env(
        'JWT_COOKIE_SAME_SITE',
        env('JWT_COOKIE_SECURE', env('APP_ENV') === 'production') ? 'none' : 'lax'
    ),
    'frontend_header' => env('JWT_FRONTEND_HEADER', 'X-Arqui-Admin-Request'),
    'frontend_header_value' => env('JWT_FRONTEND_HEADER_VALUE', '1'),
];
