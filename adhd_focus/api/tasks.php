<?php
// api/tasks.php

// --- CORS HEADERS ---
// Allow requests from your React app's origin
header("Access-Control-Allow-Origin: https://tech-next.eu");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// --- RESPONSE HEADER ---
header('Content-Type: application/json');

// --- DATABASE CONNECTION ---
require_once 'db_connect.php';

// --- LOGIC ---
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // This is a sample response.
    // In a real application, you would query the database.
    // Example: $stmt = $pdo->query('SELECT * FROM tasks');
    // $tasks = $stmt->fetchAll();
    $tasks = [
        ['id' => 1, 'title' => 'Refactor API service', 'completed' => true],
        ['id' => 2, 'title' => 'Configure .htaccess', 'completed' => true],
        ['id' => 3, 'title' => 'Create PHP backend', 'completed' => false],
    ];

    echo json_encode($tasks);
} else {
    // Method not allowed
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
}
?>