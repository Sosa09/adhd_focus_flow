import React from 'react';
import { signOutUser } from '../services/apiService'; // Updated import
import { SunIcon, MoonIcon, ArrowRightOnRectangleIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

export default function Header({
  isWork,
  darkMode,
  activeContext,
  setActiveContext,
  setDarkMode,
  setShowImport,
  user, // Add user prop
  setAlertMsg
}) {

  const handleSignOut = async () => {
    try {
      signOutUser();
      window.location.reload(); // Force a reload to go to the login screen
    } catch (error) {
      console.error("Error signing out:", error);
      setAlertMsg("Failed to sign out.");
    }
  };

  // Dynamic styling
  const headerBg = darkMode ? 'bg-slate-900' : 'bg-white';
  const textMuted = darkMode ? 'text-slate-400' : 'text-slate-500';
  const buttonBase = "p-2 rounded-full transition-colors";
  const buttonHover = darkMode ? "hover:bg-slate-700" : "hover:bg-slate-200";

  return (
    <header className={`sticky top-0 z-10 shadow-md ${headerBg}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center py-3">
          {/* Left side: Context Switcher */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <span className={`font-bold text-lg ${isWork ? 'text-emerald-500' : 'text-sky-500'}`}>
              {isWork ? 'Work' : 'Personal'}
            </span>
            <button
              onClick={() => setActiveContext(activeContext === 'work' ? 'private' : 'work')}
              className={`px-3 py-1 text-sm font-semibold rounded-full ${isWork ? 'bg-sky-100 text-sky-700 hover:bg-sky-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
            >
              Switch to {isWork ? 'Personal' : 'Work'}
            </button>
          </div>

          {user && <span className={`text-xs ${textMuted} mr-4`}>{user.email || user.uid}</span>}

          {/* Right side: Action Icons */}
          <div className="flex items-center space-x-2">
            <button onClick={() => setShowImport(true)} className={`${buttonBase} ${buttonHover}`} title="Import Data">
              <ArrowDownTrayIcon className={`h-6 w-6 ${textMuted}`} />
            </button>
            <button onClick={() => setDarkMode(!darkMode)} className={`${buttonBase} ${buttonHover}`} title="Toggle Dark Mode">
              {darkMode ? <SunIcon className={`h-6 w-6 ${textMuted}`} /> : <MoonIcon className={`h-6 w-6 ${textMuted}`} />}
            </button>
            <button onClick={handleSignOut} className={`${buttonBase} ${buttonHover}`} title="Sign Out">
              <ArrowRightOnRectangleIcon className={`h-6 w-6 ${textMuted}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}