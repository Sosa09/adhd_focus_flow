<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: https://tech-next.eu");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$user = authenticateRequest();
$db = getDbConnection();
$data = json_decode(file_get_contents("php://input"));

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

try {
    $db->beginTransaction();

    // Add new goal to the 'goals' table
    $goalStmt = $db->prepare('INSERT INTO goals (user_id, title, description, deadline, category, created_at) VALUES (?, ?, ?, ?, ?, ?)');
    $goalStmt->execute([$user->id, $data->newGoalData->title, $data->newGoalData->description, $data->newGoalData->deadline ?: null, $data->newGoalData->category, $data->newGoalData->createdAt]);
    $newGoalId = $db->lastInsertId();

    // Delete brain dump item
    $deleteStmt = $db->prepare('DELETE FROM brain_dumps WHERE id = ? AND user_id = ?');
    $deleteStmt->execute([$data->brainDumpItemId, $user->id]);
    if ($deleteStmt->rowCount() === 0) {
        throw new Exception('Brain dump item not found for deletion');
    }

    $db->commit();
    http_response_code(201);
    echo json_encode(['newGoalId' => $newGoalId] + (array)$data->newGoalData);
} catch (Exception $e) {
    $db->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Failed to promote to goal', 'details' => $e->getMessage()]);
}
?>