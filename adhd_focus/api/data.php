<?php
// api/data.php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

header("Content-Type: application/json");
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
// Allow Localhost for your debugging
if (in_array($origin, ['https://tech-next.eu', 'http://localhost:5173', 'http://localhost:3000'])) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: *");
}
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

$user = authenticateRequest();
$userId = $user->sub ?? $user->id ?? null;

if (!$userId) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$db = getDbConnection();

try {
    // 1. Fetch Goals
    $goalsStmt = $db->prepare("SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC");
    $goalsStmt->execute([$userId]);
    $goals = $goalsStmt->fetchAll(PDO::FETCH_ASSOC);

    // 2. Fetch Brain Dumps
    $dumpsStmt = $db->prepare("SELECT * FROM brain_dumps WHERE user_id = ? ORDER BY created_at DESC");
    $dumpsStmt->execute([$userId]);
    $brainDumps = $dumpsStmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. Return Object (Safe Empty Arrays)
    echo json_encode([
        'goals' => $goals ?: [],
        'brainDumps' => $brainDumps ?: []
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>