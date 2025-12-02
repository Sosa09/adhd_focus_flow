
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

// 1. STRICT CHECK: We only want email
if (!isset($data->email) || !isset($data->password)) {
    http_response_code(400);
    echo json_encode(["error" => "Email and password are required"]);
    exit;
}

try {
    // 2. Check if EMAIL already exists
    $checkStmt = $db->prepare("SELECT id FROM users WHERE email = ?");
    $checkStmt->execute([$data->email]);
    if ($checkStmt->rowCount() > 0) {
        http_response_code(409);
        echo json_encode(["error" => "Email already exists"]);
        exit;
    }

    // 3. Insert into EMAIL column
    $hashed_password = password_hash($data->password, PASSWORD_DEFAULT);
    $insertStmt = $db->prepare("INSERT INTO users (email, password) VALUES (?, ?)");
    $insertStmt->execute([$data->email, $hashed_password]);
    
    http_response_code(201);
    echo json_encode(["message" => "User created successfully"]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database error: " . $e->getMessage()]);
}
?>