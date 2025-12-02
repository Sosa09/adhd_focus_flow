<?php
require_once __DIR__ . '/db.php';

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

$data = json_decode(file_get_contents("php://input"));
$db = getDbConnection();

$stmt = $db->prepare("SELECT id, password FROM users WHERE email = ?");
$stmt->execute([$data->email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if ($user && password_verify($data->password, $user['password'])) {
    // SUCCESS: Return a fake token (since we haven't built JWT yet)
    // IMPORTANT: Ideally you should use a real JWT library here later.
    echo json_encode([
        'accessToken' => 'mock_token_for_user_' . $user['id'],
        'user' => ['id' => $user['id'], 'email' => $data->email]
    ]);
} else {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid credentials']);
}
?>