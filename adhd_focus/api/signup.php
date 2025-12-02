
<?php
// api/signup.php
require_once __DIR__ . '/db.php';

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

$data = json_decode(file_get_contents("php://input"));
$db = getDbConnection();

// 1. Accept Username or Email (to be safe), but save as username
$username = $data->username ?? $data->email ?? null;
$password = $data->password ?? null;

// 2. Validate input
if (!$username || !$password) {
    http_response_code(400);
    // Use 'message' for user-facing errors
    echo json_encode(["message" => "Username and password are required."]);
    exit;
}
if (strlen($password) < 8) {
    http_response_code(400);
    echo json_encode(["message" => "Password must be at least 8 characters long."]);
    exit;
}

try {
    // 2. Check if exists
    $checkStmt = $db->prepare("SELECT id FROM users WHERE username = ?");
    $checkStmt->execute([$username]);
    if ($checkStmt->rowCount() > 0) {
        http_response_code(409);
        echo json_encode(["message" => "This username is already taken. Please choose another."]);
        exit;
    }

    // 4. Insert new user
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);
    $insertStmt = $db->prepare("INSERT INTO users (username, password) VALUES (?, ?)");
    $insertStmt->execute([$username, $hashed_password]);
    
    http_response_code(201);
    echo json_encode(["message" => "Account created successfully! You can now log in."]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["message" => "Could not create account. Please try again later."]);
}
?>