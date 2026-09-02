<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Firebase\JWT\JWT;

class AuthController extends Controller
{
    public function login(LoginRequest $request)
    {
        $secret = (string) config('jwt.secret', '');
        if ($secret === '' || $secret === 'change_me' || strlen($secret) < 32) {
            return response()->json(['error' => 'JWT not configured securely.'], 500);
        }

        $email = $request->input('email');
        $password = $request->input('password');

        $user = DB::table('users')
            ->select('id', 'email', 'password_hash', 'full_name', 'phone', 'is_active')
            ->where('email', $email)
            ->limit(1)
            ->first();

        if (!$user || !$user->is_active) {
            return response()->json(['error' => 'Invalid credentials.'], 401);
        }

        if (!Hash::check($password, $user->password_hash)) {
            return response()->json(['error' => 'Invalid credentials.'], 401);
        }

        $roles = DB::table('roles as r')
            ->join('user_roles as ur', 'ur.role_id', '=', 'r.id')
            ->where('ur.user_id', $user->id)
            ->pluck('r.name')
            ->values()
            ->all();

        $expiresIn = (string) config('jwt.expires_in', '12h');
        $now = time();
        $ttl = $this->parseExpiresIn($expiresIn);
        $token = JWT::encode(
            [
                'id' => $user->id,
                'email' => $user->email,
                'roles' => $roles,
                'iat' => $now,
                'exp' => $now + $ttl,
            ],
            $secret,
            'HS256'
        );

        return response()->json([
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'fullName' => $user->full_name,
                'phone' => $user->phone,
                'roles' => $roles,
            ],
            'token' => $token,
            'expiresAt' => gmdate(DATE_ATOM, $now + $ttl),
        ])->withCookie($this->makeAuthCookie($token, $ttl));
    }

    public function logout()
    {
        return response()->json(['ok' => true])->withCookie($this->forgetAuthCookie());
    }

    public function me(Request $request)
    {
        $payload = $request->attributes->get('jwt_user');
        $userId = is_array($payload) ? ($payload['id'] ?? null) : null;
        if (!$userId) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $user = DB::table('users')
            ->select('id', 'email', 'full_name', 'phone', 'is_active')
            ->where('id', $userId)
            ->limit(1)
            ->first();

        if (!$user) {
            return response()->json(['error' => 'User not found.'], 404);
        }

        $roles = DB::table('roles as r')
            ->join('user_roles as ur', 'ur.role_id', '=', 'r.id')
            ->where('ur.user_id', $userId)
            ->pluck('r.name')
            ->values()
            ->all();

        return response()->json([
            'id' => $user->id,
            'email' => $user->email,
            'fullName' => $user->full_name,
            'phone' => $user->phone,
            'isActive' => (bool) $user->is_active,
            'roles' => $roles,
        ]);
    }

    private function parseExpiresIn(string $value): int
    {
        $trimmed = trim($value);
        if (is_numeric($trimmed)) {
            return (int) $trimmed;
        }

        if (preg_match('/^(\\d+)([smhd])$/', $trimmed, $matches)) {
            $amount = (int) $matches[1];
            $unit = $matches[2];
            return match ($unit) {
                's' => $amount,
                'm' => $amount * 60,
                'h' => $amount * 3600,
                'd' => $amount * 86400,
                default => 43200,
            };
        }

        return 43200;
    }

    private function makeAuthCookie(string $token, int $ttlSeconds)
    {
        $minutes = max(1, (int) ceil($ttlSeconds / 60));

        return Cookie::make(
            (string) config('jwt.cookie_name', 'arqui_admin_session'),
            $token,
            $minutes,
            (string) config('jwt.cookie_path', '/'),
            config('jwt.cookie_domain'),
            (bool) config('jwt.cookie_secure', false),
            true,
            false,
            (string) config('jwt.cookie_same_site', 'lax')
        );
    }

    private function forgetAuthCookie()
    {
        return Cookie::forget(
            (string) config('jwt.cookie_name', 'arqui_admin_session'),
            (string) config('jwt.cookie_path', '/'),
            config('jwt.cookie_domain')
        );
    }
}
