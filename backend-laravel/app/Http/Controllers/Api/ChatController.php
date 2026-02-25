<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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

        $planRows = DB::select(
            "SELECT id, name, base_price_per_m2, currency, min_days, max_days
             FROM pricing_rates
             WHERE is_active = 1
             ORDER BY effective_from DESC, id DESC"
        );
        $plans = array_map(static function ($row) {
            return [
                'id' => (int) $row->id,
                'name' => $row->name,
                'basePricePerM2' => (float) $row->base_price_per_m2,
                'currency' => $row->currency,
                'minDays' => $row->min_days !== null ? (int) $row->min_days : null,
                'maxDays' => $row->max_days !== null ? (int) $row->max_days : null,
            ];
        }, $planRows);
        $plansText = implode(' | ', array_map(static function ($plan) {
            $range = '';
            if ($plan['minDays'] !== null || $plan['maxDays'] !== null) {
                $range = trim(($plan['minDays'] ?? '?') . '-' . ($plan['maxDays'] ?? '?') . ' días');
            }
            $price = number_format($plan['basePricePerM2'], 2);
            $label = "{$plan['name']}: {$price} {$plan['currency']}/m²";
            return $range ? "{$label} ({$range})" : $label;
        }, $plans));

        $payload = [
            'sessionId' => $request->input('sessionId'),
            'action' => $request->input('action', 'sendMessage'),
            'chatInput' => $request->input('chatInput', ''),
            'plans' => $plans,
            'plansText' => $plansText,
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

        $data = $response->json();
        if (is_string($data)) {
            return response()->json(['output' => $data]);
        }

        if (is_array($data)) {
            $candidate = $data;
            if (array_key_exists(0, $data) && is_array($data[0])) {
                $candidate = $data[0];
            }
            if (is_array($candidate)) {
                $message = $candidate['output'] ?? $candidate['reply'] ?? $candidate['message'] ?? null;
                if (is_string($message) && $message !== '') {
                    return response()->json(['output' => $message]);
                }
            }
        }

        return response()->json($data ?? ['output' => $response->body()]);
    }
}
