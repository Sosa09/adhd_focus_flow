import React, { useState } from 'react';
import { signUpWithEmail, signInWithEmail } from '../services/apiService'; // Updated import
import { Loader2 } from 'lucide-react';

export default function Login({ setAlertMsg, darkMode }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSigningUp, setIsSigningUp] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleAuthAction = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            setAlertMsg("Please enter both email and password.");
            return;
        }
        setIsLoading(true);

        try {
            if (isSigningUp) {
                // First, create the account
                await signUpWithEmail(email, password);
                // Then, automatically sign them in
                await signInWithEmail(email, password);
                window.location.reload(); // Force a reload to enter the app
            } else {
                await signInWithEmail(email, password);
                window.location.reload(); // Force a reload to enter the app
            }
        } catch (error) {
            console.error("Authentication error:", error);
            setAlertMsg(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Dynamic styling
    const bgCard = darkMode ? 'bg-slate-800' : 'bg-white';
    const textMuted = darkMode ? 'text-slate-400' : 'text-slate-500';
    const inputBg = darkMode ? 'bg-slate-700' : 'bg-slate-100';
    const buttonPrimary = 'w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-md transition-colors flex items-center justify-center disabled:opacity-50';
    const buttonSecondary = `text-sm ${textMuted} hover:text-emerald-500 transition-colors`;

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
            <div className={`shadow-xl rounded-lg p-8 max-w-sm w-full ${bgCard}`}>
                <h2 className="text-2xl font-bold text-center mb-1">
                    {isSigningUp ? 'Create an Account' : 'Welcome Back'}
                </h2>
                <p className={`text-center mb-6 ${textMuted}`}>
                    {isSigningUp ? 'Get started with your focus flow.' : 'Sign in to continue.'}
                </p>
                <form onSubmit={handleAuthAction}>
                    <div className="mb-4">
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            className={`w-full p-3 rounded-md border-none ${inputBg}`}
                        />
                    </div>
                    <div className="mb-6">
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete={isSigningUp ? "new-password" : "current-password"}
                            className={`w-full p-3 rounded-md border-none ${inputBg}`}
                        />
                    </div>
                    <button type="submit" className={buttonPrimary} disabled={isLoading}>
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            isSigningUp ? 'Sign Up' : 'Sign In'
                        )}
                    </button>
                </form>
                <div className="text-center mt-4">
                    <button onClick={() => setIsSigningUp(!isSigningUp)} className={buttonSecondary}>
                        {isSigningUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                    </button>
                </div>
            </div>
        </div>
    );
}