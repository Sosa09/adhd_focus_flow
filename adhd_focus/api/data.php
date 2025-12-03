<?php
// api/data.php

// 1. ENABLE ERROR REPORTING (So you can see if something else breaks)
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

header("Content-Type: application/json");

// --- CORS FIX ---
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed_origins = ['https://tech-next.eu', 'http://localhost:5173', 'http://localhost:3000'];

if (in_array($origin, $allowed_origins)) { // <--- FIXED: Now using an array variable
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: *");
}
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

try {
    // 2. Auth Check
    $user = authenticateRequest();
    $userId = $user->sub ?? $user->id ?? null;

    if (!$userId) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }

    $db = getDbConnection();

    // 3. Fetch Goals
    $goalsStmt = $db->prepare("SELECT id, title, description, deadline, category, created_at, 'goal' as type FROM goals WHERE user_id = ? ORDER BY created_at DESC");
    $goalsStmt->execute([$userId]);
    $goals = $goalsStmt->fetchAll(PDO::FETCH_ASSOC);

    // 4. Fetch Brain Dumps
    $dumpsStmt = $db->prepare("SELECT id, text, category, done, created_at, 'brain_dump' as type FROM brain_dumps WHERE user_id = ? ORDER BY created_at DESC");
    $dumpsStmt->execute([$userId]);
    $brainDumps = $dumpsStmt->fetchAll(PDO::FETCH_ASSOC);

    // 5. Return Object
    echo json_encode([
        'goals' => $goals ?: [],
        'brainDumps' => $brainDumps ?: []
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>