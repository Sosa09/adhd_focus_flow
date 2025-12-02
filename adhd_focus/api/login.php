<?php
// api/login.php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/jwt_utils.php'; // <--- NEW REQUIRE

header("Content-Type: application/json");
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
// Allow Localhost for your debugging
if (in_array($origin, ['https://tech-next.eu', 'http://localhost:5173', 'http://localhost:3000'])) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: *");
}
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

$input = file_get_contents("php://input");
$data = json_decode($input);
$db = getDbConnection();

// Validate Input
if (!isset($data->email) || !isset($data->password)) {
    http_response_code(400);
    echo json_encode(['error' => 'Email and password are required']);
    exit;
}

try {
    // Query
    $stmt = $db->prepare("SELECT id, email, password FROM users WHERE email = ?");
    $stmt->execute([$data->email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // Verify
    if ($user && password_verify($data->password, $user['password'])) {
        
        // GENERATE REAL JWT HERE
        $token = generate_jwt($user['id'], $user['email']);

        http_response_code(200);
        echo json_encode([
            'accessToken' => $token, // This is now a valid x.y.z token
            'user' => [
                'id' => $user['id'], 
                'email' => $user['email']
            ]
        ]);
    } else {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid credentials']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Login failed', 'details' => $e->getMessage()]);
}
?>