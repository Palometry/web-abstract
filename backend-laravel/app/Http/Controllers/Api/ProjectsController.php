<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProjectsController extends Controller
{
    private function requestOrigin(): string
    {
        $scheme = request()->headers->get('x-forwarded-proto')
            ?: request()->headers->get('x-forwarded-scheme')
            ?: request()->getScheme();

        return strtolower((string) $scheme) . '://' . request()->getHttpHost();
    }

    private function resolvePublicBrochureUrl(int $projectId, ?string $url): ?string
    {
        $resolved = $this->resolveFileUrl($url);
        if (!$resolved) {
            return null;
        }

        $parts = parse_url($resolved);
        $path = $parts['path'] ?? '';
        if ($path !== '' && str_starts_with($path, '/uploads/')) {
            return $this->requestOrigin() . '/api/projects/public/' . $projectId . '/brochure';
        }

        return $resolved;
    }

    private function resolvePublicHeroVideoUrl(int $projectId, ?string $url): ?string
    {
        $resolved = $this->resolveFileUrl($url);
        if (!$resolved) {
            return null;
        }

        $parts = parse_url($resolved);
        $path = $parts['path'] ?? '';
        if ($path !== '' && str_starts_with($path, '/uploads/')) {
            return $this->requestOrigin() . '/api/projects/public/' . $projectId . '/hero-video';
        }

        return $resolved;
    }

    private function resolveLocalUploadPath(?string $url): ?string
    {
        $resolved = $this->resolveFileUrl($url);
        if (!$resolved) {
            return null;
        }

        $parts = parse_url($resolved);
        $path = $parts['path'] ?? '';
        if ($path === '' || !str_starts_with($path, '/uploads/')) {
            return null;
        }

        $fullPath = realpath(public_path(ltrim($path, '/')));
        $uploadsRoot = realpath(public_path('uploads'));

        if (!$fullPath || !$uploadsRoot) {
            return null;
        }

        if (!str_starts_with($fullPath, $uploadsRoot) || !is_file($fullPath)) {
            return null;
        }

        return $fullPath;
    }

    private function resolveFileUrl(?string $url): ?string
    {
        $url = is_string($url) ? trim($url) : '';
        if ($url === '') {
            return null;
        }

        $host = $this->requestOrigin();

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

    private function resolveUrlList(array $urls): array
    {
        $normalized = [];
        foreach ($urls as $url) {
            $resolved = $this->resolveFileUrl(is_string($url) ? $url : null);
            if ($resolved) {
                $normalized[] = $resolved;
            }
        }
        return $normalized;
    }

    private function uniqueUrlList(array ...$groups): array
    {
        $seen = [];
        $unique = [];

        foreach ($groups as $group) {
            foreach ($group as $url) {
                if (!is_string($url)) {
                    continue;
                }
                $normalized = trim($url);
                if ($normalized === '' || isset($seen[$normalized])) {
                    continue;
                }
                $seen[$normalized] = true;
                $unique[] = $normalized;
            }
        }

        return $unique;
    }

    private function normalizeProjectDetails(?array $details): ?array
    {
        if (!$details) {
            return $details;
        }

        $details['masterplanImage'] = $this->resolveFileUrl($details['masterplanImage'] ?? null);
        $details['brochurePdfUrl'] = $this->resolveFileUrl($details['brochurePdfUrl'] ?? null);
        $details['heroVideoUrl'] = $this->resolveFileUrl($details['heroVideoUrl'] ?? null);
        $details['bannerImages'] = $this->resolveUrlList($details['bannerImages'] ?? []);
        $details['gallery'] = $this->resolveUrlList($details['gallery'] ?? []);

        if (!empty($details['houseModels']) && is_array($details['houseModels'])) {
            $details['houseModels'] = array_map(function ($model) {
                if (!is_array($model)) {
                    return $model;
                }

                $model['image'] = $this->resolveFileUrl($model['image'] ?? null);
                $model['images'] = $this->resolveUrlList($model['images'] ?? []);
                return $model;
            }, $details['houseModels']);
        }

        if (!empty($details['housePlans']) && is_array($details['housePlans'])) {
            $details['housePlans'] = array_map(function ($plan) {
                if (!is_array($plan)) {
                    return $plan;
                }

                $plan['image'] = $this->resolveFileUrl($plan['image'] ?? null);
                return $plan;
            }, $details['housePlans']);
        }

        return $details;
    }

    public function publicList()
    {
        $rows = DB::select(
            "SELECT p.id, p.name, p.description, p.status, p.details_json, p.created_at,
                    (SELECT m.file_url
                     FROM project_images pi
                     INNER JOIN media_assets m ON m.id = pi.media_id
                     WHERE pi.project_id = p.id
                     ORDER BY pi.is_cover DESC, pi.sort_order ASC, pi.id ASC
                     LIMIT 1) AS cover_url
             FROM projects p
             WHERE p.status = 'active'
             ORDER BY p.created_at DESC, p.id DESC"
        );

        $projects = array_map(function ($row) {
            $details = null;
            if (!empty($row->details_json)) {
                $decoded = json_decode($row->details_json, true);
                $details = json_last_error() === JSON_ERROR_NONE ? $decoded : null;
            }

            $bannerImages = $this->resolveUrlList($details['bannerImages'] ?? []);
            $gallery = $this->resolveUrlList($details['gallery'] ?? []);
            $masterplanImage = $this->resolveFileUrl($details['masterplanImage'] ?? null);
            $heroVideoUrl = $this->resolvePublicHeroVideoUrl($row->id, $details['heroVideoUrl'] ?? null);
            $coverUrl = $this->resolveFileUrl($row->cover_url ?? null);
            $fallbackImage = $coverUrl
                ?? ($bannerImages[0] ?? ($gallery[0] ?? $masterplanImage));

            return [
                'id' => $row->id,
                'slug' => $details['slug'] ?? null,
                'title' => $row->name,
                'shortDesc' => $details['shortDesc'] ?? '',
                'image' => $fallbackImage ?? '',
                'thumbImage' => $fallbackImage ?? '',
                'createdAt' => $row->created_at,
                'heroVideoUrl' => $heroVideoUrl,
                'startYear' => (int) ($details['startYear'] ?? 0),
                'deliveryYear' => (int) ($details['deliveryYear'] ?? 0),
                'type' => $details['publicType'] ?? '',
                'classification' => $details['publicClassification'] ?? '',
                'category' => $details['publicCategory'] ?? '',
                'scope' => $details['publicScope'] ?? '',
            ];
        }, $rows);

        return response()->json($projects);
    }

    public function publicDetail(string $id)
    {
        $slug = trim($id);
        $projectId = ctype_digit($slug) ? (int) $slug : 0;
        $query = "SELECT p.id, p.name, p.description, p.status, p.details_json, p.created_at,
                         (SELECT m.file_url
                          FROM project_images pi
                          INNER JOIN media_assets m ON m.id = pi.media_id
                          WHERE pi.project_id = p.id
                          ORDER BY pi.is_cover DESC, pi.sort_order ASC, pi.id ASC
                          LIMIT 1) AS cover_url
                  FROM projects p
                  WHERE ";
        $bindings = [];

        if ($projectId > 0) {
            $query .= "p.id = ?";
            $bindings[] = $projectId;
        } else {
            $query .= "p.slug = ?";
            $bindings[] = $slug;
        }

        $query .= " LIMIT 1";

        $rows = DB::select($query, $bindings);
        $project = !empty($rows) ? $rows[0] : null;
        if (!$project) {
            return response()->json(['error' => 'Project not found.'], 404);
        }

        $details = null;
        if (!empty($project->details_json)) {
            $decoded = json_decode($project->details_json, true);
            $details = json_last_error() === JSON_ERROR_NONE ? $decoded : null;
        }

        $videoRows = DB::select(
            "SELECT pv.id, pv.media_id, pv.title, pv.description, pv.sort_order,
                    m.file_url, m.mime_type
             FROM project_videos pv
             INNER JOIN media_assets m ON m.id = pv.media_id
             WHERE pv.project_id = ?
             ORDER BY pv.sort_order ASC, pv.id ASC",
            [$projectId]
        );
        $videos = array_map(function ($row) {
            return [
                'id' => $row->id,
                'mediaId' => $row->media_id,
                'fileUrl' => $this->resolveFileUrl($row->file_url),
                'title' => $row->title,
                'description' => $row->description,
                'mimeType' => $row->mime_type,
                'sortOrder' => (int) $row->sort_order,
            ];
        }, $videoRows);

        $bannerImages = $this->resolveUrlList($details['bannerImages'] ?? []);
        $gallery = $this->resolveUrlList($details['gallery'] ?? []);
        $masterplanImage = $this->resolveFileUrl($details['masterplanImage'] ?? null);
        $heroVideoUrl = $this->resolvePublicHeroVideoUrl($project->id, $details['heroVideoUrl'] ?? null);
        $coverUrl = $this->resolveFileUrl($project->cover_url ?? null);
        $fallbackImage = $coverUrl
            ?? ($bannerImages[0] ?? ($gallery[0] ?? $masterplanImage));
        $fullGallery = $this->uniqueUrlList($bannerImages, $gallery);

        return response()->json([
            'id' => $project->id,
            'slug' => $details['slug'] ?? null,
            'title' => $project->name,
            'shortDesc' => $details['shortDesc'] ?? '',
            'image' => $fallbackImage ?? '',
            'thumbImage' => $fallbackImage ?? '',
            'createdAt' => $project->created_at,
            'masterplanImage' => $masterplanImage,
            'heroVideoUrl' => $heroVideoUrl,
            'brochurePdfUrl' => $this->resolvePublicBrochureUrl($project->id, $details['brochurePdfUrl'] ?? null),
            'houseModels' => $details['houseModels'] ?? [],
            'housePlans' => $details['housePlans'] ?? [],
            'autocad360Url' => $details['autocadUrl'] ?? null,
            'mapUrl' => $details['mapUrl'] ?? null,
            'mapEmbedUrl' => $details['mapEmbedUrl'] ?? null,
            'enjoyAreas' => $details['enjoyAreas'] ?? [],
            'location' => $details['location'] ?? '',
            'promoter' => $details['promoter'] ?? '',
            'status' => $details['publicStatus'] ?? $project->status,
            'type' => $details['publicType'] ?? '',
            'classification' => $details['publicClassification'] ?? '',
            'category' => $details['publicCategory'] ?? '',
            'scope' => $details['publicScope'] ?? '',
            'landArea' => $details['landArea'] ?? '',
            'units' => $details['units'] ?? null,
            'amenities' => $details['amenities'] ?? [],
            'startYear' => (int) ($details['startYear'] ?? 0),
            'deliveryYear' => (int) ($details['deliveryYear'] ?? 0),
            'description' => $project->description ?? '',
            'bannerImages' => $bannerImages,
            'gallery' => $fullGallery,
            'lots' => $details['lots'] ?? [],
            'videos' => $videos,
        ]);
    }

    public function publicBrochure(string $id)
    {
        $projectId = (int) $id;
        if ($projectId <= 0) {
            return response()->json(['error' => 'Invalid project id.'], 400);
        }

        $rows = DB::select(
            "SELECT details_json
             FROM projects
             WHERE id = ?
             LIMIT 1",
            [$projectId]
        );
        $project = !empty($rows) ? $rows[0] : null;
        if (!$project) {
            return response()->json(['error' => 'Project not found.'], 404);
        }

        $details = null;
        if (!empty($project->details_json)) {
            $decoded = json_decode($project->details_json, true);
            $details = json_last_error() === JSON_ERROR_NONE ? $decoded : null;
        }

        $fullPath = $this->resolveLocalUploadPath($details['brochurePdfUrl'] ?? null);
        if (!$fullPath) {
            return response()->json(['error' => 'Brochure not found.'], 404);
        }

        return response()->file($fullPath, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="brochure.pdf"',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }

    public function publicHeroVideo(string $id)
    {
        $projectId = (int) $id;
        if ($projectId <= 0) {
            return response()->json(['error' => 'Invalid project id.'], 400);
        }

        $rows = DB::select(
            "SELECT details_json
             FROM projects
             WHERE id = ?
             LIMIT 1",
            [$projectId]
        );
        $project = !empty($rows) ? $rows[0] : null;
        if (!$project) {
            return response()->json(['error' => 'Project not found.'], 404);
        }

        $details = null;
        if (!empty($project->details_json)) {
            $decoded = json_decode($project->details_json, true);
            $details = json_last_error() === JSON_ERROR_NONE ? $decoded : null;
        }

        $fullPath = $this->resolveLocalUploadPath($details['heroVideoUrl'] ?? null);
        if (!$fullPath) {
            return response()->json(['error' => 'Hero video not found.'], 404);
        }

        $mime = mime_content_type($fullPath) ?: 'video/mp4';
        $filename = basename($fullPath);

        return response()->file($fullPath, [
            'Content-Type' => $mime,
            'Content-Disposition' => 'inline; filename="' . $filename . '"',
            'Cache-Control' => 'public, max-age=3600',
            'Accept-Ranges' => 'bytes',
        ]);
    }

    public function catalog()
    {
        $rows = DB::table('project_public_catalog')
            ->select('scope', 'type', 'classification', 'category')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $edificaciones = [];
        $habilitaciones = [];

        foreach ($rows as $row) {
            if ($row->scope === 'Edificaciones') {
                if (!isset($edificaciones[$row->type])) {
                    $edificaciones[$row->type] = [];
                }
                if (!isset($edificaciones[$row->type][$row->classification])) {
                    $edificaciones[$row->type][$row->classification] = [];
                }
                if ($row->category && !in_array($row->category, $edificaciones[$row->type][$row->classification], true)) {
                    $edificaciones[$row->type][$row->classification][] = $row->category;
                }
                continue;
            }

            if ($row->scope === 'Habilitaciones') {
                if (!isset($habilitaciones[$row->type])) {
                    $habilitaciones[$row->type] = [];
                }
                if (!in_array($row->classification, $habilitaciones[$row->type], true)) {
                    $habilitaciones[$row->type][] = $row->classification;
                }
            }
        }

        return response()->json([
            'scopes' => ['Edificaciones', 'Habilitaciones'],
            'edificaciones' => $edificaciones,
            'habilitaciones' => $habilitaciones,
        ]);
    }

    public function index()
    {
        $rows = DB::select(
            "SELECT p.id, p.name, p.client_name, p.address, p.status,
                    MAX(CASE WHEN pe.is_visible = 1 THEN 1 ELSE 0 END) AS in_portfolio
             FROM projects p
             LEFT JOIN portfolio_entries pe ON pe.project_id = p.id
             GROUP BY p.id
             ORDER BY p.id DESC"
        );

        $projects = array_map(static function ($row) {
            return [
                'id' => $row->id,
                'name' => $row->name,
                'clientName' => $row->client_name,
                'address' => $row->address,
                'status' => $row->status,
                'portfolio' => (bool) $row->in_portfolio,
            ];
        }, $rows);

        return response()->json($projects);
    }

    public function store(Request $request)
    {
        $name = $request->input('name');
        $clientName = $request->input('clientName');
        $address = $request->input('address');
        if (!$name || !$clientName || !$address) {
            return response()->json(['error' => 'Name, clientName, and address are required.'], 400);
        }

        $details = $request->input('details');
        $detailsJson = $details !== null ? json_encode($details) : null;

        $id = DB::table('projects')->insertGetId([
            'name' => $name,
            'client_name' => $clientName,
            'address' => $address,
            'description' => $request->input('description'),
            'status' => $request->input('status', 'draft'),
            'start_date' => $request->input('startDate'),
            'end_date' => $request->input('endDate'),
            'slug' => $request->input('slug'),
            'details_json' => $detailsJson,
        ]);

        return response()->json(['id' => $id], 201);
    }

    public function show(string $id)
    {
        $projectId = (int) $id;
        if ($projectId <= 0) {
            return response()->json(['error' => 'Invalid project id.'], 400);
        }

        $rows = DB::select(
            "SELECT p.id, p.name, p.client_name, p.address, p.description, p.status,
                    p.start_date, p.end_date, p.slug, p.details_json,
                    MAX(CASE WHEN pe.is_visible = 1 THEN 1 ELSE 0 END) AS in_portfolio
             FROM projects p
             LEFT JOIN portfolio_entries pe ON pe.project_id = p.id
             WHERE p.id = ?
             GROUP BY p.id
             LIMIT 1",
            [$projectId]
        );
        $project = !empty($rows) ? $rows[0] : null;
        if (!$project) {
            return response()->json(['error' => 'Project not found.'], 404);
        }

        $portfolioRows = DB::select(
            "SELECT id, title_override, sort_order, is_visible
             FROM portfolio_entries
             WHERE project_id = ?
             ORDER BY id DESC
             LIMIT 1",
            [$projectId]
        );
        $portfolio = !empty($portfolioRows) ? $portfolioRows[0] : null;

        $imageRows = DB::select(
            "SELECT pi.id, pi.media_id, pi.is_cover, pi.sort_order,
                    m.file_url, m.title, m.alt_text
             FROM project_images pi
             INNER JOIN media_assets m ON m.id = pi.media_id
             WHERE pi.project_id = ?
             ORDER BY pi.is_cover DESC, pi.sort_order ASC, pi.id ASC",
            [$projectId]
        );
        $images = array_map(function ($row) {
            return [
                'id' => $row->id,
                'mediaId' => $row->media_id,
                'fileUrl' => $this->resolveFileUrl($row->file_url),
                'title' => $row->title,
                'altText' => $row->alt_text,
                'isCover' => (bool) $row->is_cover,
                'sortOrder' => (int) $row->sort_order,
            ];
        }, $imageRows);

        $videoRows = DB::select(
            "SELECT pv.id, pv.media_id, pv.title, pv.description, pv.sort_order,
                    m.file_url, m.mime_type
             FROM project_videos pv
             INNER JOIN media_assets m ON m.id = pv.media_id
             WHERE pv.project_id = ?
             ORDER BY pv.sort_order ASC, pv.id ASC",
            [$projectId]
        );
        $videos = array_map(function ($row) {
            return [
                'id' => $row->id,
                'mediaId' => $row->media_id,
                'fileUrl' => $this->resolveFileUrl($row->file_url),
                'title' => $row->title,
                'description' => $row->description,
                'mimeType' => $row->mime_type,
                'sortOrder' => (int) $row->sort_order,
            ];
        }, $videoRows);

        $details = null;
        if (!empty($project->details_json)) {
            $decoded = json_decode($project->details_json, true);
            $details = json_last_error() === JSON_ERROR_NONE ? $this->normalizeProjectDetails($decoded) : null;
        }

        return response()->json([
            'id' => $project->id,
            'name' => $project->name,
            'clientName' => $project->client_name,
            'address' => $project->address,
            'description' => $project->description,
            'status' => $project->status,
            'startDate' => $project->start_date,
            'endDate' => $project->end_date,
            'slug' => $project->slug ?? null,
            'details' => $details,
            'portfolio' => (bool) $project->in_portfolio,
            'portfolioEntry' => $portfolio
                ? [
                    'id' => $portfolio->id,
                    'titleOverride' => $portfolio->title_override,
                    'sortOrder' => (int) $portfolio->sort_order,
                    'isVisible' => (bool) $portfolio->is_visible,
                ]
                : null,
            'images' => $images,
            'videos' => $videos,
        ]);
    }

    public function update(Request $request, string $id)
    {
        $projectId = (int) $id;
        if ($projectId <= 0) {
            return response()->json(['error' => 'Invalid project id.'], 400);
        }

        $updates = [];
        foreach ([
            'name' => 'name',
            'clientName' => 'client_name',
            'address' => 'address',
            'description' => 'description',
            'status' => 'status',
            'startDate' => 'start_date',
            'endDate' => 'end_date',
            'slug' => 'slug',
        ] as $key => $column) {
            if ($request->has($key)) {
                $updates[$column] = $request->input($key);
            }
        }
        if ($request->has('details')) {
            $details = $request->input('details');
            $updates['details_json'] = $details !== null ? json_encode($details) : null;
        }

        if (empty($updates)) {
            return response()->json(['error' => 'No fields to update.'], 400);
        }

        DB::table('projects')->where('id', $projectId)->update($updates);
        return response()->json(['ok' => true]);
    }

    public function destroy(string $id)
    {
        $projectId = (int) $id;
        if ($projectId <= 0) {
            return response()->json(['error' => 'Invalid project id.'], 400);
        }

        DB::beginTransaction();
        try {
            DB::table('project_images')->where('project_id', $projectId)->delete();
            DB::table('portfolio_entries')->where('project_id', $projectId)->delete();
            $affected = DB::table('projects')->where('id', $projectId)->delete();
            DB::commit();
            if ($affected === 0) {
                return response()->json(['error' => 'Project not found.'], 404);
            }
            return response()->noContent();
        } catch (\Throwable) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to delete project.'], 500);
        }
    }

    public function upsertPortfolio(Request $request, string $id)
    {
        $projectId = (int) $id;
        if ($projectId <= 0) {
            return response()->json(['error' => 'Invalid project id.'], 400);
        }

        $project = DB::table('projects')->select('id')->where('id', $projectId)->first();
        if (!$project) {
            return response()->json(['error' => 'Project not found.'], 404);
        }

        $existing = DB::table('portfolio_entries')->select('id')->where('project_id', $projectId)->first();

        if (!$existing) {
            $id = DB::table('portfolio_entries')->insertGetId([
                'project_id' => $projectId,
                'title_override' => $request->input('titleOverride'),
                'category' => $request->input('category'),
                'summary' => $request->input('summary'),
                'autocad_url' => $request->input('autocadUrl'),
                'sort_order' => (int) $request->input('sortOrder', 0),
                'is_visible' => $request->has('isVisible') && $request->boolean('isVisible') === false ? 0 : 1,
            ]);
            return response()->json(['id' => $id], 201);
        }

        $updates = [];
        foreach ([
            'titleOverride' => 'title_override',
            'category' => 'category',
            'summary' => 'summary',
            'autocadUrl' => 'autocad_url',
        ] as $key => $column) {
            if ($request->has($key)) {
                $updates[$column] = $request->input($key);
            }
        }
        if ($request->has('sortOrder')) {
            $updates['sort_order'] = (int) $request->input('sortOrder');
        }
        if ($request->has('isVisible')) {
            $updates['is_visible'] = $request->boolean('isVisible') ? 1 : 0;
        }

        if (!empty($updates)) {
            DB::table('portfolio_entries')->where('project_id', $projectId)->update($updates);
        }

        return response()->json(['ok' => true]);
    }

    public function deletePortfolio(string $id)
    {
        $projectId = (int) $id;
        if ($projectId <= 0) {
            return response()->json(['error' => 'Invalid project id.'], 400);
        }

        $affected = DB::table('portfolio_entries')->where('project_id', $projectId)->delete();
        if ($affected === 0) {
            return response()->json(['error' => 'Portfolio entry not found.'], 404);
        }
        return response()->noContent();
    }

    public function listImages(string $id)
    {
        $projectId = (int) $id;
        if ($projectId <= 0) {
            return response()->json(['error' => 'Invalid project id.'], 400);
        }

        $rows = DB::select(
            "SELECT pi.id, pi.media_id, pi.is_cover, pi.sort_order,
                    m.file_url, m.title, m.alt_text
             FROM project_images pi
             INNER JOIN media_assets m ON m.id = pi.media_id
             WHERE pi.project_id = ?
             ORDER BY pi.is_cover DESC, pi.sort_order ASC, pi.id ASC",
            [$projectId]
        );

        $images = array_map(function ($row) {
            return [
                'id' => $row->id,
                'mediaId' => $row->media_id,
                'fileUrl' => $this->resolveFileUrl($row->file_url),
                'title' => $row->title,
                'altText' => $row->alt_text,
                'isCover' => (bool) $row->is_cover,
                'sortOrder' => (int) $row->sort_order,
            ];
        }, $rows);

        return response()->json($images);
    }

    public function storeImage(Request $request, string $id)
    {
        $projectId = (int) $id;
        if ($projectId <= 0) {
            return response()->json(['error' => 'Invalid project id.'], 400);
        }

        $fileUrl = $request->input('fileUrl');
        if (!$fileUrl) {
            return response()->json(['error' => 'fileUrl is required.'], 400);
        }

        $isCover = $request->boolean('isCover');

        DB::beginTransaction();
        try {
            if ($isCover) {
                DB::table('project_images')->where('project_id', $projectId)->update(['is_cover' => 0]);
            }

            $mediaId = DB::table('media_assets')->insertGetId([
                'file_url' => $fileUrl,
                'title' => $request->input('title'),
                'alt_text' => $request->input('altText'),
            ]);
            $imageId = DB::table('project_images')->insertGetId([
                'project_id' => $projectId,
                'media_id' => $mediaId,
                'is_cover' => $isCover ? 1 : 0,
                'sort_order' => (int) $request->input('sortOrder', 0),
            ]);

            DB::commit();
            return response()->json(['id' => $imageId], 201);
        } catch (\Throwable) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to add image.'], 500);
        }
    }

    public function updateImage(Request $request, string $id, string $imageId)
    {
        $projectId = (int) $id;
        $imageId = (int) $imageId;
        if ($projectId <= 0 || $imageId <= 0) {
            return response()->json(['error' => 'Invalid ids.'], 400);
        }

        $row = DB::table('project_images')
            ->select('media_id')
            ->where('id', $imageId)
            ->where('project_id', $projectId)
            ->first();
        if (!$row) {
            return response()->json(['error' => 'Image not found.'], 404);
        }

        $isCover = $request->has('isCover') ? $request->boolean('isCover') : null;

        DB::beginTransaction();
        try {
            if ($isCover) {
                DB::table('project_images')->where('project_id', $projectId)->update(['is_cover' => 0]);
            }

            $imageUpdates = [];
            if ($isCover !== null) {
                $imageUpdates['is_cover'] = $isCover ? 1 : 0;
            }
            if ($request->has('sortOrder')) {
                $imageUpdates['sort_order'] = (int) $request->input('sortOrder');
            }
            if (!empty($imageUpdates)) {
                DB::table('project_images')
                    ->where('id', $imageId)
                    ->where('project_id', $projectId)
                    ->update($imageUpdates);
            }

            $mediaUpdates = [];
            if ($request->has('fileUrl')) {
                $mediaUpdates['file_url'] = $request->input('fileUrl');
            }
            if ($request->has('title')) {
                $mediaUpdates['title'] = $request->input('title');
            }
            if ($request->has('altText')) {
                $mediaUpdates['alt_text'] = $request->input('altText');
            }
            if (!empty($mediaUpdates)) {
                DB::table('media_assets')->where('id', $row->media_id)->update($mediaUpdates);
            }

            DB::commit();
            return response()->json(['ok' => true]);
        } catch (\Throwable) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to update image.'], 500);
        }
    }

    public function destroyImage(string $id, string $imageId)
    {
        $projectId = (int) $id;
        $imageId = (int) $imageId;
        if ($projectId <= 0 || $imageId <= 0) {
            return response()->json(['error' => 'Invalid ids.'], 400);
        }

        DB::beginTransaction();
        try {
            $row = DB::table('project_images')
                ->select('media_id')
                ->where('id', $imageId)
                ->where('project_id', $projectId)
                ->first();
            if (!$row) {
                DB::rollBack();
                return response()->json(['error' => 'Image not found.'], 404);
            }

            DB::table('project_images')->where('id', $imageId)->where('project_id', $projectId)->delete();

            $countRow = DB::select(
                'SELECT COUNT(*) AS total FROM project_images WHERE media_id = ?',
                [$row->media_id]
            );
            $total = !empty($countRow) ? (int) $countRow[0]->total : 0;
            if ($total === 0) {
                DB::table('media_assets')->where('id', $row->media_id)->delete();
            }

            DB::commit();
            return response()->noContent();
        } catch (\Throwable) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to delete image.'], 500);
        }
    }

    public function listVideos(string $id)
    {
        $projectId = (int) $id;
        if ($projectId <= 0) {
            return response()->json(['error' => 'Invalid project id.'], 400);
        }

        $rows = DB::select(
            "SELECT pv.id, pv.media_id, pv.title, pv.description, pv.sort_order,
                    m.file_url, m.mime_type
             FROM project_videos pv
             INNER JOIN media_assets m ON m.id = pv.media_id
             WHERE pv.project_id = ?
             ORDER BY pv.sort_order ASC, pv.id ASC",
            [$projectId]
        );

        $videos = array_map(function ($row) {
            return [
                'id' => $row->id,
                'mediaId' => $row->media_id,
                'fileUrl' => $this->resolveFileUrl($row->file_url),
                'title' => $row->title,
                'description' => $row->description,
                'mimeType' => $row->mime_type,
                'sortOrder' => (int) $row->sort_order,
            ];
        }, $rows);

        return response()->json($videos);
    }

    public function storeVideo(Request $request, string $id)
    {
        $projectId = (int) $id;
        if ($projectId <= 0) {
            return response()->json(['error' => 'Invalid project id.'], 400);
        }

        $fileUrl = $request->input('fileUrl');
        if (!$fileUrl) {
            return response()->json(['error' => 'fileUrl is required.'], 400);
        }

        DB::beginTransaction();
        try {
            $mediaId = DB::table('media_assets')->insertGetId([
                'file_url' => $fileUrl,
                'title' => $request->input('title'),
                'alt_text' => null,
                'mime_type' => $request->input('mimeType'),
            ]);

            $videoId = DB::table('project_videos')->insertGetId([
                'project_id' => $projectId,
                'media_id' => $mediaId,
                'title' => $request->input('title'),
                'description' => $request->input('description'),
                'sort_order' => (int) $request->input('sortOrder', 0),
            ]);

            DB::commit();
            return response()->json(['id' => $videoId], 201);
        } catch (\Throwable) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to add video.'], 500);
        }
    }

    public function updateVideo(Request $request, string $id, string $videoId)
    {
        $projectId = (int) $id;
        $videoId = (int) $videoId;
        if ($projectId <= 0 || $videoId <= 0) {
            return response()->json(['error' => 'Invalid ids.'], 400);
        }

        $row = DB::table('project_videos')
            ->select('media_id')
            ->where('id', $videoId)
            ->where('project_id', $projectId)
            ->first();
        if (!$row) {
            return response()->json(['error' => 'Video not found.'], 404);
        }

        DB::beginTransaction();
        try {
            $videoUpdates = [];
            if ($request->has('title')) {
                $videoUpdates['title'] = $request->input('title');
            }
            if ($request->has('description')) {
                $videoUpdates['description'] = $request->input('description');
            }
            if ($request->has('sortOrder')) {
                $videoUpdates['sort_order'] = (int) $request->input('sortOrder');
            }
            if (!empty($videoUpdates)) {
                DB::table('project_videos')
                    ->where('id', $videoId)
                    ->where('project_id', $projectId)
                    ->update($videoUpdates);
            }

            $mediaUpdates = [];
            if ($request->has('fileUrl')) {
                $mediaUpdates['file_url'] = $request->input('fileUrl');
            }
            if ($request->has('mimeType')) {
                $mediaUpdates['mime_type'] = $request->input('mimeType');
            }
            if (!empty($mediaUpdates)) {
                DB::table('media_assets')->where('id', $row->media_id)->update($mediaUpdates);
            }

            DB::commit();
            return response()->json(['ok' => true]);
        } catch (\Throwable) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to update video.'], 500);
        }
    }

    public function destroyVideo(string $id, string $videoId)
    {
        $projectId = (int) $id;
        $videoId = (int) $videoId;
        if ($projectId <= 0 || $videoId <= 0) {
            return response()->json(['error' => 'Invalid ids.'], 400);
        }

        DB::beginTransaction();
        try {
            $row = DB::table('project_videos')
                ->select('media_id')
                ->where('id', $videoId)
                ->where('project_id', $projectId)
                ->first();
            if (!$row) {
                DB::rollBack();
                return response()->json(['error' => 'Video not found.'], 404);
            }

            DB::table('project_videos')->where('id', $videoId)->where('project_id', $projectId)->delete();

            $countRow = DB::select(
                'SELECT COUNT(*) AS total FROM project_videos WHERE media_id = ?',
                [$row->media_id]
            );
            $total = !empty($countRow) ? (int) $countRow[0]->total : 0;
            if ($total === 0) {
                DB::table('media_assets')->where('id', $row->media_id)->delete();
            }

            DB::commit();
            return response()->noContent();
        } catch (\Throwable) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to delete video.'], 500);
        }
    }
}
