<?php

namespace Tests\Feature\Security;

use Firebase\JWT\JWT;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class ApiSecurityTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set('jwt.secret', str_repeat('s', 48));
        config()->set('jwt.expires_in', '12h');
    }

    public function test_admin_endpoints_require_authentication(): void
    {
        $response = $this->getJson('/api/users');

        $response->assertStatus(401);
    }

    public function test_expired_token_is_rejected(): void
    {
        $token = $this->makeToken(10, ['admin'], time() - 60);

        $response = $this->withToken($token)->getJson('/api/auth/me');

        $response->assertStatus(401);
    }

    public function test_user_listing_rejects_users_without_the_required_role(): void
    {
        $editorResponse = $this
            ->withToken($this->makeToken(20, ['editor']))
            ->getJson('/api/users');

        $editorResponse->assertStatus(403);
    }

    public function test_contact_endpoint_rejects_invalid_payload(): void
    {
        $response = $this->postJson('/api/contact', [
            'fullName' => '',
            'email' => '',
            'phone' => '',
            'message' => '',
        ]);

        $response->assertStatus(422);
    }

    public function test_contact_endpoint_is_rate_limited(): void
    {
        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->postJson('/api/contact', [
                'fullName' => '',
                'email' => '',
                'phone' => '',
                'message' => '',
            ])->assertStatus(422);
        }

        $response = $this->postJson('/api/contact', [
            'fullName' => '',
            'email' => '',
            'phone' => '',
            'message' => '',
        ]);

        $response
            ->assertStatus(429)
            ->assertJson(['error' => 'Too many contact requests.']);
    }

    public function test_login_fails_fast_when_jwt_secret_is_not_securely_configured(): void
    {
        config()->set('jwt.secret', 'change_me');

        $response = $this->postJson('/api/auth/login', [
            'email' => 'admin@example.com',
            'password' => 'whatever',
        ]);

        $response
            ->assertStatus(500)
            ->assertJson(['error' => 'JWT not configured securely.']);
    }

    public function test_media_file_upload_rejects_php_files(): void
    {
        $response = $this
            ->withToken($this->makeToken(30, ['admin']))
            ->post('/api/media/file', [
                'file' => UploadedFile::fake()->create('shell.php', 1, 'application/x-php'),
            ], ['Accept' => 'application/json']);

        $response->assertStatus(422);
    }

    public function test_media_base64_upload_rejects_html_payloads(): void
    {
        $response = $this
            ->withToken($this->makeToken(40, ['admin']))
            ->postJson('/api/media', [
                'filename' => 'payload.html',
                'data' => 'data:text/html;base64,' . base64_encode('<script>alert(1)</script>'),
            ]);

        $response->assertStatus(422);
    }

    private function makeToken(int $userId, array $roles, ?int $exp = null): string
    {
        $expiresAt = $exp ?? (time() + 3600);

        return JWT::encode([
            'id' => $userId,
            'email' => 'security@example.com',
            'roles' => $roles,
            'iat' => time(),
            'exp' => $expiresAt,
        ], (string) config('jwt.secret'), 'HS256');
    }
}
