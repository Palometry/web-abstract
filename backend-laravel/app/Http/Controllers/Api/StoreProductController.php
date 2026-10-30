<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\PublicAssetUrl;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class StoreProductController extends Controller
{
    public function publicList()
    {
        return response()->json(
            DB::table('store_products')
                ->where('is_active', 1)
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get()
                ->map(fn ($row) => $this->mapProduct($row))
        );
    }

    public function index()
    {
        return response()->json(
            DB::table('store_products')
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get()
                ->map(fn ($row) => $this->mapProduct($row))
        );
    }

    public function show(string $id)
    {
        $product = DB::table('store_products')->where('id', (int) $id)->first();

        if (!$product) {
            return response()->json(['error' => 'Product not found.'], 404);
        }

        return response()->json($this->mapProduct($product));
    }

    public function store(Request $request)
    {
        $data = $this->validateProduct($request);
        $id = DB::table('store_products')->insertGetId($this->toDatabase($data, true));

        return response()->json(['id' => $id], 201);
    }

    public function update(Request $request, string $id)
    {
        $productId = (int) $id;
        if (!DB::table('store_products')->where('id', $productId)->exists()) {
            return response()->json(['error' => 'Product not found.'], 404);
        }

        $data = $this->validateProduct($request, $productId);
        DB::table('store_products')->where('id', $productId)->update($this->toDatabase($data, false));

        return response()->json(['ok' => true]);
    }

    public function destroy(string $id)
    {
        $affected = DB::table('store_products')->where('id', (int) $id)->delete();

        return $affected
            ? response()->noContent()
            : response()->json(['error' => 'Product not found.'], 404);
    }

    private function validateProduct(Request $request, ?int $productId = null): array
    {
        $validator = Validator::make($request->all(), [
            'code' => ['required', 'string', 'max:80', Rule::unique('store_products', 'code')->ignore($productId)],
            'title' => ['required', 'string', 'max:180'],
            'category' => ['required', 'string', 'max:120'],
            'software' => ['nullable', 'string', 'max:150'],
            'priceFrom' => ['required', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'delivery' => ['nullable', 'string', 'max:180'],
            'format' => ['nullable', 'string', 'max:180'],
            'support' => ['nullable', 'string', 'max:180'],
            'idealFor' => ['nullable', 'string'],
            'description' => ['required', 'string'],
            'longDescription' => ['nullable', 'string'],
            'includes' => ['nullable', 'array'],
            'includes.*' => ['string', 'max:250'],
            'extraDetails' => ['nullable', 'array'],
            'extraDetails.*.label' => ['required_with:extraDetails', 'string', 'max:100'],
            'extraDetails.*.value' => ['required_with:extraDetails', 'string', 'max:250'],
            'imageUrl' => ['nullable', 'string', 'max:2048'],
            'accent' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'sortOrder' => ['nullable', 'integer', 'min:0'],
            'isActive' => ['nullable', 'boolean'],
        ]);

        return $validator->validate();
    }

    private function toDatabase(array $data, bool $creating): array
    {
        $now = now();
        $values = [
            'code' => trim($data['code']),
            'title' => trim($data['title']),
            'category' => trim($data['category']),
            'software' => $this->nullableText($data['software'] ?? null),
            'price_from' => (float) $data['priceFrom'],
            'currency' => strtoupper($data['currency'] ?? 'PEN'),
            'delivery' => $this->nullableText($data['delivery'] ?? null),
            'format' => $this->nullableText($data['format'] ?? null),
            'support' => $this->nullableText($data['support'] ?? null),
            'ideal_for' => $this->nullableText($data['idealFor'] ?? null),
            'description' => trim($data['description']),
            'long_description' => $this->nullableText($data['longDescription'] ?? null),
            'includes_json' => json_encode(array_values($data['includes'] ?? [])),
            'extra_details_json' => json_encode(array_values($data['extraDetails'] ?? [])),
            'image_url' => $this->nullableText($data['imageUrl'] ?? null),
            'accent' => $data['accent'] ?? '#9f3232',
            'sort_order' => (int) ($data['sortOrder'] ?? 0),
            'is_active' => ($data['isActive'] ?? true) ? 1 : 0,
            'updated_at' => $now,
        ];

        if ($creating) {
            $values['created_at'] = $now;
        }

        return $values;
    }

    private function mapProduct(object $row): array
    {
        return [
            'id' => (int) $row->id,
            'code' => $row->code,
            'title' => $row->title,
            'category' => $row->category,
            'software' => $row->software ?? '',
            'priceFrom' => (float) $row->price_from,
            'currency' => $row->currency,
            'delivery' => $row->delivery ?? '',
            'format' => $row->format ?? '',
            'support' => $row->support ?? '',
            'idealFor' => $row->ideal_for ?? '',
            'description' => $row->description,
            'longDescription' => $row->long_description ?? '',
            'includes' => $this->decodeList($row->includes_json),
            'extraDetails' => $this->decodeList($row->extra_details_json),
            'imageUrl' => PublicAssetUrl::normalize($row->image_url),
            'accent' => $row->accent ?: '#9f3232',
            'sortOrder' => (int) $row->sort_order,
            'isActive' => (bool) $row->is_active,
        ];
    }

    private function decodeList(?string $json): array
    {
        $decoded = json_decode($json ?: '[]', true);
        return is_array($decoded) ? array_values($decoded) : [];
    }

    private function nullableText(mixed $value): ?string
    {
        $text = trim((string) ($value ?? ''));
        return $text === '' ? null : $text;
    }
}
