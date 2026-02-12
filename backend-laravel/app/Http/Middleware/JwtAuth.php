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
        $header = $request->header('Authorization', '');
        if (!str_starts_with($header, 'Bearer ')) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $token = substr($header, 7);
        try {
            $secret = env('JWT_SECRET', 'change_me');
            $payload = (array) JWT::decode($token, new Key($secret, 'HS256'));
        } catch (\Throwable) {
            return response()->json(['error' => 'Invalid token'], 401);
        }

        $request->attributes->set('jwt_user', $payload);
        return $next($request);
    }
}
