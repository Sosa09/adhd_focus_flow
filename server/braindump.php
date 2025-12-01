<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: https://tech-next.eu"); // Or your actual domain
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Handle preflight OPTIONS request for CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$user = authenticateRequest(); // Protects the endpoint
$db = getDbConnection();
$data = json_decode(file_get_contents("php://input"));

switch ($_SERVER['REQUEST_METHOD']) {
    case 'POST':
        // Create a new brain dump item
        try {
            $stmt = $db->prepare('INSERT INTO brain_dumps (user_id, text, done, category, created_at) VALUES (?, ?, ?, ?, ?)');
            $stmt->execute([$user->id, $data->text, $data->done ?? 0, $data->category, $data->createdAt]);
            $insertId = $db->lastInsertId();
            http_response_code(201);
            echo json_encode(['id' => $insertId, 'text' => $data->text, 'done' => $data->done ?? 0, 'category' => $data->category, 'createdAt' => $data->createdAt]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Error adding brain dump item', 'details' => $e->getMessage()]);
        }
        break;

    case 'PUT':
        // Update an existing brain dump item
        $id = basename($_SERVER['REQUEST_URI']); // Get ID from URL like /api/braindump/123
        try {
            $stmt = $db->prepare('UPDATE brain_dumps SET text = ?, done = ?, category = ? WHERE id = ? AND user_id = ?');
            $stmt->execute([$data->text, $data->done ?? 0, $data->category, $id, $user->id]);
            if ($stmt->rowCount() === 0) {
                http_response_code(404);
                echo json_encode(['error' => 'Item not found or not authorized']);
            } else {
                http_response_code(200);
                echo json_encode(['message' => 'Item updated successfully']);
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Error updating brain dump item', 'details' => $e->getMessage()]);
        }
        break;

    case 'DELETE':
        // Delete a brain dump item
        $id = basename($_SERVER['REQUEST_URI']);
        try {
            $stmt = $db->prepare('DELETE FROM brain_dumps WHERE id = ? AND user_id = ?');
            $stmt->execute([$id, $user->id]);
            if ($stmt->rowCount() === 0) {
                http_response_code(404);
                echo json_encode(['error' => 'Item not found or not authorized']);
            } else {
                http_response_code(204); // No Content
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Error deleting brain dump item', 'details' => $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method Not Allowed']);
        break;
}
?>