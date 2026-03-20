<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTrustedFrontendRequest
{
    public function handle(Request $request, Closure $next): Response
    {
        if (in_array($request->getMethod(), ['GET', 'HEAD', 'OPTIONS'], true)) {
            return $next($request);
        }

        $headerName = (string) config('jwt.frontend_header', 'X-Arqui-Admin-Request');
        $expectedValue = (string) config('jwt.frontend_header_value', '1');
        $providedValue = (string) $request->header($headerName, '');

        if ($providedValue === '' || !hash_equals($expectedValue, $providedValue)) {
            return response()->json(['error' => 'Invalid admin request.'], 403);
        }

        return $next($request);
    }
}
