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

$userPayload = authenticateRequest(); // Protects the endpoint
$userId = $userPayload->sub;
$db = getDbConnection();
$data = json_decode(file_get_contents("php://input"));

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        // Fetch all items for the logged-in user
        try {
            $stmt = $db->prepare("SELECT * FROM brain_dumps WHERE user_id = ? ORDER BY created_at DESC");
            $stmt->execute([$userId]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // IMPORTANT: Always return JSON, even if empty
            echo json_encode($items ?: []); 
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch items']);
        }
        break;
    case 'POST':
        // Create a new brain dump item
        try {
            $stmt = $db->prepare('INSERT INTO brain_dumps (user_id, text, done, category, created_at) VALUES (?, ?, ?, ?, ?)');
            $stmt->execute([$userId, $data->text, $data->done ?? 0, $data->category, $data->createdAt]);
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
        $id = $_GET['id'] ?? null;
        try {
            $stmt = $db->prepare('UPDATE brain_dumps SET text = ?, done = ?, category = ? WHERE id = ? AND user_id = ?');
            $stmt->execute([$data->text, $data->done ?? 0, $data->category, $id, $userId]);
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
        $id = $_GET['id'] ?? null;
        try {
            $stmt = $db->prepare('DELETE FROM brain_dumps WHERE id = ? AND user_id = ?');
            $stmt->execute([$id, $userId]);
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