<?php
$pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=arqui_nelson;charset=utf8mb4', 'root', 'lunera12');

if (!extension_loaded('gd') || !function_exists('imagewebp')) {
    fwrite(STDERR, "GD extension not enabled. Enable extension=gd in php.ini and rerun.\n");
    exit(2);
}

$baseDir = __DIR__ . '/../public/uploads/portfolio';
if (!is_dir($baseDir)) {
    fwrite(STDERR, "Directory not found: {$baseDir}\n");
    exit(1);
}

$files = glob($baseDir . '/*');
$converted = 0;
foreach ($files as $file) {
    if (!is_file($file)) {
        continue;
    }
    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    if ($ext === 'webp') {
        continue;
    }

    $data = @file_get_contents($file);
    if ($data === false) {
        continue;
    }

    $img = @imagecreatefromstring($data);
    if (!$img) {
        continue;
    }

    $webpPath = preg_replace('/\.[^.]+$/', '.webp', $file);
    if (!$webpPath) {
        imagedestroy($img);
        continue;
    }

    imagewebp($img, $webpPath, 82);
    imagedestroy($img);

    $relative = str_replace('\\', '/', str_replace(__DIR__ . '/../public/', '', $webpPath));
    $urlBase = 'http://localhost:8000/';
    $url = $urlBase . ltrim($relative, '/');

    $stmt = $pdo->prepare('UPDATE media_assets SET file_url = :url, file_path = :path, mime_type = :mime, file_size = :size WHERE file_path = :oldPath');
    $stmt->execute([
        ':url' => $url,
        ':path' => $webpPath,
        ':mime' => 'image/webp',
        ':size' => filesize($webpPath),
        ':oldPath' => $file,
    ]);

    $converted++;
}

echo "Converted: {$converted}\n";
