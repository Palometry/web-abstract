<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

    private function slugExists(string $slug, ?int $ignoreId = null): bool
    {
        $query = DB::table('blog_posts')->where('slug', $slug);
        if ($ignoreId) {
            $query->where('id', '<>', $ignoreId);
        }
        return $query->exists();
    }

    private function generateSlug(string $title): string
    {
        $base = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $title));
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

    public function publicList()
    {
        $rows = DB::select(
            "SELECT id, title, slug, excerpt, cover_image_url, published_at, created_at
             FROM blog_posts
             WHERE status = 'published'
             ORDER BY published_at DESC, created_at DESC, id DESC"
        );

        $posts = array_map(function ($row) {
            return [
                'id' => $row->id,
                'title' => $row->title,
                'slug' => $row->slug,
                'excerpt' => $row->excerpt,
                'coverImageUrl' => $this->resolveFileUrl($row->cover_image_url),
                'publishedAt' => $row->published_at,
                'createdAt' => $row->created_at,
            ];
        }, $rows);

        return response()->json($posts);
    }

    public function publicDetail(string $slug)
    {
        $slug = trim($slug);
        if ($slug === '') {
            return response()->json(['error' => 'Invalid blog slug.'], 400);
        }

        $rows = DB::select(
            "SELECT id, title, slug, excerpt, content, cover_image_url, published_at, created_at
             FROM blog_posts
             WHERE slug = ? AND status = 'published'
             LIMIT 1",
            [$slug]
        );
        $post = !empty($rows) ? $rows[0] : null;
        if (!$post) {
            return response()->json(['error' => 'Blog post not found.'], 404);
        }

        return response()->json([
            'id' => $post->id,
            'title' => $post->title,
            'slug' => $post->slug,
            'excerpt' => $post->excerpt,
            'content' => $post->content,
            'coverImageUrl' => $this->resolveFileUrl($post->cover_image_url),
            'publishedAt' => $post->published_at,
            'createdAt' => $post->created_at,
        ]);
    }

    public function index()
    {
        $rows = DB::select(
            "SELECT id, title, slug, status, published_at, created_at
             FROM blog_posts
             ORDER BY created_at DESC, id DESC"
        );

        $posts = array_map(static function ($row) {
            return [
                'id' => $row->id,
                'title' => $row->title,
                'slug' => $row->slug,
                'status' => $row->status,
                'publishedAt' => $row->published_at,
                'createdAt' => $row->created_at,
            ];
        }, $rows);

        return response()->json($posts);
    }

    public function show(string $id)
    {
        $postId = (int) $id;
        if ($postId <= 0) {
            return response()->json(['error' => 'Invalid blog id.'], 400);
        }

        $rows = DB::select(
            "SELECT id, title, slug, status, excerpt, content, cover_image_url, published_at
             FROM blog_posts
             WHERE id = ?
             LIMIT 1",
            [$postId]
        );
        $post = !empty($rows) ? $rows[0] : null;
        if (!$post) {
            return response()->json(['error' => 'Blog post not found.'], 404);
        }

        return response()->json([
            'id' => $post->id,
            'title' => $post->title,
            'slug' => $post->slug,
            'status' => $post->status,
            'excerpt' => $post->excerpt,
            'content' => $post->content,
            'coverImageUrl' => $this->resolveFileUrl($post->cover_image_url),
            'publishedAt' => $post->published_at,
        ]);
    }

    public function store(Request $request)
    {
        $title = trim((string) $request->input('title', ''));
        if ($title === '') {
            return response()->json(['error' => 'Title is required.'], 400);
        }

        $slug = trim((string) $request->input('slug', ''));
        if ($slug === '') {
            $slug = $this->generateSlug($title);
        }

        if ($this->slugExists($slug)) {
            return response()->json(['error' => 'Slug already exists.'], 409);
        }

        $status = $this->sanitizeStatus($request->input('status'));
        $publishedAt = $this->parseDate($request->input('publishedAt'));
        if ($status === 'published' && !$publishedAt) {
            $publishedAt = now();
        }

        $now = now();
        $id = DB::table('blog_posts')->insertGetId([
            'title' => $title,
            'slug' => $slug,
            'excerpt' => $request->input('excerpt'),
            'content' => $request->input('content'),
            'cover_image_url' => $request->input('coverImageUrl'),
            'status' => $status,
            'published_at' => $publishedAt,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return response()->json(['id' => $id], 201);
    }

    public function update(Request $request, string $id)
    {
        $postId = (int) $id;
        if ($postId <= 0) {
            return response()->json(['error' => 'Invalid blog id.'], 400);
        }

        $exists = DB::table('blog_posts')->select('id', 'published_at')->where('id', $postId)->first();
        if (!$exists) {
            return response()->json(['error' => 'Blog post not found.'], 404);
        }

        $updates = [];
        if ($request->has('title')) {
            $value = trim((string) $request->input('title'));
            if ($value === '') {
                return response()->json(['error' => 'Title cannot be empty.'], 400);
            }
            $updates['title'] = $value;
        }
        if ($request->has('slug')) {
            $slug = trim((string) $request->input('slug'));
            if ($slug === '') {
                return response()->json(['error' => 'Slug cannot be empty.'], 400);
            }
            if ($this->slugExists($slug, $postId)) {
                return response()->json(['error' => 'Slug already exists.'], 409);
            }
            $updates['slug'] = $slug;
        }
        if ($request->has('status')) {
            $updates['status'] = $this->sanitizeStatus($request->input('status'));
        }
        if ($request->has('excerpt')) {
            $updates['excerpt'] = $request->input('excerpt');
        }
        if ($request->has('content')) {
            $updates['content'] = $request->input('content');
        }
        if ($request->has('coverImageUrl')) {
            $updates['cover_image_url'] = $request->input('coverImageUrl');
        }
        if ($request->has('publishedAt')) {
            $updates['published_at'] = $this->parseDate($request->input('publishedAt'));
        }

        if (isset($updates['status']) && $updates['status'] === 'published' && !array_key_exists('published_at', $updates)) {
            if (!$exists->published_at) {
                $updates['published_at'] = now();
            }
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
