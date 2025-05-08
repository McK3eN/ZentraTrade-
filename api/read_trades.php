<?php
header('Content-Type: application/json');

// Correct ici pour aller chercher dans /JSON/
$jsonFile = __DIR__ . '/../JSON/trades_data.json';

if (!file_exists($jsonFile)) {
    echo json_encode(["error" => "❌ File not found"]);
    exit;
}

$jsonContent = file_get_contents($jsonFile);

if (empty($jsonContent)) {
    echo json_encode(["error" => "📭 File is empty"]);
    exit;
}

echo $jsonContent;
?>
