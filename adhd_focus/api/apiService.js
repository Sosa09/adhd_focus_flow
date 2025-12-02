// src/services/apiService.js

const API_BASE_URL = 'https://tech-next.eu/adhd_focus/api';

/**
 * A helper function to get authorization headers.
 * In the future, this will retrieve the JWT token from localStorage.
 */
const getAuthHeaders = () => {
    // const token = localStorage.getItem('jwt_token');
    return {
        'Content-Type': 'application/json',
        // ...(token && { 'Authorization': `Bearer ${token}` })
    };
};

/**
 * A generic function to handle API requests.
 * @param {string} endpoint - The PHP file endpoint (e.g., 'braindump.php').
 * @param {string} method - The HTTP method (GET, POST, PUT, DELETE).
 * @param {object} [body] - The request body for POST and PUT requests.
 * @returns {Promise<any>} - The JSON response from the server.
 */
export const apiRequest = async (endpoint, method, body = null) => {
    const config = {
        method: method,
        headers: getAuthHeaders(),
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}/${endpoint}`, config);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'An unknown API error occurred' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    // For 204 No Content responses (like DELETE), there is no body to parse.
    if (response.status === 204) {
        return null;
    }

    return response.json();
};