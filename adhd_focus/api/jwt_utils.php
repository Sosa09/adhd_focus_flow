<?php
// api/jwt_utils.php
require_once __DIR__ . '/config.php';

// --- HELPER FUNCTIONS ---
function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode($data) {
    return base64_decode(str_pad(strtr($data, '-_', '+/'), strlen($data) % 4, '=', STR_PAD_RIGHT));
}

// --- 1. GENERATE TOKEN ---
function generate_jwt($user_id, $email) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload = json_encode([
        'sub' => $user_id,
        'email' => $email,
        'iat' => time(),
        'exp' => time() + (60 * 60 * 24)
    ]);
    $base64UrlHeader = base64url_encode($header);
    $base64UrlPayload = base64url_encode($payload);
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, JWT_SECRET, true);
    $base64UrlSignature = base64url_encode($signature);

    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}

// --- 2. VALIDATE TOKEN ---
function is_jwt_valid($jwt) {
    $tokenParts = explode('.', $jwt);
    if (count($tokenParts) !== 3) return null;

    $base64UrlHeader = $tokenParts[0];
    $base64UrlPayload = $tokenParts[1];
    $signature_provided = $tokenParts[2];

    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, JWT_SECRET, true);
    $base64UrlSignature = base64url_encode($signature);

    if (!hash_equals($base64UrlSignature, $signature_provided)) {
        return null;
    }

    $payload = base64url_decode($tokenParts[1]);
    $claims = json_decode($payload);
    if (($claims->exp - time()) < 0) {
        return null; // Expired
    }

    return $claims;
}

// --- 3. EXTRACT TOKEN (URL BYPASS ADDED) ---
function get_jwt_from_header() {
    // Priority 1: URL Parameter (The Bypass Fix)
    if (isset($_GET['token']) && !empty($_GET['token'])) {
        return $_GET['token'];
    }

    // Priority 2: Standard Headers (Fallback)
    $authHeader = null;
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    } else if (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    } else if (function_exists('getallheaders')) {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? null;
    }

    if ($authHeader && preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        return $matches[1];
    }
    
    return null;
}
?>