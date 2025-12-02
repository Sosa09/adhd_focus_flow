import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode'; // We need to install this library

export function useAuth() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        try {
            const token = localStorage.getItem('authToken');
            if (token) {
                // Decode the token to get user information (id, email)
                const decodedUser = jwtDecode(token);
                // Optional: Check if token is expired
                if (decodedUser.exp * 1000 > Date.now()) {
                    setUser(decodedUser);
                } else {
                    setUser(null); // Token expired
                }
            }
        } catch (e) {
            console.error("Error decoding auth token:", e);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    return { user, loading, error };
}