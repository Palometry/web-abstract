<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApiSecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Referrer-Policy', 'no-referrer');
        $response->headers->remove('Host');
        $response->headers->remove('Server');
        $response->headers->remove('X-Powered-By');
        if (function_exists('header_remove')) {
            header_remove('Host');
            header_remove('Server');
            header_remove('X-Powered-By');
        }
        $response->headers->set(
            'Permissions-Policy',
            'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
        );

        $contentType = strtolower((string) $response->headers->get('Content-Type', ''));
        if (str_contains($contentType, 'application/json')) {
            $response->headers->set('Cache-Control', 'no-store, private');
            $response->headers->set('Pragma', 'no-cache');
        }

        return $response;
    }
}
