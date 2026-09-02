<?php

namespace App\Http\Requests\Services;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class StoreServiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string'],
            'description' => ['required', 'string'],
            'icon' => ['nullable', 'string'],
            'displayOrder' => ['nullable', 'integer'],
            'isPublic' => ['nullable', 'boolean'],
            'isAddon' => ['nullable', 'boolean'],
            'pricingType' => ['nullable', 'in:flat,per_m2,percent'],
            'price' => ['nullable', 'numeric'],
            'currency' => ['nullable', 'string'],
            'isActive' => ['nullable', 'boolean'],
        ];
    }

    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(
            response()->json(['error' => 'Name and description are required.'], 400)
        );
    }
}
