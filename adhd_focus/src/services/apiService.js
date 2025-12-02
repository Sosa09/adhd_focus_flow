// src/services/apiService.js

// Use the environment variable if available, otherwise fallback to live URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://tech-next.eu/adhd_focus/api';

/**
 * Helper to get authorization headers.
 * Retrieves the JWT token from localStorage.
 */
const getAuthHeaders = () => {
    // Check both possible keys just to be safe
    const token = localStorage.getItem('token') || localStorage.getItem('jwt_token');
    
    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
};

/**
 * Generic API Request Handler
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
        if (response.status === 401) {
            console.warn("Unauthorized access - token might be invalid");
        }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
};

// --- AUTH FUNCTIONS (These were missing!) ---

export const signInWithEmail = async (credentials) => {
    // credentials = { email, password }
    return await apiRequest('login.php', 'POST', credentials);
};

export const signUpWithEmail = async (credentials) => {
    // credentials = { email, password }
    return await apiRequest('signup.php', 'POST', credentials);
};

export const signOutUser = () => {
    // Clear tokens from local storage
    localStorage.removeItem('token');
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user');
    
    // Optional: Force a reload to reset app state
    window.location.reload();
};

// --- DATA FUNCTIONS (Required by App.jsx) ---

export const fetchData = async () => {
    return await apiRequest('data.php', 'GET');
};

export const promoteToGoal = async (brainDumpItemId, newGoalData) => {
    const payload = {
        brainDumpItemId,
        newGoalData
    };
    return await apiRequest('promote_to_goal.php', 'POST', payload);
};

// --- CRUD WRAPPERS ---

// Brain Dump
export const createBrainDump = async (item) => {
    return await apiRequest('braindump.php', 'POST', item);
};

export const updateBrainDump = async (id, updates) => {
    return await apiRequest(`braindump.php?id=${id}`, 'PUT', updates);
};

export const deleteBrainDump = async (id) => {
    return await apiRequest(`braindump.php?id=${id}`, 'DELETE');
};

// Goals
export const createGoal = async (goal) => {
    return await apiRequest('goals.php', 'POST', goal);
};

export const updateGoal = async (id, updates) => {
    return await apiRequest(`goals.php?id=${id}`, 'PUT', updates);
};

export const deleteGoal = async (id) => {
    return await apiRequest(`goals.php?id=${id}`, 'DELETE');
};