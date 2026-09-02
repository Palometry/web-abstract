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

    private function maxUploadMessage(): string
    {
        $maxMb = max(1, (int) ceil($this->maxUploadKb() / 1024));
        return 'El archivo excede el tamano maximo permitido de ' . $maxMb . ' MB.';
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
                'file' => [$this->maxUploadMessage()],
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

    private function chunkRoot(): string
    {
        return storage_path('app/media-chunks');
    }

    private function chunkDir(string $uploadId): string
    {
        return $this->chunkRoot() . DIRECTORY_SEPARATOR . $uploadId;
    }

    private function chunkMetaPath(string $uploadId): string
    {
        return $this->chunkDir($uploadId) . DIRECTORY_SEPARATOR . 'meta.json';
    }

    private function ensureDirectory(string $path): void
    {
        if (!is_dir($path)) {
            mkdir($path, 0775, true);
        }
    }

    private function writeChunkMeta(string $uploadId, array $meta): void
    {
        $dir = $this->chunkDir($uploadId);
        $this->ensureDirectory($dir);
        file_put_contents($this->chunkMetaPath($uploadId), json_encode($meta, JSON_UNESCAPED_SLASHES));
    }

    private function readChunkMeta(string $uploadId): ?array
    {
        $path = $this->chunkMetaPath($uploadId);
        if (!is_file($path)) {
            return null;
        }

        $decoded = json_decode((string) file_get_contents($path), true);
        return is_array($decoded) ? $decoded : null;
    }

    private function cleanupChunkUpload(string $uploadId): void
    {
        $dir = $this->chunkDir($uploadId);
        if (!is_dir($dir)) {
            return;
        }

        $items = scandir($dir) ?: [];
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }

            $path = $dir . DIRECTORY_SEPARATOR . $item;
            if (is_dir($path)) {
                continue;
            }
            @unlink($path);
        }

        @rmdir($dir);
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

    public function initChunkedUpload(Request $request)
    {
        Validator::make($request->all(), [
            'filename' => ['required', 'string', 'max:180'],
            'mimeType' => ['nullable', 'string', 'max:120'],
            'fileSize' => ['required', 'integer', 'min:1'],
            'title' => ['nullable', 'string', 'max:180'],
            'altText' => ['nullable', 'string', 'max:180'],
        ])->validate();

        $fileSize = (int) $request->input('fileSize');

        $uploadId = (string) Str::uuid();
        $this->writeChunkMeta($uploadId, [
            'filename' => (string) $request->input('filename'),
            'mimeType' => $request->input('mimeType'),
            'originalExtension' => strtolower((string) pathinfo((string) $request->input('filename'), PATHINFO_EXTENSION)),
            'fileSize' => $fileSize,
            'title' => $request->input('title'),
            'altText' => $request->input('altText'),
            'createdAt' => time(),
        ]);

        return response()->json(['uploadId' => $uploadId], 201);
    }

    public function appendChunk(Request $request, string $uploadId)
    {
        Validator::make($request->all(), [
            'chunk' => ['required', 'file', 'max:1536'],
            'index' => ['required', 'integer', 'min:0'],
        ])->validate();

        $meta = $this->readChunkMeta($uploadId);
        if (!$meta) {
            return response()->json(['error' => 'Upload session not found.'], 404);
        }

        $chunk = $request->file('chunk');
        if (!$chunk || !$chunk->isValid()) {
            return response()->json(['error' => 'Chunk invalido.'], 400);
        }

        $this->ensureDirectory($this->chunkDir($uploadId));
        $index = (int) $request->input('index');
        $chunkPath = $this->chunkDir($uploadId) . DIRECTORY_SEPARATOR . sprintf('part_%06d', $index);
        $chunk->move($this->chunkDir($uploadId), basename($chunkPath));

        return response()->json(['ok' => true]);
    }

    public function completeChunkedUpload(Request $request, string $uploadId)
    {
        Validator::make($request->all(), [
            'totalChunks' => ['required', 'integer', 'min:1'],
        ])->validate();

        $meta = $this->readChunkMeta($uploadId);
        if (!$meta) {
            return response()->json(['error' => 'Upload session not found.'], 404);
        }

        $totalChunks = (int) $request->input('totalChunks');
        $chunkDir = $this->chunkDir($uploadId);
        $assembledPath = $chunkDir . DIRECTORY_SEPARATOR . 'assembled.bin';
        $output = fopen($assembledPath, 'wb');
        if ($output === false) {
            return response()->json(['error' => 'No se pudo preparar el archivo final.'], 500);
        }

        try {
            for ($index = 0; $index < $totalChunks; $index += 1) {
                $partPath = $chunkDir . DIRECTORY_SEPARATOR . sprintf('part_%06d', $index);
                if (!is_file($partPath)) {
                    fclose($output);
                    @unlink($assembledPath);
                    return response()->json(['error' => 'Faltan partes del archivo.'], 400);
                }

                $input = fopen($partPath, 'rb');
                if ($input === false) {
                    fclose($output);
                    @unlink($assembledPath);
                    return response()->json(['error' => 'No se pudo leer una parte del archivo.'], 500);
                }

                stream_copy_to_stream($input, $output);
                fclose($input);
            }
            fclose($output);

            $finalSize = (int) filesize($assembledPath);
            if ($finalSize <= 0 || $finalSize > ($this->maxUploadKb() * 1024)) {
                @unlink($assembledPath);
                return response()->json(['error' => $this->maxUploadMessage()], 413);
            }

            $finfo = new \finfo(FILEINFO_MIME_TYPE);
            $mime = $finfo->file($assembledPath) ?: ($meta['mimeType'] ?? null);
            if (!is_string($mime) || !in_array($mime, $this->allowedMimeTypes(), true)) {
                @unlink($assembledPath);
                return response()->json(['error' => 'Tipo de archivo no permitido.'], 422);
            }

            $extension = $this->extensionForMime($mime);
            if (!$extension) {
                $fallbackExtension = strtolower((string) ($meta['originalExtension'] ?? ''));
                if ($fallbackExtension !== '') {
                    $extension = $fallbackExtension;
                } else {
                    @unlink($assembledPath);
                    return response()->json(['error' => 'No se pudo determinar una extension segura para el archivo.'], 422);
                }
            }

            $base = $this->safeBaseName(pathinfo((string) $meta['filename'], PATHINFO_FILENAME));
            $unique = Str::random(12);
            $safeName = $base . '-' . time() . '-' . $unique . '.' . $extension;
            $relativePath = 'uploads/portfolio/' . $safeName;
            $fullPath = public_path($relativePath);
            $this->ensureDirectory(dirname($fullPath));
            rename($assembledPath, $fullPath);

            $fileUrl = '/' . $relativePath;
            $id = DB::table('media_assets')->insertGetId([
                'file_url' => $fileUrl,
                'file_path' => $fullPath,
                'mime_type' => $mime,
                'file_size' => $finalSize,
                'title' => $meta['title'] ?? null,
                'alt_text' => $meta['altText'] ?? null,
            ]);

            $this->cleanupChunkUpload($uploadId);

            return response()->json([
                'id' => $id,
                'fileUrl' => $this->requestOrigin() . $fileUrl,
            ], 201);
        } catch (\Throwable $exception) {
            fclose($output);
            @unlink($assembledPath);
            $this->cleanupChunkUpload($uploadId);
            return response()->json(['error' => 'No se pudo completar la subida del archivo.'], 500);
        }
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
        $size = (int) ($file->getSize() ?? 0);
        $maxBytes = $this->maxUploadKb() * 1024;
        if ($size <= 0 || $size > $maxBytes) {
            throw ValidationException::withMessages([
                'file' => [$this->maxUploadMessage()],
            ]);
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($file->getRealPath()) ?: $file->getMimeType();
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

        $base = $this->safeBaseName(pathinfo($originalName, PATHINFO_FILENAME));
        $unique = Str::random(12);
        $safeName = $base . '-' . time() . '-' . $unique . '.' . $extension;

        $relativePath = 'uploads/portfolio/' . $safeName;
        $fullPath = public_path($relativePath);
        if (!is_dir(dirname($fullPath))) {
            mkdir(dirname($fullPath), 0775, true);
        }
        $file->move(dirname($fullPath), basename($fullPath));

        $fileUrl = '/' . $relativePath;

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
