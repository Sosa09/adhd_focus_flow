<?php
// api/data.php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: https://tech-next.eu");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Authenticate the user and get their data from the token
$userPayload = authenticateRequest();
$userId = $userPayload->sub; // 'sub' is the standard JWT claim for user ID

$db = getDbConnection();

try {
    // Fetch goals for the user
    $goalsStmt = $db->prepare("SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC");
    $goalsStmt->execute([$userId]);
    $goals = $goalsStmt->fetchAll(PDO::FETCH_ASSOC);

    // Fetch brain dumps for the user
    $dumpsStmt = $db->prepare("SELECT * FROM brain_dumps WHERE user_id = ? ORDER BY created_at DESC");
    $dumpsStmt->execute([$userId]);
    $brainDumps = $dumpsStmt->fetchAll(PDO::FETCH_ASSOC);

    // Return all data in a single JSON object
    echo json_encode([
        'goals' => $goals,
        'brainDumps' => $brainDumps,
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch data', 'details' => $e->getMessage()]);
}
?>