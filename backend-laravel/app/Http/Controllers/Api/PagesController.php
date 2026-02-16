<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\QueryException;

class PagesController extends Controller
{
    private function parseJson($value)
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            return json_last_error() === JSON_ERROR_NONE ? $decoded : $value;
        }
        return $value;
    }

    private function buildPublicPayload($page): array
    {
        $sections = DB::table('page_sections')
            ->select('id', 'section_key', 'title', 'description', 'image_url', 'sort_order', 'is_visible')
            ->where('page_id', $page->id)
            ->where('is_visible', 1)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn ($row) => [
                'id' => $row->id,
                'sectionKey' => $row->section_key,
                'title' => $row->title,
                'description' => $row->description,
                'imageUrl' => $row->image_url,
                'sortOrder' => (int) $row->sort_order,
                'isVisible' => (bool) $row->is_visible,
                'blocks' => [],
            ])
            ->all();

        $sectionIds = array_map(fn ($section) => $section['id'], $sections);
        $blocksBySection = [];
        if (!empty($sectionIds)) {
            $rows = DB::table('section_blocks')
                ->select('id', 'section_id', 'block_type', 'content_json', 'sort_order', 'is_visible')
                ->whereIn('section_id', $sectionIds)
                ->where('is_visible', 1)
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get();

            foreach ($rows as $row) {
                $blocksBySection[$row->section_id][] = [
                    'id' => $row->id,
                    'blockType' => $row->block_type,
                    'content' => $this->parseJson($row->content_json),
                    'sortOrder' => (int) $row->sort_order,
                    'isVisible' => (bool) $row->is_visible,
                ];
            }
        }

        $resultSections = array_map(function ($section) use ($blocksBySection) {
            $section['blocks'] = $blocksBySection[$section['id']] ?? [];
            return $section;
        }, $sections);

        return [
            'id' => $page->id,
            'title' => $page->title,
            'slug' => $page->slug,
            'status' => $page->status,
            'metaTitle' => $page->meta_title,
            'metaDescription' => $page->meta_description,
            'isHome' => (bool) ($page->is_home ?? false),
            'sections' => $resultSections,
        ];
    }

    public function publicHome()
    {
        $page = DB::table('pages')
            ->select('id', 'title', 'slug', 'status', 'meta_title', 'meta_description', 'is_home')
            ->where('status', 'published')
            ->where('is_home', 1)
            ->limit(1)
            ->first();

        if (!$page) {
            $page = DB::table('pages')
                ->select('id', 'title', 'slug', 'status', 'meta_title', 'meta_description', 'is_home')
                ->where('status', 'published')
                ->orderBy('id')
                ->limit(1)
                ->first();
        }

        if (!$page) {
            return response()->json(['error' => 'Page not found.'], 404);
        }

        return response()->json($this->buildPublicPayload($page));
    }

    public function publicBySlug(string $slug)
    {
        $slug = trim($slug);
        if ($slug === '') {
            return response()->json(['error' => 'Invalid slug.'], 400);
        }

        $page = DB::table('pages')
            ->select('id', 'title', 'slug', 'status', 'meta_title', 'meta_description', 'is_home')
            ->where('slug', $slug)
            ->where('status', 'published')
            ->limit(1)
            ->first();

        if (!$page) {
            return response()->json(['error' => 'Page not found.'], 404);
        }

        return response()->json($this->buildPublicPayload($page));
    }

    public function index()
    {
        $rows = DB::select(
            'SELECT p.id, p.title, p.slug, p.status, MAX(p.is_home) AS is_home, COUNT(ps.id) AS sections
             FROM pages p
             LEFT JOIN page_sections ps ON ps.page_id = p.id
             GROUP BY p.id
             ORDER BY p.id DESC'
        );

        $pages = array_map(static function ($row) {
            return [
                'id' => $row->id,
                'title' => $row->title,
                'slug' => $row->slug,
                'status' => $row->status,
                'isHome' => (bool) $row->is_home,
                'sections' => (int) $row->sections,
            ];
        }, $rows);

        return response()->json($pages);
    }

    public function store(Request $request)
    {
        $title = $request->input('title');
        $slug = $request->input('slug');
        if (!$title || !$slug) {
            return response()->json(['error' => 'Title and slug are required.'], 400);
        }

        $isHome = $request->boolean('isHome');

        try {
            DB::beginTransaction();
            if ($isHome) {
                DB::table('pages')->update(['is_home' => 0]);
            }
            $id = DB::table('pages')->insertGetId([
                'title' => $title,
                'slug' => $slug,
                'status' => $request->input('status', 'draft'),
                'is_home' => $isHome ? 1 : 0,
                'meta_title' => $request->input('metaTitle'),
                'meta_description' => $request->input('metaDescription'),
            ]);
            DB::commit();
            return response()->json(['id' => $id], 201);
        } catch (QueryException $e) {
            DB::rollBack();
            if ($e->getCode() === '23000') {
                return response()->json(['error' => 'Slug already exists.'], 409);
            }
            return response()->json(['error' => 'Failed to create page.'], 500);
        }
    }

    public function show(string $id)
    {
        $pageId = (int) $id;
        if ($pageId <= 0) {
            return response()->json(['error' => 'Invalid page id.'], 400);
        }

        $page = DB::table('pages')
            ->select('id', 'title', 'slug', 'status', 'meta_title', 'meta_description', 'is_home')
            ->where('id', $pageId)
            ->limit(1)
            ->first();

        if (!$page) {
            return response()->json(['error' => 'Page not found.'], 404);
        }

        $sections = DB::table('page_sections')
            ->select('id', 'section_key', 'title', 'description', 'image_url', 'sort_order', 'is_visible')
            ->where('page_id', $pageId)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn ($row) => [
                'id' => $row->id,
                'sectionKey' => $row->section_key,
                'title' => $row->title,
                'description' => $row->description,
                'imageUrl' => $row->image_url,
                'sortOrder' => (int) $row->sort_order,
                'isVisible' => (bool) $row->is_visible,
                'blocks' => [],
            ])
            ->all();

        $sectionIds = array_map(fn ($section) => $section['id'], $sections);
        $blocksBySection = [];
        if (!empty($sectionIds)) {
            $rows = DB::table('section_blocks')
                ->select('id', 'section_id', 'block_type', 'content_json', 'sort_order', 'is_visible')
                ->whereIn('section_id', $sectionIds)
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get();

            foreach ($rows as $row) {
                $blocksBySection[$row->section_id][] = [
                    'id' => $row->id,
                    'blockType' => $row->block_type,
                    'content' => $this->parseJson($row->content_json),
                    'sortOrder' => (int) $row->sort_order,
                    'isVisible' => (bool) $row->is_visible,
                ];
            }
        }

        $resultSections = array_map(function ($section) use ($blocksBySection) {
            $section['blocks'] = $blocksBySection[$section['id']] ?? [];
            return $section;
        }, $sections);

        return response()->json([
            'id' => $page->id,
            'title' => $page->title,
            'slug' => $page->slug,
            'status' => $page->status,
            'metaTitle' => $page->meta_title,
            'metaDescription' => $page->meta_description,
            'isHome' => (bool) $page->is_home,
            'sections' => $resultSections,
        ]);
    }

    public function update(Request $request, string $id)
    {
        $pageId = (int) $id;
        if ($pageId <= 0) {
            return response()->json(['error' => 'Invalid page id.'], 400);
        }

        $updates = [];
        foreach (['title' => 'title', 'slug' => 'slug', 'status' => 'status'] as $key => $column) {
            if ($request->has($key)) {
                $updates[$column] = $request->input($key);
            }
        }
        if ($request->has('isHome')) {
            $updates['is_home'] = $request->boolean('isHome') ? 1 : 0;
        }
        if ($request->has('metaTitle')) {
            $updates['meta_title'] = $request->input('metaTitle');
        }
        if ($request->has('metaDescription')) {
            $updates['meta_description'] = $request->input('metaDescription');
        }

        if (empty($updates)) {
            return response()->json(['error' => 'No fields to update.'], 400);
        }

        try {
            DB::beginTransaction();
            if (array_key_exists('is_home', $updates) && $updates['is_home']) {
                DB::table('pages')->where('id', '!=', $pageId)->update(['is_home' => 0]);
            }
            DB::table('pages')->where('id', $pageId)->update($updates);
            DB::commit();
            return response()->json(['ok' => true]);
        } catch (QueryException $e) {
            DB::rollBack();
            if ($e->getCode() === '23000') {
                return response()->json(['error' => 'Slug already exists.'], 409);
            }
            return response()->json(['error' => 'Failed to update page.'], 500);
        }
    }

    public function destroy(string $id)
    {
        $pageId = (int) $id;
        if ($pageId <= 0) {
            return response()->json(['error' => 'Invalid page id.'], 400);
        }

        DB::beginTransaction();
        try {
            $sectionIds = DB::table('page_sections')
                ->where('page_id', $pageId)
                ->pluck('id')
                ->values()
                ->all();

            if (!empty($sectionIds)) {
                DB::table('section_blocks')->whereIn('section_id', $sectionIds)->delete();
            }
            DB::table('page_sections')->where('page_id', $pageId)->delete();
            $affected = DB::table('pages')->where('id', $pageId)->delete();
            DB::commit();
            if ($affected === 0) {
                return response()->json(['error' => 'Page not found.'], 404);
            }
            return response()->noContent();
        } catch (\Throwable) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to delete page.'], 500);
        }
    }

    public function listSections(string $id)
    {
        $pageId = (int) $id;
        if ($pageId <= 0) {
            return response()->json(['error' => 'Invalid page id.'], 400);
        }

        $rows = DB::table('page_sections')
            ->select('id', 'section_key', 'title', 'description', 'image_url', 'sort_order', 'is_visible')
            ->where('page_id', $pageId)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $sections = $rows->map(fn ($row) => [
            'id' => $row->id,
            'sectionKey' => $row->section_key,
            'title' => $row->title,
            'description' => $row->description,
            'imageUrl' => $row->image_url,
            'sortOrder' => (int) $row->sort_order,
            'isVisible' => (bool) $row->is_visible,
        ]);

        return response()->json($sections);
    }

    public function storeSection(Request $request, string $id)
    {
        $pageId = (int) $id;
        if ($pageId <= 0) {
            return response()->json(['error' => 'Invalid page id.'], 400);
        }

        $sectionKey = trim((string) $request->input('sectionKey', ''));
        if ($sectionKey === '') {
            return response()->json(['error' => 'sectionKey is required.'], 400);
        }

        $page = DB::table('pages')->select('id')->where('id', $pageId)->first();
        if (!$page) {
            return response()->json(['error' => 'Page not found.'], 404);
        }

        try {
            $id = DB::table('page_sections')->insertGetId([
                'page_id' => $pageId,
                'section_key' => $sectionKey,
                'title' => $request->input('title'),
                'description' => $request->input('description'),
                'image_url' => $request->input('imageUrl'),
                'sort_order' => (int) $request->input('sortOrder', 0),
                'is_visible' => $request->boolean('isVisible') ? 1 : 0,
            ]);
            return response()->json(['id' => $id], 201);
        } catch (QueryException $e) {
            if ($e->getCode() === '23000') {
                return response()->json(['error' => 'sectionKey already exists for this page.'], 409);
            }
            return response()->json(['error' => 'Failed to create section.'], 500);
        }
    }

    public function updateSection(Request $request, string $id)
    {
        $sectionId = (int) $id;
        if ($sectionId <= 0) {
            return response()->json(['error' => 'Invalid section id.'], 400);
        }

        $updates = [];
        if ($request->has('sectionKey')) {
            $sectionKey = trim((string) $request->input('sectionKey', ''));
            if ($sectionKey === '') {
                return response()->json(['error' => 'sectionKey is required.'], 400);
            }
            $updates['section_key'] = $sectionKey;
        }
        foreach (['title' => 'title', 'description' => 'description'] as $key => $column) {
            if ($request->has($key)) {
                $updates[$column] = $request->input($key);
            }
        }
        if ($request->has('imageUrl')) {
            $updates['image_url'] = $request->input('imageUrl');
        }
        if ($request->has('sortOrder')) {
            $updates['sort_order'] = (int) $request->input('sortOrder');
        }
        if ($request->has('isVisible')) {
            $updates['is_visible'] = $request->boolean('isVisible') ? 1 : 0;
        }

        if (empty($updates)) {
            return response()->json(['error' => 'No fields to update.'], 400);
        }

        try {
            DB::table('page_sections')->where('id', $sectionId)->update($updates);
            return response()->json(['ok' => true]);
        } catch (QueryException $e) {
            if ($e->getCode() === '23000') {
                return response()->json(['error' => 'sectionKey already exists for this page.'], 409);
            }
            return response()->json(['error' => 'Failed to update section.'], 500);
        }
    }

    public function destroySection(string $id)
    {
        $sectionId = (int) $id;
        if ($sectionId <= 0) {
            return response()->json(['error' => 'Invalid section id.'], 400);
        }

        DB::beginTransaction();
        try {
            DB::table('section_blocks')->where('section_id', $sectionId)->delete();
            $affected = DB::table('page_sections')->where('id', $sectionId)->delete();
            DB::commit();
            if ($affected === 0) {
                return response()->json(['error' => 'Section not found.'], 404);
            }
            return response()->noContent();
        } catch (\Throwable) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to delete section.'], 500);
        }
    }

    public function listBlocks(string $id)
    {
        $sectionId = (int) $id;
        if ($sectionId <= 0) {
            return response()->json(['error' => 'Invalid section id.'], 400);
        }

        $rows = DB::table('section_blocks')
            ->select('id', 'block_type', 'content_json', 'sort_order', 'is_visible')
            ->where('section_id', $sectionId)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $blocks = $rows->map(fn ($row) => [
            'id' => $row->id,
            'blockType' => $row->block_type,
            'content' => $this->parseJson($row->content_json),
            'sortOrder' => (int) $row->sort_order,
            'isVisible' => (bool) $row->is_visible,
        ]);

        return response()->json($blocks);
    }

    public function storeBlock(Request $request, string $id)
    {
        $sectionId = (int) $id;
        if ($sectionId <= 0) {
            return response()->json(['error' => 'Invalid section id.'], 400);
        }

        $blockType = $request->input('blockType');
        if (!$blockType) {
            return response()->json(['error' => 'blockType is required.'], 400);
        }

        $section = DB::table('page_sections')->select('id')->where('id', $sectionId)->first();
        if (!$section) {
            return response()->json(['error' => 'Section not found.'], 404);
        }

        $content = $request->input('content');
        $contentJson = is_string($content) ? $content : json_encode($content ?? new \stdClass());

        $id = DB::table('section_blocks')->insertGetId([
            'section_id' => $sectionId,
            'block_type' => $blockType,
            'content_json' => $contentJson,
            'sort_order' => (int) $request->input('sortOrder', 0),
            'is_visible' => $request->boolean('isVisible') ? 1 : 0,
        ]);

        return response()->json(['id' => $id], 201);
    }

    public function updateBlock(Request $request, string $id)
    {
        $blockId = (int) $id;
        if ($blockId <= 0) {
            return response()->json(['error' => 'Invalid block id.'], 400);
        }

        $updates = [];
        if ($request->has('blockType')) {
            $updates['block_type'] = $request->input('blockType');
        }
        if ($request->has('content')) {
            $content = $request->input('content');
            $updates['content_json'] = is_string($content) ? $content : json_encode($content ?? new \stdClass());
        }
        if ($request->has('sortOrder')) {
            $updates['sort_order'] = (int) $request->input('sortOrder');
        }
        if ($request->has('isVisible')) {
            $updates['is_visible'] = $request->boolean('isVisible') ? 1 : 0;
        }

        if (empty($updates)) {
            return response()->json(['error' => 'No fields to update.'], 400);
        }

        DB::table('section_blocks')->where('id', $blockId)->update($updates);
        return response()->json(['ok' => true]);
    }

    public function destroyBlock(string $id)
    {
        $blockId = (int) $id;
        if ($blockId <= 0) {
            return response()->json(['error' => 'Invalid block id.'], 400);
        }

        $affected = DB::table('section_blocks')->where('id', $blockId)->delete();
        if ($affected === 0) {
            return response()->json(['error' => 'Block not found.'], 404);
        }
        return response()->noContent();
    }
}
