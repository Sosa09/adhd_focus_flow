<?php
// api/auth.php

/**
 * Authenticates a request by checking for an Authorization header.
 * For now, it returns a mock user for testing purposes.
 *
 * @return object A user object with an 'id' property.
 */
function authenticateRequest() {
    // In a real application, you would validate the JWT token here.
    // Example:
    // 1. Get the 'Authorization: Bearer <token>' header.
    // 2. Decode and verify the token using your JWT_SECRET.
    // 3. If valid, return the user data from the token.
    // 4. If invalid, send a 401 Unauthorized response.

    // For now, we'll just return a mock user object.
    // This allows us to test protected endpoints.
    $mockUser = (object)['id' => 1];

    return $mockUser;
}
?>