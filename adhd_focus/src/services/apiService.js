// src/services/apiService.js

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://tech-next.eu/adhd_focus/api';

/**
 * Helper: Get Token from Storage
 */
const getToken = () => {
    return localStorage.getItem('token') || localStorage.getItem('jwt_token');
};

/**
 * Generic API Request Handler (With URL Token Bypass)
 */
export const apiRequest = async (endpoint, method, body = null) => {
    const token = getToken();
    
    // --- BYPASS FIX: Add token to URL ---
    let url = `${API_BASE_URL}/${endpoint}`;
    if (token) {
        const separator = url.includes('?') ? '&' : '?';
        url = `${url}${separator}token=${token}`;
    }

    const config = {
        method: method,
        headers: {
            'Content-Type': 'application/json'
            // No Authorization header (using URL bypass instead)
        },
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    const response = await fetch(url, config);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'An unknown API error occurred' }));
        if (response.status === 401) {
            console.warn("Unauthorized - Token invalid or missing");
        }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
};

// --- AUTH FUNCTIONS ---

export const loginUser = async (credentials) => {
    return await apiRequest('login.php', 'POST', credentials);
};

export const registerUser = async (credentials) => {
    return await apiRequest('signup.php', 'POST', credentials);
};

export const signOutUser = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user');
    window.location.reload();
};

// --- DATA FUNCTIONS ---

export const fetchData = async () => {
    return await apiRequest('data.php', 'GET');
};

export const promoteToGoal = async (brainDumpItemId, newGoalData) => {
    const payload = { brainDumpItemId, newGoalData };
    return await apiRequest('promote_to_goal.php', 'POST', payload);
};

// --- CRUD WRAPPERS ---

export const createBrainDump = async (item) => {
    return await apiRequest('braindump.php', 'POST', item);
};

export const updateBrainDump = async (id, updates) => {
    return await apiRequest(`braindump.php?id=${id}`, 'PUT', updates);
};

export const deleteBrainDump = async (id) => {
    return await apiRequest(`braindump.php?id=${id}`, 'DELETE');
};

export const createGoal = async (goal) => {
    return await apiRequest('goals.php', 'POST', goal);
};

export const updateGoal = async (id, updates) => {
    return await apiRequest(`goals.php?id=${id}`, 'PUT', updates);
};

export const deleteGoal = async (id) => {
    return await apiRequest(`goals.php?id=${id}`, 'DELETE');
};

// --- ALIASES (This fixes your Login.jsx error!) ---
// These map the old function names to the new PHP-compatible ones
export const signInWithEmail = loginUser;
export const signUpWithEmail = registerUser;
export const signOut = signOutUser;