<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PortfolioController extends Controller
{
    private function fetchDetail(int $portfolioId)
    {
        $rows = DB::select(
            "SELECT pe.id, pe.project_id, pe.title_override, pe.category, pe.summary, pe.autocad_url,
                    pe.sort_order, pe.is_visible, p.name AS project_name
             FROM portfolio_entries pe
             LEFT JOIN projects p ON p.id = pe.project_id
             WHERE pe.id = ?
             LIMIT 1",
            [$portfolioId]
        );
        $entry = !empty($rows) ? $rows[0] : null;
        if (!$entry) {
            return null;
        }

        $imageRows = DB::select(
            "SELECT pi.id, pi.media_id, pi.image_type, pi.sort_order,
                    m.file_url, m.title, m.alt_text
             FROM portfolio_images pi
             INNER JOIN media_assets m ON m.id = pi.media_id
             WHERE pi.portfolio_id = ?
             ORDER BY pi.sort_order ASC, pi.id ASC",
            [$portfolioId]
        );

        $cover = null;
        $hero = [];
        $gallery = [];
        foreach ($imageRows as $row) {
            $image = [
                'id' => $row->id,
                'mediaId' => $row->media_id,
                'fileUrl' => $row->file_url,
                'title' => $row->title ?? null,
                'altText' => $row->alt_text ?? null,
                'imageType' => $row->image_type,
                'sortOrder' => (int) $row->sort_order,
            ];
            if ($row->image_type === 'cover') {
                if ($cover === null) {
                    $cover = $image;
                }
            } elseif ($row->image_type === 'hero') {
                $hero[] = $image;
            } else {
                $gallery[] = $image;
            }
        }

        $specRows = DB::select(
            "SELECT id, label, value, sort_order
             FROM portfolio_specs
             WHERE portfolio_id = ?
             ORDER BY sort_order ASC, id ASC",
            [$portfolioId]
        );
        $specs = array_map(static function ($row) {
            return [
                'id' => $row->id,
                'label' => $row->label,
                'value' => $row->value,
                'sortOrder' => (int) $row->sort_order,
            ];
        }, $specRows);

        $tagRows = DB::select(
            "SELECT id, tag, sort_order
             FROM portfolio_tags
             WHERE portfolio_id = ?
             ORDER BY sort_order ASC, id ASC",
            [$portfolioId]
        );
        $tags = array_map(static function ($row) {
            return [
                'id' => $row->id,
                'tag' => $row->tag,
                'sortOrder' => (int) $row->sort_order,
            ];
        }, $tagRows);

        $blockRows = DB::select(
            "SELECT pb.id, pb.block_type, pb.text_content, pb.media_id, pb.caption,
                    pb.layout, pb.sort_order, pb.is_visible, m.file_url
             FROM portfolio_blocks pb
             LEFT JOIN media_assets m ON m.id = pb.media_id
             WHERE pb.portfolio_id = ?
             ORDER BY pb.sort_order ASC, pb.id ASC",
            [$portfolioId]
        );
        $blocks = array_map(static function ($row) {
            return [
                'id' => $row->id,
                'blockType' => $row->block_type,
                'textContent' => $row->text_content,
                'mediaId' => $row->media_id,
                'fileUrl' => $row->file_url ?? null,
                'caption' => $row->caption,
                'layout' => $row->layout,
                'sortOrder' => (int) $row->sort_order,
                'isVisible' => (bool) $row->is_visible,
            ];
        }, $blockRows);

        return [
            'id' => $entry->id,
            'projectId' => $entry->project_id,
            'projectName' => $entry->project_name ?? null,
            'titleOverride' => $entry->title_override ?? null,
            'category' => $entry->category ?? null,
            'summary' => $entry->summary ?? null,
            'autocadUrl' => $entry->autocad_url ?? null,
            'sortOrder' => (int) $entry->sort_order,
            'isVisible' => (bool) $entry->is_visible,
            'images' => [
                'cover' => $cover,
                'hero' => $hero,
                'gallery' => $gallery,
            ],
            'specs' => $specs,
            'tags' => $tags,
            'blocks' => $blocks,
        ];
    }

    public function publicList()
    {
        $rows = DB::select(
            "SELECT pe.id, pe.title_override, pe.category, pe.summary, pe.sort_order,
                    p.name AS project_name,
                    (
                      SELECT m.file_url
                      FROM portfolio_images pi
                      INNER JOIN media_assets m ON m.id = pi.media_id
                      WHERE pi.portfolio_id = pe.id AND pi.image_type IN ('cover', 'hero')
                      ORDER BY
                        CASE WHEN pi.image_type = 'cover' THEN 0 ELSE 1 END,
                        pi.sort_order ASC,
                        pi.id ASC
                      LIMIT 1
                    ) AS cover_url
             FROM portfolio_entries pe
             LEFT JOIN projects p ON p.id = pe.project_id
             WHERE pe.is_visible = 1
             ORDER BY pe.sort_order ASC, pe.id DESC"
        );

        $entries = array_map(static function ($row) {
            return [
                'id' => $row->id,
                'title' => $row->title_override ?: ($row->project_name ?: 'Proyecto'),
                'category' => $row->category ?? null,
                'description' => $row->summary ?? null,
                'coverImage' => $row->cover_url ?? null,
            ];
        }, $rows);

        return response()->json($entries);
    }

    public function publicDetail(string $id)
    {
        $portfolioId = (int) $id;
        if ($portfolioId <= 0) {
            return response()->json(['error' => 'Invalid portfolio id.'], 400);
        }

        $detail = $this->fetchDetail($portfolioId);
        if (!$detail || !$detail['isVisible']) {
            return response()->json(['error' => 'Portfolio entry not found.'], 404);
        }

        $heroImages = !empty($detail['images']['hero'])
            ? array_map(fn ($img) => $img['fileUrl'], $detail['images']['hero'])
            : ($detail['images']['cover'] ? [$detail['images']['cover']['fileUrl']] : []);

        return response()->json([
            'id' => $detail['id'],
            'title' => $detail['titleOverride'] ?: ($detail['projectName'] ?: 'Proyecto'),
            'category' => $detail['category'],
            'description' => $detail['summary'],
            'autocadUrl' => $detail['autocadUrl'],
            'heroImages' => array_values(array_filter($heroImages)),
            'coverImage' => $detail['images']['cover']['fileUrl'] ?? null,
            'gallery' => array_values(array_filter(array_map(fn ($img) => $img['fileUrl'], $detail['images']['gallery']))),
            'specs' => array_map(fn ($spec) => ['label' => $spec['label'], 'value' => $spec['value']], $detail['specs']),
            'tags' => array_map(fn ($tag) => $tag['tag'], $detail['tags']),
            'blocks' => array_map(fn ($block) => [
                'type' => $block['blockType'],
                'text' => $block['textContent'] ?? null,
                'src' => $block['fileUrl'] ?? null,
                'caption' => $block['caption'] ?? null,
                'layout' => $block['layout'] ?? 'inline',
            ], $detail['blocks']),
        ]);
    }

    public function adminList()
    {
        $rows = DB::select(
            "SELECT pe.id, pe.project_id, pe.sort_order, pe.is_visible, pe.title_override,
                    p.name AS project_name
             FROM portfolio_entries pe
             LEFT JOIN projects p ON p.id = pe.project_id
             ORDER BY pe.sort_order ASC, pe.id DESC"
        );

        $entries = array_map(static function ($row) {
            return [
                'id' => $row->id,
                'projectId' => $row->project_id,
                'order' => (int) $row->sort_order,
                'project' => $row->project_name ?? 'Sin proyecto',
                'visible' => (bool) $row->is_visible,
                'titleOverride' => $row->title_override,
            ];
        }, $rows);

        return response()->json($entries);
    }

    public function adminDetail(string $id)
    {
        $portfolioId = (int) $id;
        if ($portfolioId <= 0) {
            return response()->json(['error' => 'Invalid portfolio id.'], 400);
        }

        $detail = $this->fetchDetail($portfolioId);
        if (!$detail) {
            return response()->json(['error' => 'Portfolio entry not found.'], 404);
        }

        return response()->json($detail);
    }

    public function store(Request $request)
    {
        $projectId = $request->input('projectId');
        $projectId = $projectId ? (int) $projectId : null;
        $titleOverride = $request->input('titleOverride');
        $titleOverride = is_string($titleOverride) ? trim($titleOverride) : null;

        if ($projectId) {
            $projectExists = DB::table('projects')->where('id', $projectId)->exists();
            if (!$projectExists) {
                return response()->json(['error' => 'Project not found.'], 404);
            }
        } elseif (!$titleOverride) {
            return response()->json(['error' => 'Title is required for standalone portfolio entries.'], 422);
        }

        $category = $request->input('category');
        $summary = $request->input('summary');
        $sortOrder = $request->has('sortOrder') ? (int) $request->input('sortOrder') : 0;
        $isVisible = $request->has('isVisible') ? ($request->boolean('isVisible') ? 1 : 0) : 1;

        try {
            $id = DB::table('portfolio_entries')->insertGetId([
                'project_id' => $projectId,
                'title_override' => $titleOverride,
                'category' => is_string($category) ? trim($category) : null,
                'summary' => is_string($summary) ? trim($summary) : null,
                'sort_order' => $sortOrder,
                'is_visible' => $isVisible,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            return response()->json(['id' => $id], 201);
        } catch (\Throwable) {
            return response()->json(['error' => 'Failed to create portfolio entry.'], 500);
        }
    }

    public function destroy(string $id)
    {
        $portfolioId = (int) $id;
        if ($portfolioId <= 0) {
            return response()->json(['error' => 'Invalid portfolio id.'], 400);
        }

        $entry = DB::table('portfolio_entries')
            ->select('id', 'project_id')
            ->where('id', $portfolioId)
            ->first();

        if (!$entry) {
            return response()->json(['error' => 'Portfolio entry not found.'], 404);
        }

        if (!empty($entry->project_id)) {
            return response()->json(['error' => 'Use project portfolio delete for linked entries.'], 409);
        }

        try {
            DB::table('portfolio_entries')->where('id', $portfolioId)->delete();
            return response()->json(['ok' => true]);
        } catch (\Throwable) {
            return response()->json(['error' => 'Failed to delete portfolio entry.'], 500);
        }
    }

    public function update(Request $request, string $id)
    {
        $portfolioId = (int) $id;
        if ($portfolioId <= 0) {
            return response()->json(['error' => 'Invalid portfolio id.'], 400);
        }

        $entry = DB::table('portfolio_entries')->select('id')->where('id', $portfolioId)->first();
        if (!$entry) {
            return response()->json(['error' => 'Portfolio entry not found.'], 404);
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

        DB::beginTransaction();
        try {
            if (!empty($updates)) {
                DB::table('portfolio_entries')->where('id', $portfolioId)->update($updates);
            }

            $coverMediaId = $request->input('coverMediaId');
            $heroMediaIds = $request->input('heroMediaIds');
            $galleryMediaIds = $request->input('galleryMediaIds');
            if ($request->has('coverMediaId') || $request->has('heroMediaIds') || $request->has('galleryMediaIds')) {
                DB::table('portfolio_images')->where('portfolio_id', $portfolioId)->delete();

                if ($coverMediaId) {
                    DB::table('portfolio_images')->insert([
                        'portfolio_id' => $portfolioId,
                        'media_id' => $coverMediaId,
                        'image_type' => 'cover',
                        'sort_order' => 0,
                    ]);
                }
                if (is_array($heroMediaIds)) {
                    foreach (array_values($heroMediaIds) as $index => $mediaId) {
                        if (!$mediaId) {
                            continue;
                        }
                        DB::table('portfolio_images')->insert([
                            'portfolio_id' => $portfolioId,
                            'media_id' => $mediaId,
                            'image_type' => 'hero',
                            'sort_order' => $index,
                        ]);
                    }
                }
                if (is_array($galleryMediaIds)) {
                    foreach (array_values($galleryMediaIds) as $index => $mediaId) {
                        if (!$mediaId) {
                            continue;
                        }
                        DB::table('portfolio_images')->insert([
                            'portfolio_id' => $portfolioId,
                            'media_id' => $mediaId,
                            'image_type' => 'gallery',
                            'sort_order' => $index,
                        ]);
                    }
                }
            }

            if ($request->has('specs') && is_array($request->input('specs'))) {
                DB::table('portfolio_specs')->where('portfolio_id', $portfolioId)->delete();
                foreach (array_values($request->input('specs')) as $index => $spec) {
                    if (!isset($spec['label'], $spec['value']) || !$spec['label'] || !$spec['value']) {
                        continue;
                    }
                    DB::table('portfolio_specs')->insert([
                        'portfolio_id' => $portfolioId,
                        'label' => $spec['label'],
                        'value' => $spec['value'],
                        'sort_order' => $index,
                    ]);
                }
            }

            if ($request->has('tags') && is_array($request->input('tags'))) {
                DB::table('portfolio_tags')->where('portfolio_id', $portfolioId)->delete();
                foreach (array_values($request->input('tags')) as $index => $tag) {
                    if (!$tag) {
                        continue;
                    }
                    DB::table('portfolio_tags')->insert([
                        'portfolio_id' => $portfolioId,
                        'tag' => $tag,
                        'sort_order' => $index,
                    ]);
                }
            }

            if ($request->has('blocks') && is_array($request->input('blocks'))) {
                DB::table('portfolio_blocks')->where('portfolio_id', $portfolioId)->delete();
                foreach (array_values($request->input('blocks')) as $index => $block) {
                    if (!isset($block['blockType']) || !$block['blockType']) {
                        continue;
                    }
                    DB::table('portfolio_blocks')->insert([
                        'portfolio_id' => $portfolioId,
                        'block_type' => $block['blockType'],
                        'text_content' => $block['blockType'] === 'text' ? ($block['textContent'] ?? null) : null,
                        'media_id' => $block['blockType'] === 'image' ? ($block['mediaId'] ?? null) : null,
                        'caption' => $block['caption'] ?? null,
                        'layout' => $block['layout'] ?? 'inline',
                        'sort_order' => $index,
                        'is_visible' => array_key_exists('isVisible', $block) && $block['isVisible'] === false ? 0 : 1,
                    ]);
                }
            }

            DB::commit();
            return response()->json(['ok' => true]);
        } catch (\Throwable) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to update portfolio entry.'], 500);
        }
    }
}
