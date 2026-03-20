<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JwtAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $this->resolveToken($request);
        if (!$token) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        try {
            $secret = (string) config('jwt.secret', '');
            if ($secret === '' || $secret === 'change_me' || strlen($secret) < 32) {
                return response()->json(['error' => 'JWT not configured securely'], 500);
            }
            $payload = (array) JWT::decode($token, new Key($secret, 'HS256'));
        } catch (\Throwable) {
            return response()->json(['error' => 'Invalid token'], 401);
        }

        $request->attributes->set('jwt_user', $payload);
        return $next($request);
    }

    private function resolveToken(Request $request): ?string
    {
        $header = $request->header('Authorization', '');
        if (str_starts_with($header, 'Bearer ')) {
            return substr($header, 7);
        }

        $cookieName = (string) config('jwt.cookie_name', 'arqui_admin_session');
        $cookieToken = $request->cookie($cookieName);
        if (is_string($cookieToken)) {
            $cookieToken = trim(urldecode($cookieToken), "\"' \t\n\r\0\x0B");
        }

        return is_string($cookieToken) && trim($cookieToken) !== ''
            ? $cookieToken
            : null;
    }
}
