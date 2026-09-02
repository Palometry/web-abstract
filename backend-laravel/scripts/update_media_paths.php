<?php
$pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=arqui_nelson;charset=utf8mb4', 'root', 'lunera12');
$from = 'backend-laravel\\uploads/portfolio';
$to = 'backend-laravel\\public\\uploads\\portfolio';
$sql = "UPDATE media_assets SET file_path = REPLACE(file_path, :from, :to) WHERE file_path LIKE :like";
$stmt = $pdo->prepare($sql);
$like = '%backend-laravel\\\\uploads/portfolio%';
$stmt->execute([':from' => $from, ':to' => $to, ':like' => $like]);
echo $stmt->rowCount();
