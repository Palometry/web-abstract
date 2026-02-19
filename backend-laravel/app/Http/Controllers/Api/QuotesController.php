<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QuotesController extends Controller
{
    private function roundMoney(float $value): float
    {
        return round($value + PHP_FLOAT_EPSILON, 2);
    }

    private function toNumber($value, float $fallback = 0): float
    {
        return is_numeric($value) ? (float) $value : $fallback;
    }

    private function parseDate($value): ?string
    {
        if (!is_string($value)) {
            return null;
        }
        $trimmed = trim($value);
        if ($trimmed === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $trimmed)) {
            return null;
        }
        return $trimmed;
    }

    private function formatDate($value): ?string
    {
        if (!$value) {
            return null;
        }
        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d');
        }
        if (is_string($value)) {
            return substr($value, 0, 10);
        }
        return null;
    }

    private function sanitizeStatus(?string $status): ?string
    {
        if (!$status) {
            return null;
        }
        $allowed = ['new', 'reviewed', 'sent', 'accepted', 'rejected'];
        return in_array($status, $allowed, true) ? $status : null;
    }

    private function computeLineTotal(string $pricingType, float $unitPrice, float $quantity, float $areaM2, float $baseCost): float
    {
        $qty = $quantity > 0 ? $quantity : 1;
        $price = is_finite($unitPrice) ? $unitPrice : 0;
        $total = 0.0;
        if ($pricingType === 'per_m2') {
            $total = $price * $areaM2 * $qty;
        } elseif ($pricingType === 'percent') {
            $total = $baseCost * ($price / 100) * $qty;
        } else {
            $total = $price * $qty;
        }
        return $this->roundMoney($total);
    }

    public function options()
    {
        $rateRows = DB::select(
            "SELECT id, name, base_price_per_m2, currency, is_active, min_days, max_days
             FROM pricing_rates
             ORDER BY is_active DESC, effective_from DESC, id DESC"
        );
        $serviceRows = DB::select(
            "SELECT id, name, pricing_type, price, currency, is_addon, is_active
             FROM services
             ORDER BY display_order ASC, id ASC"
        );

        $pricingRates = array_map(static function ($row) {
            return [
                'id' => $row->id,
                'name' => $row->name,
                'basePricePerM2' => (float) $row->base_price_per_m2,
                'currency' => $row->currency,
                'minDays' => $row->min_days !== null ? (int) $row->min_days : null,
                'maxDays' => $row->max_days !== null ? (int) $row->max_days : null,
                'isActive' => (bool) $row->is_active,
            ];
        }, $rateRows);

        $services = array_map(static function ($row) {
            return [
                'id' => $row->id,
                'name' => $row->name,
                'pricingType' => $row->pricing_type,
                'price' => (float) $row->price,
                'currency' => $row->currency,
                'isAddon' => (bool) $row->is_addon,
                'isActive' => (bool) $row->is_active,
            ];
        }, $serviceRows);

        return response()->json(['pricingRates' => $pricingRates, 'services' => $services]);
    }

    public function index()
    {
        $rows = DB::select(
            "SELECT id, full_name, project_name, area_m2, total_cost, status, currency
             FROM quotes
             ORDER BY created_at DESC"
        );

        $quotes = array_map(static function ($row) {
            return [
                'id' => $row->id,
                'fullName' => $row->full_name,
                'projectName' => $row->project_name,
                'areaM2' => (float) $row->area_m2,
                'totalCost' => (float) $row->total_cost,
                'status' => $row->status,
                'currency' => $row->currency,
            ];
        }, $rows);

        return response()->json($quotes);
    }

    public function show(string $id)
    {
        $quoteId = (int) $id;
        if ($quoteId <= 0) {
            return response()->json(['error' => 'Invalid quote id.'], 400);
        }

        $rows = DB::select(
            "SELECT q.id, q.full_name, q.phone, q.email, q.document_type, q.document_number,
                    q.project_name, q.project_address, q.area_m2, q.area_covered_m2,
                    q.area_uncovered_percent, q.floor_count, q.expires_at,
                    q.base_rate_per_m2, q.base_cost, q.extras_cost, q.total_cost,
                    q.currency, q.status, q.notes, q.created_at,
                    q.plan_name, q.plan_min_days, q.plan_max_days,
                    pr.id AS pricing_rate_id, pr.name AS pricing_rate_name,
                    pr.min_days AS pricing_rate_min_days, pr.max_days AS pricing_rate_max_days
             FROM quotes q
             LEFT JOIN pricing_rates pr ON pr.id = q.pricing_rate_id
             WHERE q.id = ?
             LIMIT 1",
            [$quoteId]
        );
        $quote = !empty($rows) ? $rows[0] : null;
        if (!$quote) {
            return response()->json(['error' => 'Quote not found.'], 404);
        }

        $serviceRows = DB::select(
            "SELECT qs.id, qs.service_id, s.name, s.pricing_type, qs.quantity, qs.unit_price, qs.line_total
             FROM quote_services qs
             INNER JOIN services s ON s.id = qs.service_id
             WHERE qs.quote_id = ?
             ORDER BY qs.id ASC",
            [$quoteId]
        );
        $services = array_map(static function ($row) {
            return [
                'id' => $row->id,
                'serviceId' => $row->service_id,
                'name' => $row->name,
                'pricingType' => $row->pricing_type,
                'quantity' => (float) $row->quantity,
                'unitPrice' => (float) $row->unit_price,
                'lineTotal' => (float) $row->line_total,
            ];
        }, $serviceRows);

        return response()->json([
            'id' => $quote->id,
            'fullName' => $quote->full_name,
            'phone' => $quote->phone,
            'email' => $quote->email,
            'documentType' => $quote->document_type,
            'documentNumber' => $quote->document_number,
            'projectName' => $quote->project_name,
            'projectAddress' => $quote->project_address,
            'areaM2' => (float) $quote->area_m2,
            'areaCoveredM2' => $quote->area_covered_m2 !== null ? (float) $quote->area_covered_m2 : null,
            'areaUncoveredPercent' => $quote->area_uncovered_percent !== null ? (float) $quote->area_uncovered_percent : null,
            'floorCount' => $quote->floor_count !== null ? (float) $quote->floor_count : null,
            'baseRatePerM2' => (float) $quote->base_rate_per_m2,
            'baseCost' => (float) $quote->base_cost,
            'extrasCost' => (float) $quote->extras_cost,
            'totalCost' => (float) $quote->total_cost,
            'currency' => $quote->currency,
            'status' => $quote->status,
            'notes' => $quote->notes,
            'createdAt' => $quote->created_at,
            'expiresAt' => $this->formatDate($quote->expires_at),
            'pricingRateId' => $quote->pricing_rate_id,
            'pricingRateName' => $quote->pricing_rate_name,
            'planName' => $quote->plan_name ?? $quote->pricing_rate_name,
            'planMinDays' => $quote->plan_min_days !== null ? (int) $quote->plan_min_days : ((int) $quote->pricing_rate_min_days ?: null),
            'planMaxDays' => $quote->plan_max_days !== null ? (int) $quote->plan_max_days : ((int) $quote->pricing_rate_max_days ?: null),
            'services' => $services,
        ]);
    }
    public function store(Request $request)
    {
        $fullName = trim((string) $request->input('fullName', ''));
        $phone = trim((string) $request->input('phone', ''));
        $email = trim((string) $request->input('email', ''));
        $projectName = trim((string) $request->input('projectName', ''));
        if ($fullName === '' || $phone === '' || $email === '' || $projectName === '') {
            return response()->json(['error' => 'Missing required fields.'], 400);
        }

        $areaM2 = $this->toNumber($request->input('areaM2'), -1);
        if ($areaM2 <= 0) {
            return response()->json(['error' => 'areaM2 must be greater than 0.'], 400);
        }

        $uncovered = $this->toNumber($request->input('areaUncoveredPercent'), 30);
        $uncovered = ($uncovered >= 0 && $uncovered <= 100) ? $uncovered : 30;
        $coveredM2 = $this->roundMoney($areaM2 * (1 - $uncovered / 100));

        $floorCount = $this->toNumber($request->input('floorCount'), -1);
        $floorCount = $floorCount > 0 ? (float) round($floorCount) : 1;

        $pricingRateId = $request->input('pricingRateId');
        $selectedRateId = is_numeric($pricingRateId) ? (int) $pricingRateId : null;

        $ratePerM2 = $this->toNumber($request->input('baseRatePerM2'), -1);
        $currency = strtoupper((string) $request->input('currency', 'PEN'));
        $planName = trim((string) $request->input('planName', ''));
        $planMinDays = is_numeric($request->input('planMinDays')) ? (int) $request->input('planMinDays') : null;
        $planMaxDays = is_numeric($request->input('planMaxDays')) ? (int) $request->input('planMaxDays') : null;

        if ($selectedRateId) {
            $rateRows = DB::select(
                "SELECT id, name, base_price_per_m2, currency, min_days, max_days
                 FROM pricing_rates
                 WHERE id = ? AND is_active = 1
                 LIMIT 1",
                [$selectedRateId]
            );
            $rate = !empty($rateRows) ? $rateRows[0] : null;
            if (!$rate) {
                return response()->json(['error' => 'Invalid pricing rate.'], 400);
            }
            $ratePerM2 = (float) $rate->base_price_per_m2;
            $currency = $rate->currency;
            $planName = $rate->name;
            $planMinDays = $rate->min_days !== null ? (int) $rate->min_days : null;
            $planMaxDays = $rate->max_days !== null ? (int) $rate->max_days : null;
        }

        if ($ratePerM2 <= 0) {
            return response()->json(['error' => 'baseRatePerM2 must be greater than 0.'], 400);
        }

        $baseCost = $this->roundMoney($coveredM2 * $floorCount * $ratePerM2);
        $status = $this->sanitizeStatus($request->input('status')) ?? 'new';
        $notes = is_string($request->input('notes')) ? trim((string) $request->input('notes')) : null;
        $documentType = is_string($request->input('documentType')) ? trim((string) $request->input('documentType')) : null;
        $documentNumber = is_string($request->input('documentNumber')) ? trim((string) $request->input('documentNumber')) : null;
        $projectAddress = is_string($request->input('projectAddress')) ? trim((string) $request->input('projectAddress')) : null;
        $expiresAt = $this->parseDate($request->input('expiresAt'));

        $serviceInputs = is_array($request->input('services')) ? $request->input('services') : [];
        $serviceIds = [];
        foreach ($serviceInputs as $item) {
            $serviceId = isset($item['serviceId']) && is_numeric($item['serviceId']) ? (int) $item['serviceId'] : null;
            if ($serviceId) {
                $serviceIds[$serviceId] = true;
            }
        }
        $serviceIds = array_keys($serviceIds);

        DB::beginTransaction();
        try {
            $serviceMap = [];
            if (!empty($serviceIds)) {
                $rows = DB::table('services')
                    ->select('id', 'pricing_type', 'price', 'is_active')
                    ->whereIn('id', $serviceIds)
                    ->get();
                foreach ($rows as $row) {
                    $serviceMap[$row->id] = [
                        'pricingType' => $row->pricing_type,
                        'price' => (float) $row->price,
                        'isActive' => (bool) $row->is_active,
                    ];
                }
            }

            $lineItems = [];
            $extrasCost = 0.0;

            foreach ($serviceInputs as $item) {
                $serviceId = isset($item['serviceId']) && is_numeric($item['serviceId']) ? (int) $item['serviceId'] : null;
                if (!$serviceId) {
                    continue;
                }
                $service = $serviceMap[$serviceId] ?? null;
                if (!$service || !$service['isActive']) {
                    DB::rollBack();
                    return response()->json(['error' => 'Invalid service selection.'], 400);
                }
                $quantity = max(1, $this->toNumber($item['quantity'] ?? null, 1));
                $unitPrice = isset($item['unitPrice']) ? $this->toNumber($item['unitPrice'], $service['price']) : $service['price'];
                $lineTotal = $this->computeLineTotal($service['pricingType'], $unitPrice, $quantity, $areaM2, $baseCost);
                $lineItems[] = ['serviceId' => $serviceId, 'quantity' => $quantity, 'unitPrice' => $unitPrice, 'lineTotal' => $lineTotal];
                $extrasCost += $lineTotal;
            }

            $extrasCost = $this->roundMoney($extrasCost);
            $totalCost = $this->roundMoney($baseCost + $extrasCost);

            $quoteId = DB::table('quotes')->insertGetId([
                'pricing_rate_id' => $selectedRateId,
                'full_name' => $fullName,
                'phone' => $phone,
                'email' => $email,
                'document_type' => $documentType ?: null,
                'document_number' => $documentNumber ?: null,
                'project_name' => $projectName,
                'project_address' => $projectAddress ?: null,
                'area_m2' => $areaM2,
                'area_covered_m2' => $coveredM2,
                'area_uncovered_percent' => $uncovered,
                'floor_count' => $floorCount,
                'base_rate_per_m2' => $ratePerM2,
                'base_cost' => $baseCost,
                'extras_cost' => $extrasCost,
                'total_cost' => $totalCost,
                'currency' => $currency,
                'status' => $status,
                'notes' => $notes ?: null,
                'expires_at' => $expiresAt,
                'plan_name' => $planName ?: null,
                'plan_min_days' => $planMinDays,
                'plan_max_days' => $planMaxDays,
            ]);

            foreach ($lineItems as $line) {
                DB::table('quote_services')->insert([
                    'quote_id' => $quoteId,
                    'service_id' => $line['serviceId'],
                    'quantity' => $line['quantity'],
                    'unit_price' => $line['unitPrice'],
                    'line_total' => $line['lineTotal'],
                ]);
            }

            DB::commit();
            return response()->json(['id' => $quoteId], 201);
        } catch (\Throwable) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to create quote.'], 500);
        }
    }

    public function storeLead(Request $request)
    {
        $fullName = trim((string) $request->input('fullName', ''));
        $phone = trim((string) $request->input('phone', ''));
        $email = trim((string) $request->input('email', ''));
        $projectName = trim((string) $request->input('projectName', ''));

        if ($fullName === '' || $phone === '' || $email === '' || $projectName === '') {
            return response()->json(['error' => 'Missing required fields.'], 400);
        }

        $areaM2 = $this->toNumber($request->input('areaM2'), 0);
        $areaM2 = $areaM2 < 0 ? 0 : $areaM2;

        $documentType = is_string($request->input('documentType')) ? trim((string) $request->input('documentType')) : null;
        $documentNumber = is_string($request->input('documentNumber')) ? trim((string) $request->input('documentNumber')) : null;
        $projectAddress = is_string($request->input('projectAddress')) ? trim((string) $request->input('projectAddress')) : null;
        $notes = is_string($request->input('notes')) ? trim((string) $request->input('notes')) : null;
        $notes = $notes ? "Lead chatbot: {$notes}" : 'Lead chatbot';

        try {
            $quoteId = DB::table('quotes')->insertGetId([
                'pricing_rate_id' => null,
                'full_name' => $fullName,
                'phone' => $phone,
                'email' => $email,
                'document_type' => $documentType ?: null,
                'document_number' => $documentNumber ?: null,
                'project_name' => $projectName,
                'project_address' => $projectAddress ?: null,
                'area_m2' => $areaM2,
                'area_covered_m2' => null,
                'area_uncovered_percent' => null,
                'floor_count' => null,
                'base_rate_per_m2' => 0,
                'base_cost' => 0,
                'extras_cost' => 0,
                'total_cost' => 0,
                'currency' => strtoupper((string) $request->input('currency', 'PEN')),
                'status' => 'new',
                'notes' => $notes,
                'expires_at' => null,
                'plan_name' => null,
                'plan_min_days' => null,
                'plan_max_days' => null,
            ]);

            return response()->json(['id' => $quoteId], 201);
        } catch (\Throwable) {
            return response()->json(['error' => 'Failed to create quote lead.'], 500);
        }
    }
    public function update(Request $request, string $id)
    {
        $quoteId = (int) $id;
        if ($quoteId <= 0) {
            return response()->json(['error' => 'Invalid quote id.'], 400);
        }

        $updates = [];

        if ($request->has('fullName')) {
            $value = trim((string) $request->input('fullName'));
            if ($value === '') {
                return response()->json(['error' => 'fullName cannot be empty.'], 400);
            }
            $updates['full_name'] = $value;
        }
        if ($request->has('phone')) {
            $value = trim((string) $request->input('phone'));
            if ($value === '') {
                return response()->json(['error' => 'phone cannot be empty.'], 400);
            }
            $updates['phone'] = $value;
        }
        if ($request->has('email')) {
            $value = trim((string) $request->input('email'));
            if ($value === '') {
                return response()->json(['error' => 'email cannot be empty.'], 400);
            }
            $updates['email'] = $value;
        }
        if ($request->has('projectName')) {
            $value = trim((string) $request->input('projectName'));
            if ($value === '') {
                return response()->json(['error' => 'projectName cannot be empty.'], 400);
            }
            $updates['project_name'] = $value;
        }
        if ($request->has('projectAddress')) {
            $updates['project_address'] = trim((string) $request->input('projectAddress')) ?: null;
        }
        if ($request->has('documentType')) {
            $updates['document_type'] = trim((string) $request->input('documentType')) ?: null;
        }
        if ($request->has('documentNumber')) {
            $updates['document_number'] = trim((string) $request->input('documentNumber')) ?: null;
        }
        if ($request->has('status')) {
            $status = $this->sanitizeStatus($request->input('status'));
            if (!$status) {
                return response()->json(['error' => 'Invalid status.'], 400);
            }
            $updates['status'] = $status;
        }
        if ($request->has('notes')) {
            $notes = is_string($request->input('notes')) ? trim((string) $request->input('notes')) : null;
            $updates['notes'] = $notes ?: null;
        }
        if ($request->has('expiresAt')) {
            $updates['expires_at'] = $this->parseDate($request->input('expiresAt'));
        }

        $parsedUncovered = $request->has('areaUncoveredPercent')
            ? $this->toNumber($request->input('areaUncoveredPercent'), -1)
            : null;
        if ($parsedUncovered !== null) {
            if ($parsedUncovered < 0 || $parsedUncovered > 100) {
                return response()->json(['error' => 'areaUncoveredPercent must be between 0 and 100.'], 400);
            }
            $updates['area_uncovered_percent'] = $parsedUncovered;
        }

        $parsedCovered = $request->has('areaCoveredM2')
            ? $this->toNumber($request->input('areaCoveredM2'), -1)
            : null;
        if ($parsedCovered !== null) {
            if ($parsedCovered < 0) {
                return response()->json(['error' => 'areaCoveredM2 must be 0 or greater.'], 400);
            }
            $updates['area_covered_m2'] = $parsedCovered;
        }

        $parsedFloors = $request->has('floorCount')
            ? $this->toNumber($request->input('floorCount'), -1)
            : null;
        if ($parsedFloors !== null) {
            if ($parsedFloors < 1) {
                return response()->json(['error' => 'floorCount must be 1 or greater.'], 400);
            }
            $updates['floor_count'] = (int) round($parsedFloors);
        }

        $recalcTotals = false;
        $parsedArea = $request->has('areaM2') ? $this->toNumber($request->input('areaM2'), -1) : null;
        if ($parsedArea !== null) {
            if ($parsedArea <= 0) {
                return response()->json(['error' => 'areaM2 must be greater than 0.'], 400);
            }
            $recalcTotals = true;
        }
        $parsedRate = $request->has('baseRatePerM2') ? $this->toNumber($request->input('baseRatePerM2'), -1) : null;
        if ($parsedRate !== null) {
            if ($parsedRate <= 0) {
                return response()->json(['error' => 'baseRatePerM2 must be greater than 0.'], 400);
            }
            $recalcTotals = true;
        }
        if ($parsedUncovered !== null || $parsedCovered !== null || $parsedFloors !== null) {
            $recalcTotals = true;
        }

        if (empty($updates) && !$recalcTotals && !$request->has('pricingRateId') && !$request->has('currency') && !$request->has('planName') && !$request->has('planMinDays') && !$request->has('planMaxDays')) {
            return response()->json(['error' => 'No fields to update.'], 400);
        }

        DB::beginTransaction();
        try {
            $quoteRows = DB::select(
                "SELECT id, area_m2, area_covered_m2, area_uncovered_percent, floor_count,
                        base_rate_per_m2, base_cost, pricing_rate_id
                 FROM quotes
                 WHERE id = ?
                 LIMIT 1",
                [$quoteId]
            );
            $quote = !empty($quoteRows) ? $quoteRows[0] : null;
            if (!$quote) {
                DB::rollBack();
                return response()->json(['error' => 'Quote not found.'], 404);
            }

            $existingArea = (float) $quote->area_m2;
            $existingUncovered = $quote->area_uncovered_percent !== null ? (float) $quote->area_uncovered_percent : 30;
            $existingCovered = $quote->area_covered_m2 !== null
                ? (float) $quote->area_covered_m2
                : $this->roundMoney($existingArea * (1 - $existingUncovered / 100));
            $existingFloors = $quote->floor_count !== null ? (int) $quote->floor_count : 1;

            $finalArea = $parsedArea ?? $existingArea;
            $finalRate = $parsedRate ?? (float) $quote->base_rate_per_m2;
            $finalUncovered = $parsedUncovered ?? $existingUncovered ?? 30;
            $finalCovered = $parsedCovered ?? $this->roundMoney($finalArea * (1 - $finalUncovered / 100));
            $finalFloors = $parsedFloors !== null ? max(1, (int) round($parsedFloors)) : $existingFloors;
            $baseCost = (float) $quote->base_cost;
            $finalCurrency = $request->has('currency') ? strtoupper((string) $request->input('currency')) : null;
            $canApplyPlanFields = !$request->has('pricingRateId') || $request->input('pricingRateId') === null;

            if ($request->has('pricingRateId')) {
                $pricingRateId = $request->input('pricingRateId');
                if ($pricingRateId === null) {
                    $updates['pricing_rate_id'] = null;
                } elseif (is_numeric($pricingRateId)) {
                    $rateRows = DB::select(
                        "SELECT id, name, base_price_per_m2, currency, min_days, max_days
                         FROM pricing_rates
                         WHERE id = ? AND is_active = 1
                         LIMIT 1",
                        [(int) $pricingRateId]
                    );
                    $rate = !empty($rateRows) ? $rateRows[0] : null;
                    if (!$rate) {
                        DB::rollBack();
                        return response()->json(['error' => 'Invalid pricing rate.'], 400);
                    }
                    $updates['pricing_rate_id'] = $rate->id;
                    $finalRate = (float) $rate->base_price_per_m2;
                    $finalCurrency = $rate->currency;
                    $updates['plan_name'] = $rate->name;
                    $updates['plan_min_days'] = $rate->min_days !== null ? (int) $rate->min_days : null;
                    $updates['plan_max_days'] = $rate->max_days !== null ? (int) $rate->max_days : null;
                    $recalcTotals = true;
                } else {
                    DB::rollBack();
                    return response()->json(['error' => 'Invalid pricing rate.'], 400);
                }
            }

            if ($canApplyPlanFields) {
                if ($request->has('planName')) {
                    $updates['plan_name'] = trim((string) $request->input('planName')) ?: null;
                }
                if ($request->has('planMinDays')) {
                    $updates['plan_min_days'] = is_numeric($request->input('planMinDays')) ? (int) $request->input('planMinDays') : null;
                }
                if ($request->has('planMaxDays')) {
                    $updates['plan_max_days'] = is_numeric($request->input('planMaxDays')) ? (int) $request->input('planMaxDays') : null;
                }
            }

            if ($recalcTotals) {
                $baseCost = $this->roundMoney($finalCovered * $finalFloors * $finalRate);
                $updates['area_m2'] = $finalArea;
                $updates['base_rate_per_m2'] = $finalRate;
                $updates['base_cost'] = $baseCost;
            }

            if ($finalCurrency) {
                $updates['currency'] = $finalCurrency;
            }

            if ($parsedArea !== null || $parsedUncovered !== null || $parsedCovered !== null) {
                $updates['area_covered_m2'] = $finalCovered;
                if ($parsedUncovered === null && $quote->area_uncovered_percent === null) {
                    $updates['area_uncovered_percent'] = $finalUncovered;
                }
            }

            if (!empty($updates)) {
                DB::table('quotes')->where('id', $quoteId)->update($updates);
            }

            if ($recalcTotals) {
                $lineRows = DB::select(
                    "SELECT qs.id, qs.quantity, qs.unit_price, s.pricing_type
                     FROM quote_services qs
                     INNER JOIN services s ON s.id = qs.service_id
                     WHERE qs.quote_id = ?",
                    [$quoteId]
                );
                $extrasCost = 0.0;
                foreach ($lineRows as $row) {
                    $lineTotal = $this->computeLineTotal(
                        $row->pricing_type,
                        (float) $row->unit_price,
                        (float) $row->quantity,
                        $finalArea,
                        $baseCost
                    );
                    $extrasCost += $lineTotal;
                    DB::table('quote_services')->where('id', $row->id)->update(['line_total' => $lineTotal]);
                }
                $extrasCost = $this->roundMoney($extrasCost);
                $totalCost = $this->roundMoney($baseCost + $extrasCost);
                DB::table('quotes')->where('id', $quoteId)->update([
                    'extras_cost' => $extrasCost,
                    'total_cost' => $totalCost,
                ]);
            }

            DB::commit();
            return response()->json(['ok' => true]);
        } catch (\Throwable) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to update quote.'], 500);
        }
    }
    public function storeService(Request $request, string $id)
    {
        $quoteId = (int) $id;
        if ($quoteId <= 0) {
            return response()->json(['error' => 'Invalid quote id.'], 400);
        }

        $serviceId = $request->input('serviceId');
        $parsedServiceId = is_numeric($serviceId) ? (int) $serviceId : null;
        if (!$parsedServiceId) {
            return response()->json(['error' => 'serviceId is required.'], 400);
        }

        DB::beginTransaction();
        try {
            $quoteRows = DB::select(
                "SELECT id, area_m2, base_cost
                 FROM quotes
                 WHERE id = ?
                 LIMIT 1",
                [$quoteId]
            );
            $quote = !empty($quoteRows) ? $quoteRows[0] : null;
            if (!$quote) {
                DB::rollBack();
                return response()->json(['error' => 'Quote not found.'], 404);
            }

            $serviceRows = DB::select(
                "SELECT id, pricing_type, price, is_active
                 FROM services
                 WHERE id = ?
                 LIMIT 1",
                [$parsedServiceId]
            );
            $service = !empty($serviceRows) ? $serviceRows[0] : null;
            if (!$service || !$service->is_active) {
                DB::rollBack();
                return response()->json(['error' => 'Invalid service selection.'], 400);
            }

            $quantity = max(1, $this->toNumber($request->input('quantity'), 1));
            $unitPrice = $request->has('unitPrice')
                ? $this->toNumber($request->input('unitPrice'), (float) $service->price)
                : (float) $service->price;
            $lineTotal = $this->computeLineTotal($service->pricing_type, $unitPrice, $quantity, (float) $quote->area_m2, (float) $quote->base_cost);

            $quoteServiceId = DB::table('quote_services')->insertGetId([
                'quote_id' => $quoteId,
                'service_id' => $parsedServiceId,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'line_total' => $lineTotal,
            ]);

            $sumRows = DB::select(
                "SELECT COALESCE(SUM(line_total), 0) AS extras_cost
                 FROM quote_services
                 WHERE quote_id = ?",
                [$quoteId]
            );
            $extrasCost = !empty($sumRows) ? (float) $sumRows[0]->extras_cost : 0;
            $totalCost = $this->roundMoney((float) $quote->base_cost + $extrasCost);
            DB::table('quotes')->where('id', $quoteId)->update([
                'extras_cost' => $extrasCost,
                'total_cost' => $totalCost,
            ]);

            DB::commit();
            return response()->json(['id' => $quoteServiceId], 201);
        } catch (\Throwable) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to add service.'], 500);
        }
    }

    public function updateService(Request $request, string $id, string $serviceId)
    {
        $quoteId = (int) $id;
        $quoteServiceId = (int) $serviceId;
        if ($quoteId <= 0 || $quoteServiceId <= 0) {
            return response()->json(['error' => 'Invalid ids.'], 400);
        }

        if (!$request->has('quantity') && !$request->has('unitPrice')) {
            return response()->json(['error' => 'No fields to update.'], 400);
        }

        DB::beginTransaction();
        try {
            $quoteRows = DB::select(
                "SELECT id, area_m2, base_cost
                 FROM quotes
                 WHERE id = ?
                 LIMIT 1",
                [$quoteId]
            );
            $quote = !empty($quoteRows) ? $quoteRows[0] : null;
            if (!$quote) {
                DB::rollBack();
                return response()->json(['error' => 'Quote not found.'], 404);
            }

            $lineRows = DB::select(
                "SELECT qs.id, qs.quantity, qs.unit_price, s.pricing_type
                 FROM quote_services qs
                 INNER JOIN services s ON s.id = qs.service_id
                 WHERE qs.id = ? AND qs.quote_id = ?
                 LIMIT 1",
                [$quoteServiceId, $quoteId]
            );
            $line = !empty($lineRows) ? $lineRows[0] : null;
            if (!$line) {
                DB::rollBack();
                return response()->json(['error' => 'Quote service not found.'], 404);
            }

            $quantity = $request->has('quantity') ? max(1, $this->toNumber($request->input('quantity'), 1)) : (float) $line->quantity;
            $unitPrice = $request->has('unitPrice') ? $this->toNumber($request->input('unitPrice'), (float) $line->unit_price) : (float) $line->unit_price;

            $lineTotal = $this->computeLineTotal($line->pricing_type, $unitPrice, $quantity, (float) $quote->area_m2, (float) $quote->base_cost);

            DB::table('quote_services')->where('id', $quoteServiceId)->update([
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'line_total' => $lineTotal,
            ]);

            $sumRows = DB::select(
                "SELECT COALESCE(SUM(line_total), 0) AS extras_cost
                 FROM quote_services
                 WHERE quote_id = ?",
                [$quoteId]
            );
            $extrasCost = !empty($sumRows) ? (float) $sumRows[0]->extras_cost : 0;
            $totalCost = $this->roundMoney((float) $quote->base_cost + $extrasCost);
            DB::table('quotes')->where('id', $quoteId)->update([
                'extras_cost' => $extrasCost,
                'total_cost' => $totalCost,
            ]);

            DB::commit();
            return response()->json(['ok' => true]);
        } catch (\Throwable) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to update service.'], 500);
        }
    }

    public function destroyService(string $id, string $serviceId)
    {
        $quoteId = (int) $id;
        $quoteServiceId = (int) $serviceId;
        if ($quoteId <= 0 || $quoteServiceId <= 0) {
            return response()->json(['error' => 'Invalid ids.'], 400);
        }

        DB::beginTransaction();
        try {
            $quoteRows = DB::select(
                "SELECT id, base_cost
                 FROM quotes
                 WHERE id = ?
                 LIMIT 1",
                [$quoteId]
            );
            $quote = !empty($quoteRows) ? $quoteRows[0] : null;
            if (!$quote) {
                DB::rollBack();
                return response()->json(['error' => 'Quote not found.'], 404);
            }

            $affected = DB::table('quote_services')
                ->where('id', $quoteServiceId)
                ->where('quote_id', $quoteId)
                ->delete();
            if ($affected === 0) {
                DB::rollBack();
                return response()->json(['error' => 'Quote service not found.'], 404);
            }

            $sumRows = DB::select(
                "SELECT COALESCE(SUM(line_total), 0) AS extras_cost
                 FROM quote_services
                 WHERE quote_id = ?",
                [$quoteId]
            );
            $extrasCost = !empty($sumRows) ? (float) $sumRows[0]->extras_cost : 0;
            $totalCost = $this->roundMoney((float) $quote->base_cost + $extrasCost);
            DB::table('quotes')->where('id', $quoteId)->update([
                'extras_cost' => $extrasCost,
                'total_cost' => $totalCost,
            ]);

            DB::commit();
            return response()->noContent();
        } catch (\Throwable) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to delete service.'], 500);
        }
    }
}
