<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

$rawInput = file_get_contents('php://input');
$config = json_decode($rawInput, true);

if (json_last_error() === JSON_ERROR_NONE && !empty($config)) {
    $jsonPath = '../JSON/accounts.json';
    $logDir = '../LOG';
    $logPath = $logDir . '/accounts_log.txt';

    // Assurer que le dossier LOG existe
    if (!is_dir($logDir)) {
        mkdir($logDir, 0777, true);
    }

    // Charger comptes existants
    $existingAccounts = [];
    if (file_exists($jsonPath)) {
        $existingAccounts = json_decode(file_get_contents($jsonPath), true);
        if (!is_array($existingAccounts)) {
            $existingAccounts = [];
        }
    }

    // Mettre à jour ou ajouter le compte
    $existingAccounts = array_filter($existingAccounts, function($account) use ($config) {
        return $account['accountName'] !== $config['accountName'];
    });
    $existingAccounts[] = $config;

    // Sauvegarder les comptes
    file_put_contents($jsonPath, json_encode(array_values($existingAccounts), JSON_PRETTY_PRINT));

    // 🔥 Traiter le fichier de LOG
    $oldLog = file_exists($logPath) ? file_get_contents($logPath) : '';

    // Séparer les anciennes entrées
    $blocks = preg_split('/===== Sauvegarde du .*? =====\n/', $oldLog, -1, PREG_SPLIT_NO_EMPTY | PREG_SPLIT_DELIM_CAPTURE);

    $newLogContent = '';
    foreach ($blocks as $block) {
        if (stripos($block, 'AccountName: ' . $config['accountName']) === false) {
            $newLogContent .= "===== Sauvegarde du " . date('d-m-Y H:i:s') . " =====\n" . trim($block) . "\n\n";
        }
    }

    // 🔥 Créer la NOUVELLE entrée de sauvegarde
    $newEntry = "===== Sauvegarde du " . date('d-m-Y H:i:s') . " =====\n";
    foreach ($config as $key => $value) {
        if (!is_string($key)) continue; // Ignorer si la clé est bizarre
        if (is_array($value)) $value = json_encode($value); // Convertir les arrays

        if ($value === "" || $value === null) continue; // Ne pas écrire si vide

        $newEntry .= ucfirst($key) . ': ' . (is_bool($value) ? ($value ? 'Oui' : 'Non') : $value) . "\n";
    }
    $newEntry .= "----------------------------------------\n\n"; // Finir proprement le bloc

    // 🔥🔥 Ajouter la nouvelle sauvegarde au contenu du log
    $newLogContent .= $newEntry;

    // 🔥 Sauvegarder tout dans le fichier log
    file_put_contents($logPath, $newLogContent);

    echo json_encode(['success' => true]);
} else {
    file_put_contents('../LOG/debug_error.txt', "Erreur JSON: " . json_last_error_msg() . "\nContenu brut:\n" . $rawInput);
    echo json_encode(['success' => false, 'message' => 'Erreur lors du décodage JSON']);
}
?>
