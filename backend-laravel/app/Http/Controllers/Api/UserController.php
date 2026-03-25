<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Users\StoreUserRequest;
use App\Http\Requests\Users\UpdateUserRequest;
use App\Http\Requests\Users\UpdateUserStatusRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index()
    {
        $rows = DB::select(
            'SELECT u.id, u.email, u.full_name, u.is_active,
                    GROUP_CONCAT(r.name) AS roles
             FROM users u
             LEFT JOIN user_roles ur ON ur.user_id = u.id
             LEFT JOIN roles r ON r.id = ur.role_id
             GROUP BY u.id
             ORDER BY u.id DESC'
        );

        $users = array_map(static function ($row) {
            return [
                'id' => $row->id,
                'email' => $row->email,
                'fullName' => $row->full_name,
                'active' => (bool) $row->is_active,
                'roles' => $row->roles ? explode(',', (string) $row->roles) : [],
            ];
        }, $rows);

        return response()->json($users);
    }

    public function store(StoreUserRequest $request)
    {
        $data = $request->validated();

        $existing = DB::table('users')->select('id')->where('email', $data['email'])->first();
        if ($existing) {
            return response()->json(['error' => 'Email already exists.'], 409);
        }

        $roleRows = DB::table('roles')->select('id', 'name')->get();
        $roleMap = [];
        foreach ($roleRows as $row) {
            $roleMap[$row->name] = $row->id;
        }

        $roleList = isset($data['roles']) && is_array($data['roles']) && count($data['roles']) > 0
            ? $data['roles']
            : ['client'];
        $roleIds = array_values(array_filter(array_map(fn ($role) => $roleMap[$role] ?? null, $roleList)));
        if (empty($roleIds)) {
            return response()->json(['error' => 'Invalid roles.'], 400);
        }

        return DB::transaction(function () use ($data, $roleIds) {
            $userId = DB::table('users')->insertGetId([
                'email' => $data['email'],
                'password_hash' => Hash::make($data['password']),
                'full_name' => $data['fullName'],
                'is_active' => 1,
            ]);

            foreach ($roleIds as $roleId) {
                DB::table('user_roles')->insert([
                    'user_id' => $userId,
                    'role_id' => $roleId,
                ]);
            }

            return response()->json(['id' => $userId], 201);
        });
    }

    public function update(UpdateUserRequest $request, string $id)
    {
        $userId = (int) $id;
        if ($userId <= 0) {
            return response()->json(['error' => 'Invalid user id.'], 400);
        }

        $data = $request->validated();

        $currentUser = DB::table('users')
            ->select('id', 'email', 'is_active')
            ->where('id', $userId)
            ->first();

        if (!$currentUser) {
            return response()->json(['error' => 'User not found.'], 404);
        }

        $existing = DB::table('users')
            ->select('id')
            ->where('email', $data['email'])
            ->where('id', '<>', $userId)
            ->first();

        if ($existing) {
            return response()->json(['error' => 'Email already exists.'], 409);
        }

        $roleRows = DB::table('roles')->select('id', 'name')->get();
        $roleMap = [];
        foreach ($roleRows as $row) {
            $roleMap[$row->name] = $row->id;
        }

        $roleList = isset($data['roles']) && is_array($data['roles']) && count($data['roles']) > 0
            ? $data['roles']
            : ['client'];
        $roleIds = array_values(array_filter(array_map(fn ($role) => $roleMap[$role] ?? null, $roleList)));
        if (empty($roleIds)) {
            return response()->json(['error' => 'Invalid roles.'], 400);
        }

        $currentRoles = DB::table('roles as r')
            ->join('user_roles as ur', 'ur.role_id', '=', 'r.id')
            ->where('ur.user_id', $userId)
            ->pluck('r.name')
            ->values()
            ->all();

        $isRemovingLastActiveAdmin =
            (bool) $currentUser->is_active &&
            in_array('admin', $currentRoles, true) &&
            !in_array('admin', $roleList, true);

        if ($isRemovingLastActiveAdmin) {
            $countRows = DB::select(
                'SELECT COUNT(DISTINCT u.id) AS total
                 FROM users u
                 INNER JOIN user_roles ur ON ur.user_id = u.id
                 INNER JOIN roles r ON r.id = ur.role_id
                 WHERE r.name = ? AND u.is_active = 1 AND u.id <> ?',
                ['admin', $userId]
            );
            $totalAdmins = !empty($countRows) ? (int) $countRows[0]->total : 0;
            if ($totalAdmins === 0) {
                return response()->json(['error' => 'Debe existir al menos un admin activo.'], 409);
            }
        }

        return DB::transaction(function () use ($data, $roleIds, $userId) {
            $updateData = [
                'email' => $data['email'],
                'full_name' => $data['fullName'],
            ];

            if (!empty($data['password'])) {
                $updateData['password_hash'] = Hash::make($data['password']);
            }

            DB::table('users')->where('id', $userId)->update($updateData);

            DB::table('user_roles')->where('user_id', $userId)->delete();

            foreach ($roleIds as $roleId) {
                DB::table('user_roles')->insert([
                    'user_id' => $userId,
                    'role_id' => $roleId,
                ]);
            }

            return response()->json(['ok' => true]);
        });
    }

    public function setStatus(UpdateUserStatusRequest $request, string $id)
    {
        $userId = (int) $id;
        if ($userId <= 0) {
            return response()->json(['error' => 'Invalid user id.'], 400);
        }

        $active = (bool) $request->validated()['active'];

        if ($active === false) {
            $isAdmin = DB::select(
                'SELECT 1
                 FROM user_roles ur
                 INNER JOIN roles r ON r.id = ur.role_id
                 WHERE ur.user_id = ? AND r.name = ? LIMIT 1',
                [$userId, 'admin']
            );
            if (!empty($isAdmin)) {
                $countRows = DB::select(
                    'SELECT COUNT(DISTINCT u.id) AS total
                     FROM users u
                     INNER JOIN user_roles ur ON ur.user_id = u.id
                     INNER JOIN roles r ON r.id = ur.role_id
                     WHERE r.name = ? AND u.is_active = 1 AND u.id <> ?',
                    ['admin', $userId]
                );
                $totalAdmins = !empty($countRows) ? (int) $countRows[0]->total : 0;
                if ($totalAdmins === 0) {
                    return response()->json(['error' => 'Debe existir al menos un admin activo.'], 409);
                }
            }
        }

        $affected = DB::table('users')->where('id', $userId)->update(['is_active' => $active ? 1 : 0]);
        if ($affected === 0) {
            return response()->json(['error' => 'User not found.'], 404);
        }

        return response()->json(['ok' => true]);
    }
}
