<?php
// api/db.php

require_once __DIR__ . '/db_connect.php';

/**
 * Returns the PDO database connection object.
 *
 * @return PDO|null The PDO connection object.
 */
function getDbConnection() {
    global $pdo;
    return $pdo;
}
?>