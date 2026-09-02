<?php
$pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=arqui_nelson;charset=utf8mb4', 'root', 'lunera12');
$stmt = $pdo->query("SELECT COUNT(*) AS total, SUM(file_path LIKE '%backend-laravel\\\\uploads\\\\%') AS legacy FROM media_assets");
$row = $stmt->fetch(PDO::FETCH_ASSOC);
print_r($row);
