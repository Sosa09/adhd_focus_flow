<?php
// api/jwt_utils.php
require_once __DIR__ . '/config.php';

function base64url_decode($data) {
    return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', 3 - (3 + strlen($data)) % 4));
}

function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function generate_jwt($user_id, $email) {
    // 1. Create Header
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    
    // 2. Create Payload
    $payload = json_encode([
        'sub' => $user_id,      // Subject (User ID)
        'email' => $email,      // Custom field
        'iat' => time(),        // Issued At
        'exp' => time() + (60 * 60 * 24) // Expiration (24 hours)
    ]);

    // 3. Encode Header & Payload
    $base64UrlHeader = base64url_encode($header);
    $base64UrlPayload = base64url_encode($payload);

    // 4. Create Signature
    $signature = hash_hmac('sha256', 
        $base64UrlHeader . "." . $base64UrlPayload, 
        JWT_SECRET, // Defined in your config.php
        true
    );
    $base64UrlSignature = base64url_encode($signature);

    // 5. Return the full token: x.y.z
    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}

function validate_jwt($jwt) {
    // 1. Split the token
    $tokenParts = explode('.', $jwt);
    if (count($tokenParts) !== 3) {
        return null; // Invalid token format
    }
    $header = base64url_decode($tokenParts[0]);
    $payload = base64url_decode($tokenParts[1]);
    $signatureProvided = $tokenParts[2];

    // 2. Check expiration
    $payloadData = json_decode($payload);
    if ($payloadData->exp < time()) {
        return null; // Token expired
    }

    // 3. Build signature for verification
    $base64UrlHeader = base64url_encode($header);
    $base64UrlPayload = base64url_encode($payload);
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, JWT_SECRET, true);
    $base64UrlSignature = base64url_encode($signature);

    // 4. Verify signature
    if (hash_equals($base64UrlSignature, $signatureProvided)) {
        return $payloadData; // Token is valid
    }

    return null; // Invalid signature
}

function get_jwt_from_header() {
    $headers = getallheaders();
    if (isset($headers['Authorization'])) {
        $authHeader = $headers['Authorization'];
        if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            return $matches[1];
        }
    }
    return null;
}
?>