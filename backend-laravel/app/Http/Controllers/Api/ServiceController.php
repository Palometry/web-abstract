<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Services\StoreServiceRequest;
use App\Http\Requests\Services\UpdateServiceRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    public function publicList()
    {
        $rows = DB::table('services')
            ->select(
                'id',
                'name',
                'description',
                'icon',
                'display_order'
            )
            ->where('is_public', 1)
            ->where('is_active', 1)
            ->orderBy('display_order')
            ->orderBy('id')
            ->get();

        $services = $rows->map(fn ($row) => [
            'id' => $row->id,
            'title' => $row->name,
            'description' => $row->description,
            'icon' => $row->icon,
            'displayOrder' => (int) $row->display_order,
        ]);

        return response()->json($services);
    }

    public function index()
    {
        $rows = DB::table('services')
            ->select(
                'id',
                'name',
                'description',
                'is_public',
                'is_active'
            )
            ->orderBy('display_order')
            ->orderBy('id')
            ->get();

        $services = $rows->map(fn ($row) => [
            'id' => $row->id,
            'name' => $row->name,
            'description' => $row->description,
            'public' => (bool) $row->is_public,
            'isActive' => (bool) $row->is_active,
        ]);

        return response()->json($services);
    }

    public function show(string $id)
    {
        $serviceId = (int) $id;
        if ($serviceId <= 0) {
            return response()->json(['error' => 'Invalid service id.'], 400);
        }

        $row = DB::table('services')
            ->select(
                'id',
                'name',
                'description',
                'icon',
                'display_order',
                'is_public',
                'is_addon',
                'pricing_type',
                'price',
                'currency',
                'is_active'
            )
            ->where('id', $serviceId)
            ->first();

        if (!$row) {
            return response()->json(['error' => 'Service not found.'], 404);
        }

        return response()->json([
            'id' => $row->id,
            'name' => $row->name,
            'description' => $row->description,
            'icon' => $row->icon,
            'displayOrder' => (int) $row->display_order,
            'public' => (bool) $row->is_public,
            'isAddon' => (bool) $row->is_addon,
            'pricingType' => $row->pricing_type,
            'price' => (float) $row->price,
            'currency' => $row->currency,
            'isActive' => (bool) $row->is_active,
        ]);
    }

    public function store(StoreServiceRequest $request)
    {
        $data = $request->validated();

        $pricingType = $data['pricingType'] ?? 'flat';
        $price = isset($data['price']) ? (float) $data['price'] : 0;
        if ($price < 0) {
            return response()->json(['error' => 'Price must be 0 or greater.'], 400);
        }

        $id = DB::table('services')->insertGetId([
            'name' => trim($data['name']),
            'description' => trim($data['description']),
            'icon' => $data['icon'] ?? null,
            'display_order' => isset($data['displayOrder']) ? (int) $data['displayOrder'] : 0,
            'is_public' => array_key_exists('isPublic', $data) && $data['isPublic'] === false ? 0 : 1,
            'is_addon' => !empty($data['isAddon']) ? 1 : 0,
            'pricing_type' => $pricingType,
            'price' => $price,
            'currency' => strtoupper($data['currency'] ?? 'PEN'),
            'is_active' => array_key_exists('isActive', $data) && $data['isActive'] === false ? 0 : 1,
        ]);

        return response()->json(['id' => $id], 201);
    }

    public function update(UpdateServiceRequest $request, string $id)
    {
        $serviceId = (int) $id;
        if ($serviceId <= 0) {
            return response()->json(['error' => 'Invalid service id.'], 400);
        }

        $data = $request->validated();
        if (empty($data)) {
            return response()->json(['error' => 'No fields to update.'], 400);
        }

        $updates = [];
        if (array_key_exists('name', $data)) {
            $name = trim((string) $data['name']);
            if ($name === '') {
                return response()->json(['error' => 'Name cannot be empty.'], 400);
            }
            $updates['name'] = $name;
        }
        if (array_key_exists('description', $data)) {
            $description = trim((string) $data['description']);
            if ($description === '') {
                return response()->json(['error' => 'Description cannot be empty.'], 400);
            }
            $updates['description'] = $description;
        }
        if (array_key_exists('icon', $data)) {
            $updates['icon'] = $data['icon'];
        }
        if (array_key_exists('displayOrder', $data)) {
            $updates['display_order'] = (int) $data['displayOrder'];
        }
        if (array_key_exists('isPublic', $data)) {
            $updates['is_public'] = $data['isPublic'] ? 1 : 0;
        }
        if (array_key_exists('isAddon', $data)) {
            $updates['is_addon'] = $data['isAddon'] ? 1 : 0;
        }
        if (array_key_exists('pricingType', $data)) {
            $updates['pricing_type'] = $data['pricingType'];
        }
        if (array_key_exists('price', $data)) {
            $price = (float) $data['price'];
            if ($price < 0) {
                return response()->json(['error' => 'Invalid price.'], 400);
            }
            $updates['price'] = $price;
        }
        if (array_key_exists('currency', $data)) {
            $updates['currency'] = strtoupper((string) $data['currency']);
        }
        if (array_key_exists('isActive', $data)) {
            $updates['is_active'] = $data['isActive'] ? 1 : 0;
        }

        if (empty($updates)) {
            return response()->json(['error' => 'No fields to update.'], 400);
        }

        $affected = DB::table('services')->where('id', $serviceId)->update($updates);
        if ($affected === 0) {
            return response()->json(['error' => 'Service not found.'], 404);
        }

        return response()->json(['ok' => true]);
    }

    public function destroy(string $id)
    {
        $serviceId = (int) $id;
        if ($serviceId <= 0) {
            return response()->json(['error' => 'Invalid service id.'], 400);
        }

        $affected = DB::table('services')
            ->where('id', $serviceId)
            ->update(['is_active' => 0, 'is_public' => 0]);

        if ($affected === 0) {
            return response()->json(['error' => 'Service not found.'], 404);
        }

        return response()->noContent();
    }
}
