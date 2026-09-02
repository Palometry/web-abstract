<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class BlogController extends Controller
{
    private function resolveFileUrl(?string $url): ?string
    {
        $url = is_string($url) ? trim($url) : '';
        if ($url === '') {
            return null;
        }

        $host = request()->getSchemeAndHttpHost();

        if (preg_match('#^https?://#i', $url)) {
            $parts = parse_url($url);
            $path = $parts['path'] ?? '';
            if ($path !== '' && str_starts_with($path, '/uploads/')) {
                return $host . $path;
            }

            $currentHost = parse_url($host, PHP_URL_HOST);
            $urlHost = $parts['host'] ?? null;
            if ($urlHost && $currentHost && strcasecmp($urlHost, $currentHost) === 0) {
                return $url;
            }

            return $url;
        }

        if (str_starts_with($url, '/')) {
            return $host . $url;
        }

        return $host . '/' . $url;
    }

    private function sanitizeStatus(?string $status): string
    {
        $allowed = ['draft', 'published'];
        return in_array($status, $allowed, true) ? $status : 'draft';
    }

    private function sanitizeContentType(?string $contentType): string
    {
        $allowed = ['article', 'external'];
        return in_array($contentType, $allowed, true) ? $contentType : 'article';
    }

    private function parseDate($value): ?string
    {
        if (!is_string($value)) {
            return null;
        }
        $trimmed = trim($value);
        if ($trimmed === '') {
            return null;
        }
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $trimmed)) {
            return "{$trimmed} 00:00:00";
        }
        if (preg_match('/^\d{4}-\d{2}-\d{2}T/', $trimmed)) {
            return substr(str_replace('T', ' ', $trimmed), 0, 19);
        }
        return null;
    }

    private function normalizeNullableString($value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $trimmed = trim($value);
        return $trimmed === '' ? null : $trimmed;
    }

    private function slugExists(string $slug, ?int $ignoreId = null): bool
    {
        if (!Schema::hasTable('blog_posts')) {
            return false;
        }

        $query = DB::table('blog_posts')->where('slug', $slug);
        if ($ignoreId) {
            $query->where('id', '<>', $ignoreId);
        }
        return $query->exists();
    }

    private function generateSlug(string $title): string
    {
        $base = strtolower((string) preg_replace('/[^a-z0-9]+/i', '-', $title));
        $base = trim($base, '-');
        $date = date('Ymd');
        $slug = $base !== '' ? "{$date}-{$base}" : $date;

        $candidate = $slug;
        $suffix = 2;
        while ($this->slugExists($candidate)) {
            $candidate = "{$slug}-{$suffix}";
            $suffix += 1;
        }
        return $candidate;
    }

    private function blogHasTable(): bool
    {
        return Schema::hasTable('blog_posts');
    }

    private function blogHasColumn(string $column): bool
    {
        return $this->blogHasTable() && Schema::hasColumn('blog_posts', $column);
    }

    private function blogQuery()
    {
        $query = DB::table('blog_posts')->select([
            'id',
            'title',
            'slug',
            'status',
            'excerpt',
            'content',
            'cover_image_url',
            'published_at',
            'created_at',
        ]);

        if ($this->blogHasColumn('content_type')) {
            $query->addSelect('content_type');
        }
        if ($this->blogHasColumn('external_url')) {
            $query->addSelect('external_url');
        }
        if ($this->blogHasColumn('external_platform')) {
            $query->addSelect('external_platform');
        }
        if ($this->blogHasColumn('external_account')) {
            $query->addSelect('external_account');
        }
        if ($this->blogHasColumn('external_cta')) {
            $query->addSelect('external_cta');
        }

        return $query;
    }

    private function postValue(object $row, string $key)
    {
        return property_exists($row, $key) ? $row->{$key} : null;
    }

    private function mapPost(object $row, bool $includeContent = false): array
    {
        $contentType = $this->sanitizeContentType($this->postValue($row, 'content_type'));
        $payload = [
            'id' => $row->id,
            'title' => $row->title,
            'slug' => $row->slug,
            'status' => $row->status,
            'contentType' => $contentType,
            'excerpt' => $this->postValue($row, 'excerpt'),
            'coverImageUrl' => $this->resolveFileUrl($this->postValue($row, 'cover_image_url')),
            'publishedAt' => $this->postValue($row, 'published_at'),
            'createdAt' => $this->postValue($row, 'created_at'),
            'externalUrl' => $this->postValue($row, 'external_url'),
            'externalPlatform' => $this->postValue($row, 'external_platform'),
            'externalAccount' => $this->postValue($row, 'external_account'),
            'externalCta' => $this->postValue($row, 'external_cta') ?: 'Ver publicacion',
        ];

        if ($includeContent) {
            $payload['content'] = $this->postValue($row, 'content');
        }

        return $payload;
    }

    private function buildPayload(Request $request, bool $partial = false): array
    {
        $payload = [];

        if (!$partial || $request->has('title')) {
            $payload['title'] = $this->normalizeNullableString($request->input('title'));
        }
        if (!$partial || $request->has('slug')) {
            $payload['slug'] = $this->normalizeNullableString($request->input('slug'));
        }
        if (!$partial || $request->has('status')) {
            $payload['status'] = $this->sanitizeStatus($request->input('status'));
        }
        if (!$partial || $request->has('contentType')) {
            $payload['contentType'] = $this->sanitizeContentType($request->input('contentType'));
        }
        if (!$partial || $request->has('excerpt')) {
            $payload['excerpt'] = $this->normalizeNullableString($request->input('excerpt'));
        }
        if (!$partial || $request->has('content')) {
            $payload['content'] = $this->normalizeNullableString($request->input('content'));
        }
        if (!$partial || $request->has('coverImageUrl')) {
            $payload['coverImageUrl'] = $this->normalizeNullableString($request->input('coverImageUrl'));
        }
        if (!$partial || $request->has('externalUrl')) {
            $payload['externalUrl'] = $this->normalizeNullableString($request->input('externalUrl'));
        }
        if (!$partial || $request->has('externalPlatform')) {
            $payload['externalPlatform'] = $this->normalizeNullableString($request->input('externalPlatform'));
        }
        if (!$partial || $request->has('externalAccount')) {
            $payload['externalAccount'] = $this->normalizeNullableString($request->input('externalAccount'));
        }
        if (!$partial || $request->has('externalCta')) {
            $payload['externalCta'] = $this->normalizeNullableString($request->input('externalCta'));
        }
        if (!$partial || $request->has('publishedAt')) {
            $payload['publishedAt'] = $this->parseDate($request->input('publishedAt'));
        }

        return $payload;
    }

    public function publicList()
    {
        if (!$this->blogHasTable()) {
            return response()->json([]);
        }

        $rows = $this->blogQuery()
            ->where('status', 'published')
            ->orderByDesc('published_at')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        return response()->json($rows->map(fn ($row) => $this->mapPost($row))->all());
    }

    public function publicDetail(string $slug)
    {
        if (!$this->blogHasTable()) {
            return response()->json(['error' => 'Blog post not found.'], 404);
        }

        $slug = trim($slug);
        if ($slug === '') {
            return response()->json(['error' => 'Invalid blog slug.'], 400);
        }

        $post = $this->blogQuery()
            ->where('slug', $slug)
            ->where('status', 'published')
            ->first();

        if (!$post) {
            return response()->json(['error' => 'Blog post not found.'], 404);
        }

        return response()->json($this->mapPost($post, true));
    }

    public function index()
    {
        if (!$this->blogHasTable()) {
            return response()->json([]);
        }

        $rows = $this->blogQuery()
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        return response()->json($rows->map(fn ($row) => $this->mapPost($row))->all());
    }

    public function show(string $id)
    {
        if (!$this->blogHasTable()) {
            return response()->json(['error' => 'Blog post not found.'], 404);
        }

        $postId = (int) $id;
        if ($postId <= 0) {
            return response()->json(['error' => 'Invalid blog id.'], 400);
        }

        $post = $this->blogQuery()->where('id', $postId)->first();
        if (!$post) {
            return response()->json(['error' => 'Blog post not found.'], 404);
        }

        return response()->json($this->mapPost($post, true));
    }

    public function store(Request $request)
    {
        if (!$this->blogHasTable()) {
            return response()->json(['error' => 'Blog table not found.'], 500);
        }

        $payload = $this->buildPayload($request);
        $title = $payload['title'] ?? null;
        if (!$title) {
            return response()->json(['error' => 'Title is required.'], 400);
        }

        $slug = $payload['slug'] ?? null;
        if (!$slug) {
            $slug = $this->generateSlug($title);
        }

        if ($this->slugExists($slug)) {
            return response()->json(['error' => 'Slug already exists.'], 409);
        }

        $contentType = $payload['contentType'] ?? 'article';
        if ($contentType === 'external' && empty($payload['externalUrl'])) {
            return response()->json(['error' => 'External URL is required for external posts.'], 400);
        }

        $publishedAt = $payload['publishedAt'] ?? null;
        if (($payload['status'] ?? 'draft') === 'published' && !$publishedAt) {
            $publishedAt = now();
        }

        $now = now();
        $insert = [
            'title' => $title,
            'slug' => $slug,
            'excerpt' => $payload['excerpt'] ?? null,
            'content' => $payload['content'] ?? null,
            'cover_image_url' => $payload['coverImageUrl'] ?? null,
            'status' => $payload['status'] ?? 'draft',
            'published_at' => $publishedAt,
            'created_at' => $now,
            'updated_at' => $now,
        ];

        if ($this->blogHasColumn('content_type')) {
            $insert['content_type'] = $contentType;
        }
        if ($this->blogHasColumn('external_url')) {
            $insert['external_url'] = $payload['externalUrl'] ?? null;
        }
        if ($this->blogHasColumn('external_platform')) {
            $insert['external_platform'] = $payload['externalPlatform'] ?? null;
        }
        if ($this->blogHasColumn('external_account')) {
            $insert['external_account'] = $payload['externalAccount'] ?? null;
        }
        if ($this->blogHasColumn('external_cta')) {
            $insert['external_cta'] = $payload['externalCta'] ?? null;
        }

        $id = DB::table('blog_posts')->insertGetId($insert);

        return response()->json(['id' => $id], 201);
    }

    public function update(Request $request, string $id)
    {
        if (!$this->blogHasTable()) {
            return response()->json(['error' => 'Blog post not found.'], 404);
        }

        $postId = (int) $id;
        if ($postId <= 0) {
            return response()->json(['error' => 'Invalid blog id.'], 400);
        }

        $existing = DB::table('blog_posts')
            ->select('id', 'published_at', 'cover_image_url', 'external_url')
            ->where('id', $postId)
            ->first();

        if (!$existing) {
            return response()->json(['error' => 'Blog post not found.'], 404);
        }

        $payload = $this->buildPayload($request, true);
        $updates = [];

        if (array_key_exists('title', $payload)) {
            if (!$payload['title']) {
                return response()->json(['error' => 'Title cannot be empty.'], 400);
            }
            $updates['title'] = $payload['title'];
        }

        if (array_key_exists('slug', $payload)) {
            if (!$payload['slug']) {
                return response()->json(['error' => 'Slug cannot be empty.'], 400);
            }
            if ($this->slugExists($payload['slug'], $postId)) {
                return response()->json(['error' => 'Slug already exists.'], 409);
            }
            $updates['slug'] = $payload['slug'];
        }

        if (array_key_exists('status', $payload)) {
            $updates['status'] = $payload['status'];
        }
        if (array_key_exists('excerpt', $payload)) {
            $updates['excerpt'] = $payload['excerpt'];
        }
        if (array_key_exists('content', $payload)) {
            $updates['content'] = $payload['content'];
        }
        if (array_key_exists('coverImageUrl', $payload)) {
            $updates['cover_image_url'] = $payload['coverImageUrl'];
        }
        if (array_key_exists('publishedAt', $payload)) {
            $updates['published_at'] = $payload['publishedAt'];
        }

        if (array_key_exists('contentType', $payload)) {
            $contentType = $payload['contentType'];
            if ($contentType === 'external') {
                $externalUrl = $payload['externalUrl'] ?? $this->normalizeNullableString($request->input('externalUrl'));
                if (!$externalUrl && $this->blogHasColumn('external_url')) {
                    $stored = DB::table('blog_posts')->where('id', $postId)->value('external_url');
                    $externalUrl = $this->normalizeNullableString($stored);
                }
                if (!$externalUrl) {
                    return response()->json(['error' => 'External URL is required for external posts.'], 400);
                }
            }

            if ($this->blogHasColumn('content_type')) {
                $updates['content_type'] = $contentType;
            }
        }

        if (array_key_exists('externalUrl', $payload) && $this->blogHasColumn('external_url')) {
            $updates['external_url'] = $payload['externalUrl'];
        }
        if (array_key_exists('externalPlatform', $payload) && $this->blogHasColumn('external_platform')) {
            $updates['external_platform'] = $payload['externalPlatform'];
        }
        if (array_key_exists('externalAccount', $payload) && $this->blogHasColumn('external_account')) {
            $updates['external_account'] = $payload['externalAccount'];
        }
        if (array_key_exists('externalCta', $payload) && $this->blogHasColumn('external_cta')) {
            $updates['external_cta'] = $payload['externalCta'];
        }

        if (
            isset($updates['status']) &&
            $updates['status'] === 'published' &&
            !array_key_exists('published_at', $updates) &&
            !$existing->published_at
        ) {
            $updates['published_at'] = now();
        }

        if (empty($updates)) {
            return response()->json(['error' => 'No fields to update.'], 400);
        }

        $updates['updated_at'] = now();
        DB::table('blog_posts')->where('id', $postId)->update($updates);

        return response()->json(['ok' => true]);
    }

    public function destroy(string $id)
    {
        if (!$this->blogHasTable()) {
            return response()->json(['error' => 'Blog post not found.'], 404);
        }

        $postId = (int) $id;
        if ($postId <= 0) {
            return response()->json(['error' => 'Invalid blog id.'], 400);
        }

        $affected = DB::table('blog_posts')->where('id', $postId)->delete();
        if ($affected === 0) {
            return response()->json(['error' => 'Blog post not found.'], 404);
        }

        return response()->noContent();
    }
}
