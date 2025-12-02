// Read the API URL from the .env file. This is the crucial change.
const API_URL = import.meta.env.VITE_API_URL;

const handleResponse = async (response) => {
    if (response.ok) {
        return response.json();
    }

    // Try to parse a JSON error message from the backend
    try {
        const errorData = await response.json();
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
    } catch (e) {
        // If the response is not JSON (e.g., a 500 server crash with an HTML page), provide a generic error.
        throw new Error(`The server responded with an error (${response.status}). Please try again later.`);
    }
};

export const signUpWithEmail = async (email, password) => {
    try {
        const response = await fetch(`${API_URL}/signup.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        return handleResponse(response);
    } catch (error) {
        // Catch network errors (e.g., server is down)
        if (error instanceof TypeError) {
            throw new Error("Cannot connect to the server. Is it running?");
        }
        throw error; // Re-throw errors from handleResponse
    }
};

export const signInWithEmail = async (email, password) => {
    try {
        const response = await fetch(`${API_URL}/login.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await handleResponse(response);
        localStorage.setItem('authToken', data.accessToken);
        return data;
    } catch (error) {
        if (error instanceof TypeError) throw new Error("Cannot connect to the server. Is it running?");
        throw error;
    }
};

export const signOutUser = () => {
    localStorage.removeItem('authToken');
};

// --- Data Functions ---

const getAuthHeader = () => {
    const token = localStorage.getItem('authToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const fetchData = async () => {
    const response = await fetch(`${API_URL}/data.php`, { headers: getAuthHeader() });
    const responseText = await response.text(); // Read response as text
    console.log("Raw API response for data.php:", responseText); // Log it
    if (!response.ok) throw new Error('Failed to fetch data');
    return JSON.parse(responseText); // Parse the text as JSON
};

export const addDocument = async (collection, data) => {
    const response = await fetch(`${API_URL}/${collection.toLowerCase()}.php`, {
        method: 'POST',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`Failed to add to ${collection.toLowerCase()}`);
    return response.json();
};

export const updateDocument = async (collectionName, id, data) => {
  const response = await fetch(`${API_URL}/${collectionName.toLowerCase()}.php?id=${id}`, {
    method: 'PUT',
    headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Failed to update ${collectionName.toLowerCase()} with id ${id}`);
};

export const deleteDocument = async (collectionName, id) => {
  const response = await fetch(`${API_URL}/${collectionName.toLowerCase()}.php?id=${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  if (!response.ok) throw new Error(`Failed to delete ${collectionName.toLowerCase()} with id ${id}`);
};

export const promoteToGoal = async (brainDumpItemId, newGoalData) => {
  const response = await fetch(`${API_URL}/promote-to-goal.php`, {
    method: 'POST',
    headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ brainDumpItemId, newGoalData }),
  });
  if (!response.ok) throw new Error('Failed to promote item to goal');
  return response.json();
};
