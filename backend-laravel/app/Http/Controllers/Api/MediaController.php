<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class MediaController extends Controller
{
    private function requestOrigin(): string
    {
        $scheme = $requestScheme = request()->headers->get('x-forwarded-proto')
            ?: request()->headers->get('x-forwarded-scheme')
            ?: request()->getScheme();

        return strtolower((string) $requestScheme) . '://' . request()->getHttpHost();
    }

    private function allowedMimeTypes(): array
    {
        return config('media.allowed_mime_types', []);
    }

    private function maxUploadKb(): int
    {
        return max(1, (int) config('media.max_upload_kb', 51200));
    }

    private function extensionForMime(string $mime): ?string
    {
        $map = config('media.mime_extensions', []);

        return is_array($map) ? ($map[$mime] ?? null) : null;
    }

    private function detectMime(string $buffer): ?string
    {
        if ($buffer === '') {
            return null;
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->buffer($buffer);

        return is_string($mime) && $mime !== '' ? $mime : null;
    }

    private function validateBuffer(string $buffer, ?string $requestedMime = null): array
    {
        if ($buffer === '') {
            throw ValidationException::withMessages([
                'file' => ['Archivo vacio.'],
            ]);
        }

        $maxBytes = $this->maxUploadKb() * 1024;
        if (strlen($buffer) > $maxBytes) {
            throw ValidationException::withMessages([
                'file' => ['El archivo excede el tamano maximo permitido.'],
            ]);
        }

        $mime = $this->detectMime($buffer) ?? $requestedMime;
        if (!is_string($mime) || !in_array($mime, $this->allowedMimeTypes(), true)) {
            throw ValidationException::withMessages([
                'file' => ['Tipo de archivo no permitido.'],
            ]);
        }

        $extension = $this->extensionForMime($mime);
        if (!$extension) {
            throw ValidationException::withMessages([
                'file' => ['No se pudo determinar una extension segura para el archivo.'],
            ]);
        }

        return [
            'mime' => $mime,
            'extension' => $extension,
        ];
    }

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
            if (preg_match('/^data:([^;,]+);base64,([A-Za-z0-9+\/=]+)$/', $data, $matches)) {
                $decoded = base64_decode($matches[2], true);
                return [
                    'mime' => $matches[1],
                    'buffer' => $decoded === false ? null : $decoded,
                ];
            }
        }

        $decoded = base64_decode($data, true);

        return [
            'mime' => null,
            'buffer' => $decoded === false ? null : $decoded,
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
        Validator::make($request->all(), [
            'filename' => ['required', 'string', 'max:180'],
            'data' => ['required', 'string'],
            'title' => ['nullable', 'string', 'max:180'],
            'altText' => ['nullable', 'string', 'max:180'],
        ])->validate();

        $filename = (string) $request->input('filename');
        $data = (string) $request->input('data');

        $parsed = $this->parseData((string) $data);
        $buffer = is_string($parsed['buffer'] ?? null) ? $parsed['buffer'] : '';
        $validatedFile = $this->validateBuffer($buffer, is_string($parsed['mime'] ?? null) ? $parsed['mime'] : null);

        $base = $this->safeBaseName(pathinfo($filename, PATHINFO_FILENAME));
        $unique = Str::random(12);
        $mime = $validatedFile['mime'];

        $convertedBuffer = null;
        $useWebp = false;
        if (str_starts_with($mime, 'image/')) {
            $convertedBuffer = $this->tryConvertToWebp($buffer);
            if ($convertedBuffer) {
                $useWebp = true;
            }
        }

        $finalBuffer = $useWebp ? $convertedBuffer : $buffer;
        $finalExt = $useWebp ? 'webp' : $validatedFile['extension'];
        $finalMime = $useWebp ? 'image/webp' : $mime;

        $safeName = $base . '-' . time() . '-' . $unique . '.' . $finalExt;

        $relativePath = 'uploads/portfolio/' . $safeName;
        $fullPath = public_path($relativePath);
        if (!is_dir(dirname($fullPath))) {
            mkdir(dirname($fullPath), 0775, true);
        }
        file_put_contents($fullPath, $finalBuffer);

        $fileUrl = '/' . $relativePath;

        $id = DB::table('media_assets')->insertGetId([
            'file_url' => $fileUrl,
            'file_path' => $fullPath,
            'mime_type' => $finalMime,
            'file_size' => strlen($finalBuffer),
            'title' => $request->input('title'),
            'alt_text' => $request->input('altText'),
        ]);

        return response()->json([
            'id' => $id,
            'fileUrl' => $this->requestOrigin() . $fileUrl,
        ], 201);
    }

    public function storeFile(Request $request)
    {
        Validator::make($request->all(), [
            'file' => ['required', 'file', 'max:' . $this->maxUploadKb()],
            'title' => ['nullable', 'string', 'max:180'],
            'altText' => ['nullable', 'string', 'max:180'],
        ])->validate();

        $file = $request->file('file');
        if (!$file || !$file->isValid()) {
            return response()->json(['error' => 'Archivo invalido.'], 400);
        }

        $originalName = $file->getClientOriginalName() ?: 'media';
        $validatedFile = $this->validateBuffer((string) file_get_contents($file->getRealPath()), $file->getMimeType());
        $base = $this->safeBaseName(pathinfo($originalName, PATHINFO_FILENAME));
        $unique = Str::random(12);
        $safeName = $base . '-' . time() . '-' . $unique . '.' . $validatedFile['extension'];

        $relativePath = 'uploads/portfolio/' . $safeName;
        $fullPath = public_path($relativePath);
        if (!is_dir(dirname($fullPath))) {
            mkdir(dirname($fullPath), 0775, true);
        }
        $file->move(dirname($fullPath), basename($fullPath));

        $fileUrl = '/' . $relativePath;
        $mime = $validatedFile['mime'];
        $size = $file->getSize();

        $id = DB::table('media_assets')->insertGetId([
            'file_url' => $fileUrl,
            'file_path' => $fullPath,
            'mime_type' => $mime,
            'file_size' => $size,
            'title' => $request->input('title'),
            'alt_text' => $request->input('altText'),
        ]);

        return response()->json([
            'id' => $id,
            'fileUrl' => $this->requestOrigin() . $fileUrl,
        ], 201);
    }
}
