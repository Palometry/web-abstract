<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MediaController extends Controller
{
    private function tryConvertToWebp(string $buffer): ?string
    {
        if (!function_exists('imagecreatefromstring') || !function_exists('imagewebp')) {
            return null;
        }
        $image = @imagecreatefromstring($buffer);
        if (!$image) {
            return null;
        }
        ob_start();
        imagewebp($image, null, 82);
        imagedestroy($image);
        $webp = ob_get_clean();
        return $webp !== false ? $webp : null;
    }

    private function parseData(string $data): array
    {
        if (str_starts_with($data, 'data:')) {
            if (preg_match('/^data:(.+);base64,(.+)$/', $data, $matches)) {
                return [
                    'mime' => $matches[1],
                    'buffer' => base64_decode($matches[2]),
                ];
            }
        }
        return [
            'mime' => null,
            'buffer' => base64_decode($data),
        ];
    }

    private function safeBaseName(string $name): string
    {
        $base = preg_replace('/[^a-zA-Z0-9_-]/', '', $name);
        $base = strtolower($base ?? '');
        return $base !== '' ? $base : 'media';
    }

    public function store(Request $request)
    {
        $filename = $request->input('filename');
        $data = $request->input('data');
        if (!$filename || !$data) {
            return response()->json(['error' => 'Archivo o nombre invalido.'], 400);
        }

        $parsed = $this->parseData((string) $data);
        $buffer = $parsed['buffer'] ?? '';
        if (!$buffer) {
            return response()->json(['error' => 'Archivo vacio.'], 400);
        }

        $ext = pathinfo($filename, PATHINFO_EXTENSION);
        $base = $this->safeBaseName(pathinfo($filename, PATHINFO_FILENAME));
        $unique = Str::random(12);
        $mime = $request->input('mimeType') ?? $parsed['mime'];

        $convertedBuffer = null;
        $useWebp = false;
        if (is_string($mime) && str_starts_with($mime, 'image/')) {
            $convertedBuffer = $this->tryConvertToWebp($buffer);
            if ($convertedBuffer) {
                $useWebp = true;
            }
        }

        $finalBuffer = $useWebp ? $convertedBuffer : $buffer;
        $finalExt = $useWebp ? 'webp' : ($ext ?: 'bin');
        $finalMime = $useWebp ? 'image/webp' : $mime;

        $safeName = $base . '-' . time() . '-' . $unique . '.' . $finalExt;

        $relativePath = 'uploads/portfolio/' . $safeName;
        $fullPath = public_path($relativePath);
        if (!is_dir(dirname($fullPath))) {
            mkdir(dirname($fullPath), 0775, true);
        }
        file_put_contents($fullPath, $finalBuffer);

        $fileUrl = $request->getSchemeAndHttpHost() . '/' . $relativePath;

        $id = DB::table('media_assets')->insertGetId([
            'file_url' => $fileUrl,
            'file_path' => $fullPath,
            'mime_type' => $finalMime,
            'file_size' => strlen($finalBuffer),
            'title' => $request->input('title'),
            'alt_text' => $request->input('altText'),
        ]);

        return response()->json(['id' => $id, 'fileUrl' => $fileUrl], 201);
    }
}
