<?php
header('Content-Type: application/json');

$jsonFile = __DIR__ . '/../JSON/accounts.json';

if (file_exists($jsonFile)) {
    echo file_get_contents($jsonFile);
} else {
    echo json_encode([]);
}
?>
