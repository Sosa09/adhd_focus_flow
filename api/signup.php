<?php
require_once __DIR__ . '/db.php';

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *"); 
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

$data = json_decode(file_get_contents("php://input"));
$db = getDbConnection();

if (!isset($data->username) || !isset($data->password)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing fields']);
    exit;
}

// Check if user exists
$stmt = $db->prepare("SELECT id FROM users WHERE username = ?");
$stmt->execute([$data->username]);
if ($stmt->fetch()) {
    http_response_code(409);
    echo json_encode(['error' => 'User already exists']);
    exit;
}

// Insert new user
$hashed_password = password_hash($data->password, PASSWORD_DEFAULT);
$stmt = $db->prepare("INSERT INTO users (username, password) VALUES (?, ?)");

if ($stmt->execute([$data->username, $hashed_password])) {
    http_response_code(201);
    echo json_encode(['message' => 'User created']);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
}
?>