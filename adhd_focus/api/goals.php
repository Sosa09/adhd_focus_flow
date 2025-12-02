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

$userPayload = authenticateRequest();
$userId = $userPayload->sub;
$db = getDbConnection();
$data = json_decode(file_get_contents("php://input"));

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        try {
            // 1. Fetch all base goals for the user
            $stmt = $db->prepare("SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC");
            $stmt->execute([$userId]);
            $goals = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (empty($goals)) {
                // If there are no goals, return an empty array immediately.
                echo json_encode([]);
                break;
            }

            // 2. Collect all goal IDs to fetch their children in one go
            $goalIds = array_map(fn($goal) => $goal['id'], $goals);
            $placeholders = implode(',', array_fill(0, count($goalIds), '?'));

            // 3. Fetch all tasks and updates for all goals in two efficient queries
            $tasksStmt = $db->prepare("SELECT * FROM tasks WHERE goal_id IN ($placeholders)");
            $tasksStmt->execute($goalIds);
            $allTasks = $tasksStmt->fetchAll(PDO::FETCH_ASSOC);

            $updatesStmt = $db->prepare("SELECT * FROM goal_updates WHERE goal_id IN ($placeholders)");
            $updatesStmt->execute($goalIds);
            $allUpdates = $updatesStmt->fetchAll(PDO::FETCH_ASSOC);

            // 4. Group children by their parent goal_id for easy lookup
            $tasksByGoalId = [];
            foreach ($allTasks as $task) $tasksByGoalId[$task['goal_id']][] = $task;

            $updatesByGoalId = [];
            foreach ($allUpdates as $update) $updatesByGoalId[$update['goal_id']][] = $update;

            // 5. Attach the children to their parent goal
            foreach ($goals as &$goal) {
                $goal['tasks'] = $tasksByGoalId[$goal['id']] ?? [];
                $goal['updates'] = $updatesByGoalId[$goal['id']] ?? [];
            }

            echo json_encode($goals);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch goals']);
        }
        break;
    case 'POST':
        // Create a new goal
        try {
            $stmt = $db->prepare('INSERT INTO goals (user_id, title, description, deadline, category, created_at) VALUES (?, ?, ?, ?, ?, ?)');
            $stmt->execute([$userId, $data->title, $data->description, $data->deadline ?: null, $data->category, $data->createdAt]);
            $insertId = $db->lastInsertId();
            http_response_code(201);
            echo json_encode(['id' => $insertId, 'title' => $data->title, 'description' => $data->description, 'deadline' => $data->deadline, 'category' => $data->category, 'createdAt' => $data->createdAt]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Error adding goal', 'details' => $e->getMessage()]);
        }
        break;

    case 'PUT':
        // Update an existing goal and its tasks/updates (no change here)
        $id = $_GET['id'] ?? null;
        try {
            $db->beginTransaction();

            // Update the main goal details
            $stmt = $db->prepare('UPDATE goals SET title = ?, description = ?, deadline = ?, category = ? WHERE id = ? AND user_id = ?');
            $stmt->execute([$data->title, $data->description, $data->deadline, $data->category, $id, $userId]);

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
        $id = $_GET['id'] ?? null;
        try {
            $stmt = $db->prepare('DELETE FROM goals WHERE id = ? AND user_id = ?');
            $stmt->execute([$id, $userId]);
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