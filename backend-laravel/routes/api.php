<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\PagesController;
use App\Http\Controllers\Api\PortfolioController;
use App\Http\Controllers\Api\ProjectsController;
use App\Http\Controllers\Api\QuotesController;
use App\Http\Controllers\Api\ServiceController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\MediaController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\BlogController;

Route::get('/health', fn () => response()->json(['ok' => true]));

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::get('/me', [AuthController::class, 'me'])->middleware('auth.jwt');
});

Route::get('/dashboard/public', [DashboardController::class, 'public']);
Route::get('/dashboard', [DashboardController::class, 'admin'])
    ->middleware(['auth.jwt', 'role:admin,editor']);

Route::get('/pages/public/home', [PagesController::class, 'publicHome']);
Route::get('/pages/public/{slug}', [PagesController::class, 'publicBySlug']);
Route::get('/portfolio/public', [PortfolioController::class, 'publicList']);
Route::get('/portfolio/public/{id}', [PortfolioController::class, 'publicDetail']);
Route::get('/blog/public', [BlogController::class, 'publicList']);
Route::get('/blog/public/{slug}', [BlogController::class, 'publicDetail']);
Route::get('/services/public', [ServiceController::class, 'publicList']);
Route::get('/projects/public', [ProjectsController::class, 'publicList']);
Route::get('/projects/public/{id}', [ProjectsController::class, 'publicDetail']);
Route::post('/chat', [ChatController::class, 'send']);
Route::post('/quotes/lead', [QuotesController::class, 'storeLead']);

Route::middleware(['auth.jwt', 'role:admin,editor'])->group(function () {
    Route::get('/pages', [PagesController::class, 'index']);
    Route::post('/pages', [PagesController::class, 'store']);
    Route::get('/pages/{id}', [PagesController::class, 'show']);
    Route::patch('/pages/{id}', [PagesController::class, 'update']);
    Route::delete('/pages/{id}', [PagesController::class, 'destroy']);

    Route::get('/pages/{id}/sections', [PagesController::class, 'listSections']);
    Route::post('/pages/{id}/sections', [PagesController::class, 'storeSection']);
    Route::patch('/pages/sections/{id}', [PagesController::class, 'updateSection']);
    Route::delete('/pages/sections/{id}', [PagesController::class, 'destroySection']);

    Route::get('/pages/sections/{id}/blocks', [PagesController::class, 'listBlocks']);
    Route::post('/pages/sections/{id}/blocks', [PagesController::class, 'storeBlock']);
    Route::patch('/pages/blocks/{id}', [PagesController::class, 'updateBlock']);
    Route::delete('/pages/blocks/{id}', [PagesController::class, 'destroyBlock']);

    Route::get('/services', [ServiceController::class, 'index']);
    Route::post('/services', [ServiceController::class, 'store']);
    Route::get('/services/{id}', [ServiceController::class, 'show']);
    Route::patch('/services/{id}', [ServiceController::class, 'update']);
    Route::delete('/services/{id}', [ServiceController::class, 'destroy']);

    Route::get('/projects', [ProjectsController::class, 'index']);
    Route::get('/projects/catalog', [ProjectsController::class, 'catalog']);
    Route::post('/projects', [ProjectsController::class, 'store']);
    Route::get('/projects/{id}', [ProjectsController::class, 'show']);
    Route::patch('/projects/{id}', [ProjectsController::class, 'update']);
    Route::delete('/projects/{id}', [ProjectsController::class, 'destroy']);

    Route::put('/projects/{id}/portfolio', [ProjectsController::class, 'upsertPortfolio']);
    Route::delete('/projects/{id}/portfolio', [ProjectsController::class, 'deletePortfolio']);

    Route::get('/projects/{id}/images', [ProjectsController::class, 'listImages']);
    Route::post('/projects/{id}/images', [ProjectsController::class, 'storeImage']);
    Route::patch('/projects/{id}/images/{imageId}', [ProjectsController::class, 'updateImage']);
    Route::delete('/projects/{id}/images/{imageId}', [ProjectsController::class, 'destroyImage']);

    Route::get('/portfolio', [PortfolioController::class, 'adminList']);
    Route::post('/portfolio', [PortfolioController::class, 'store']);
    Route::get('/portfolio/{id}', [PortfolioController::class, 'adminDetail']);
    Route::put('/portfolio/{id}', [PortfolioController::class, 'update']);
    Route::delete('/portfolio/{id}', [PortfolioController::class, 'destroy']);

    Route::get('/blog', [BlogController::class, 'index']);
    Route::post('/blog', [BlogController::class, 'store']);
    Route::get('/blog/{id}', [BlogController::class, 'show']);
    Route::patch('/blog/{id}', [BlogController::class, 'update']);
    Route::delete('/blog/{id}', [BlogController::class, 'destroy']);

    Route::get('/quotes/options', [QuotesController::class, 'options']);
    Route::get('/quotes', [QuotesController::class, 'index']);
    Route::post('/quotes', [QuotesController::class, 'store']);
    Route::get('/quotes/{id}', [QuotesController::class, 'show']);
    Route::patch('/quotes/{id}', [QuotesController::class, 'update']);
    Route::post('/quotes/{id}/services', [QuotesController::class, 'storeService']);
    Route::patch('/quotes/{id}/services/{serviceId}', [QuotesController::class, 'updateService']);
    Route::delete('/quotes/{id}/services/{serviceId}', [QuotesController::class, 'destroyService']);

    Route::post('/media', [MediaController::class, 'store']);
});

Route::middleware(['auth.jwt', 'role:admin,editor_user_manager'])->group(function () {
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
    Route::patch('/users/{id}/status', [UserController::class, 'setStatus']);
});
