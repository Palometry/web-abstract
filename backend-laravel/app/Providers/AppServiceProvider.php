<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('auth-login', function (Request $request) {
            $email = strtolower(trim((string) $request->input('email', '')));

            return Limit::perMinute(5)
                ->by($request->ip() . '|' . $email)
                ->response(fn () => response()->json(['error' => 'Too many login attempts.'], 429));
        });

        RateLimiter::for('public-contact', function (Request $request) {
            return Limit::perMinute(5)
                ->by($request->ip())
                ->response(fn () => response()->json(['error' => 'Too many contact requests.'], 429));
        });

        RateLimiter::for('public-chat', function (Request $request) {
            $sessionId = trim((string) $request->input('sessionId', ''));

            return Limit::perMinute(20)
                ->by($request->ip() . '|' . $sessionId)
                ->response(fn () => response()->json(['error' => 'Too many chat requests.'], 429));
        });

        RateLimiter::for('public-quotes', function (Request $request) {
            return Limit::perMinute(5)
                ->by($request->ip())
                ->response(fn () => response()->json(['error' => 'Too many quote requests.'], 429));
        });
    }
}
