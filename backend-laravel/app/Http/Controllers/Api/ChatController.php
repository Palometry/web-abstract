<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ChatController extends Controller
{
    public function send(Request $request)
    {
        $webhook = env('N8N_CHAT_WEBHOOK');
        if (!$webhook) {
            return response()->json(['error' => 'Chat webhook not configured.'], 500);
        }

        $payload = [
            'sessionId' => $request->input('sessionId'),
            'action' => $request->input('action', 'sendMessage'),
            'chatInput' => $request->input('chatInput', '')
        ];

        try {
            $verify = env('N8N_CHAT_VERIFY_SSL', true);
            $response = Http::timeout(10)
                ->acceptJson()
                ->withOptions(['verify' => $verify])
                ->post($webhook, $payload);
        } catch (\Throwable $e) {
            Log::error('Chat webhook request failed', [
                'error' => $e->getMessage()
            ]);
            return response()->json(['error' => 'Chat request failed.'], 502);
        }

        if (!$response->successful()) {
            Log::warning('Chat webhook non-success', [
                'status' => $response->status(),
                'body' => $response->body()
            ]);
            return response()->json(['error' => 'Chat request failed.'], 502);
        }

        return response()->json($response->json() ?? ['output' => $response->body()]);
    }
}
