<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function public()
    {
        $activeProjectsRows = DB::select("SELECT COUNT(*) AS total FROM projects WHERE status = 'active'");
        $newQuotesRows = DB::select("SELECT COUNT(*) AS total FROM quotes WHERE status = 'new'");

        $activeProjects = !empty($activeProjectsRows) ? (int) $activeProjectsRows[0]->total : 0;
        $newQuotes = !empty($newQuotesRows) ? (int) $newQuotesRows[0]->total : 0;

        return response()->json([
            'activeProjects' => $activeProjects,
            'newQuotes' => $newQuotes,
        ]);
    }

    public function admin()
    {
        $activeProjectsRows = DB::select("SELECT COUNT(*) AS total FROM projects WHERE status = 'active'");
        $newQuotesRows = DB::select("SELECT COUNT(*) AS total FROM quotes WHERE status = 'new'");
        $sentQuotesRows = DB::select("SELECT COUNT(*) AS total FROM quotes WHERE status = 'sent'");
        $publishedPagesRows = DB::select("SELECT COUNT(*) AS total FROM pages WHERE status = 'published'");

        $activeProjects = !empty($activeProjectsRows) ? (int) $activeProjectsRows[0]->total : 0;
        $newQuotes = !empty($newQuotesRows) ? (int) $newQuotesRows[0]->total : 0;
        $sentQuotes = !empty($sentQuotesRows) ? (int) $sentQuotesRows[0]->total : 0;
        $publishedPages = !empty($publishedPagesRows) ? (int) $publishedPagesRows[0]->total : 0;

        $activityRows = DB::select(
            "SELECT type, happened_at, message
             FROM (
               SELECT 'quote' AS type, q.created_at AS happened_at,
                      CONCAT('Cotizacion: ', q.project_name, ' (', q.status, ')') AS message
               FROM quotes q
               UNION ALL
               SELECT 'project' AS type, p.created_at AS happened_at,
                      CONCAT('Proyecto: ', p.name, ' (', p.status, ')') AS message
               FROM projects p
               UNION ALL
               SELECT 'page' AS type, p.updated_at AS happened_at,
                      CONCAT('Pagina: ', p.title, ' (', p.status, ')') AS message
               FROM pages p
             ) AS activity
             ORDER BY happened_at DESC
             LIMIT 6"
        );

        $activity = array_map(static function ($row) {
            return [
                'type' => $row->type,
                'message' => $row->message,
                'happenedAt' => $row->happened_at,
            ];
        }, $activityRows);

        return response()->json([
            'stats' => [
                'activeProjects' => $activeProjects,
                'newQuotes' => $newQuotes,
                'sentQuotes' => $sentQuotes,
                'publishedPages' => $publishedPages,
            ],
            'activity' => $activity,
        ]);
    }
}
