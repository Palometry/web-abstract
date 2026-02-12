<?php

namespace App\Http\Requests\Services;

use Illuminate\Foundation\Http\FormRequest;

class UpdateServiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string'],
            'description' => ['sometimes', 'string'],
            'icon' => ['sometimes', 'nullable', 'string'],
            'displayOrder' => ['sometimes', 'integer'],
            'isPublic' => ['sometimes', 'boolean'],
            'isAddon' => ['sometimes', 'boolean'],
            'pricingType' => ['sometimes', 'in:flat,per_m2,percent'],
            'price' => ['sometimes', 'numeric'],
            'currency' => ['sometimes', 'string'],
            'isActive' => ['sometimes', 'boolean'],
        ];
    }
}
