<?php
// api/jwt_utils.php
require_once __DIR__ . '/config.php';

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
?>