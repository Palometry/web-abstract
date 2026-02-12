<?php
$pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=arqui_nelson;charset=utf8mb4', 'root', 'lunera12');
$stmt = $pdo->query("SELECT id, file_path, file_url FROM media_assets LIMIT 5");
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo $row['id'] . " | " . $row['file_path'] . " | " . $row['file_url'] . "\n";
}
