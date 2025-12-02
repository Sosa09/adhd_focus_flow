<?php
// api/auth.php
require_once __DIR__ . '/jwt_utils.php';

/**
 * Authenticates a request by validating the JWT from the Authorization header.
 *
 * @return object|null The user data from the token payload if valid, otherwise null.
 */
function authenticateRequest() {
    $token = get_jwt_from_header();

    if (!$token) {
        http_response_code(401);
        echo json_encode(['error' => 'Authorization token not found.']);
        exit;
    }

    $payload = validate_jwt($token);
    if (!$payload) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid or expired token.']);
        exit;
    }

    // The token is valid, return the payload which contains user data (e.g., sub, email)
    return $payload;
}
?>