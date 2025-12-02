<?php
// api/login.php
require_once __DIR__ . '/db.php';

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

$data = json_decode(file_get_contents("php://input"));
$db = getDbConnection();

// 1. tp_response_code(400);
    echo json_encode(['error' => 'Email and password are required']);
    exit;

try {
    // 2. Query by EMAIL
    $stmt = $db->prepare("SELECT id, email, password FROM users WHERE email = ?");
    $->password, $user['password'])) {
        echo json_encode([
            'accessToken' => 'mock_token_for_user_' . $user['id'],
            'user' => ['id' => $user['id'], 'email' => $user['email']]
        ]);
    } else {
        http_response_code(401);encode(['error' => 'Invalid credentials']);
    }
} catch (Exception $e) {
    echo json_encode(['error' => 'Login failed', 'details' => $e->getMessage()]);
}
?>