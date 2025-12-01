<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: https://tech-next.eu");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$user = authenticateRequest();
$db = getDbConnection();
$data = json_decode(file_get_contents("php://input"));

switch ($_SERVER['REQUEST_METHOD']) {
    case 'POST':
        // Create a new goal
        try {
            $stmt = $db->prepare('INSERT INTO goals (user_id, title, description, deadline, category, created_at) VALUES (?, ?, ?, ?, ?, ?)');
            $stmt->execute([$user->id, $data->title, $data->description, $data->deadline ?: null, $data->category, $data->createdAt]);
            $insertId = $db->lastInsertId();
            http_response_code(201);
            echo json_encode(['id' => $insertId, 'title' => $data->title, 'description' => $data->description, 'deadline' => $data->deadline, 'category' => $data->category, 'createdAt' => $data->createdAt]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Error adding goal', 'details' => $e->getMessage()]);
        }
        break;

    case 'PUT':
        // Update an existing goal and its tasks/updates
        $id = basename($_SERVER['REQUEST_URI']);
        try {
            $db->beginTransaction();

            // Update the main goal details
            $stmt = $db->prepare('UPDATE goals SET title = ?, description = ?, deadline = ?, category = ? WHERE id = ? AND user_id = ?');
            $stmt->execute([$data->title, $data->description, $data->deadline, $data->category, $id, $user->id]);

            // Handle tasks: delete existing and insert new ones
            $db->prepare('DELETE FROM tasks WHERE goal_id = ?')->execute([$id]);
            if (!empty($data->tasks)) {
                $taskStmt = $db->prepare('INSERT INTO tasks (goal_id, text, done, status) VALUES (?, ?, ?, ?)');
                foreach ($data->tasks as $task) {
                    $taskStmt->execute([$id, $task->text, $task->done, $task->status ?? 'todo']);
                }
            }

            // Handle updates: delete existing and insert new ones
            $db->prepare('DELETE FROM goal_updates WHERE goal_id = ?')->execute([$id]);
            if (!empty($data->updates)) {
                $updateStmt = $db->prepare('INSERT INTO goal_updates (goal_id, text) VALUES (?, ?)');
                foreach ($data->updates as $update) {
                    $updateStmt->execute([$id, $update->text]);
                }
            }

            $db->commit();
            http_response_code(200);
            echo json_encode(['message' => 'Goal updated successfully']);
        } catch (PDOException $e) {
            $db->rollBack();
            http_response_code(500);
            echo json_encode(['error' => 'Error updating goal', 'details' => $e->getMessage()]);
        }
        break;

    case 'DELETE':
        // Delete a goal
        $id = basename($_SERVER['REQUEST_URI']);
        try {
            $stmt = $db->prepare('DELETE FROM goals WHERE id = ? AND user_id = ?');
            $stmt->execute([$id, $user->id]);
            if ($stmt->rowCount() === 0) {
                http_response_code(404);
                echo json_encode(['error' => 'Goal not found or not authorized']);
            } else {
                http_response_code(204); // No Content
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Error deleting goal', 'details' => $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method Not Allowed']);
        break;
}
?>