<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireRole
{
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->attributes->get('jwt_user');
        if (!is_array($user)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $userRoles = isset($user['roles']) && is_array($user['roles']) ? $user['roles'] : [];
        $allowed = array_filter($roles, fn ($role) => $role !== '');
        $hasRole = count(array_intersect($userRoles, $allowed)) > 0;

        if (!$hasRole) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        return $next($request);
    }
}
