import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './hooks/useAuth.js';
import * as apiService from './services/apiService.js'; // Import all functions from apiService
import { generateMotivatingDescription } from './services/ai.js'; // AI service remains

import Header from './components/Header.jsx';
import BrainDump from './components/BrainDump.jsx';
import Goals from './components/Goals.jsx';
import GoalDetailModal from './components/GoalDetailModal.jsx';
import ImportModal from './components/ImportModal.jsx';
import Loader from './components/common/Loader.jsx';
import Login from './components/Login.jsx';
import Alert from './components/common/Alert.jsx';

export default function App() {
  const { user, loading: authLoading, error: authError } = useAuth();
  
  const [brainDump, setBrainDump] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [activeContext, setActiveContext] = useState('work');
  const [darkMode, setDarkMode] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');

  const [selectedGoal, setSelectedGoal] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [goalViewMode, setGoalViewMode] = useState('list');

  // For demonstration: show that the Vite env variable is being read.
  console.log('Vite API URL:', import.meta.env.VITE_API_URL);

  useEffect(() => {
    if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, user]);

  const loadData = useCallback(async () => {
    if (!user) {
      setBrainDump([]);
      setGoals([]);
      setIsDataLoading(false);
      return;
    }
    setIsDataLoading(true);
    try {
      const { brainDump, goals } = await apiService.fetchData();
      setBrainDump(brainDump);
      setGoals(goals);
    } catch (error) {
      console.error("Failed to load data:", error);
      setAlertMsg("Session expired or failed to load data. Please log in again.");
      // Handle token expiry by logging out
      // signOutUser(); 
    } finally {
      setIsDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]); // This effect re-runs whenever the user logs in or out

  useEffect(() => {
    if (alertMsg) {
      const timer = setTimeout(() => setAlertMsg(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [alertMsg]);

  useEffect(() => {
    if (selectedGoal) {
      const liveGoal = goals.find(g => g.id === selectedGoal.id);
      if (liveGoal) {
        setSelectedGoal(liveGoal);
      } else {
        setSelectedGoal(null);
      }
    }
  }, [goals, selectedGoal]);

  const filteredBrainDump = useMemo(() => {
    return brainDump.filter(item => (item.category || 'private') === activeContext);
  }, [brainDump, activeContext]);

  const filteredGoals = useMemo(() => {
    return goals.filter(item => (item.category || 'private') === activeContext);
  }, [goals, activeContext]);

  const promoteToGoal = async (item) => {
    if (!user) return;
    if (filteredGoals.length >= 3) {
      setAlertMsg(`Weekly Limit: Max 3 ${activeContext} Goals! Finish one first.`);
      return;
    }

    try {
      setAlertMsg(`✨ Generating motivation for "${item.text}"...`);
      const description = await generateMotivatingDescription(item.text);

      const newGoalPayload = {
        title: item.text,
        description: description,
        deadline: '',
        category: activeContext,
        // tasks and updates are now separate tables, so don't send them here
        // The backend will handle creating any initial tasks if necessary
        createdAt: Date.now()
      };
      
      const result = await apiService.promoteToGoal(item.id, newGoalPayload);
      // The backend now returns the new goal with its ID
      const newGoalRef = { id: result.newGoalId };
      await loadData();
      setSelectedGoal({ id: newGoalRef.id, ...newGoalPayload });
      setGoalViewMode(activeContext === 'work' ? 'board' : 'list');
      setAlertMsg(`Goal Promoted: "${item.text}" is now a Big 3 Focus.`);
    } catch (error) {
      console.error("Error promoting goal:", error);
      setAlertMsg("Failed to promote goal.");
    }
  };

  const handleImport = async (importJson) => {
    if (!user) return;
    try {
      const parsed = JSON.parse(importJson); // Still parse locally
      // This would require a new backend endpoint to handle batch imports to MySQL
      console.log("Importing is not implemented for MySQL yet.");
    } catch (e) {
      console.error(e);
      setAlertMsg('Invalid JSON syntax.');
    }
  };

  // Dynamic styling
  const isWork = activeContext === 'work';
  const bgMain = darkMode ? 'bg-slate-950' : 'bg-slate-50';
  const textMain = darkMode ? 'text-slate-100' : 'text-slate-800';
  const darkModeClass = darkMode ? 'dark' : '';

  if (loading) {
    return <Loader />;
  }

  if (!user) {
    return <Login setAlertMsg={setAlertMsg} darkMode={darkMode} />;
  }

  return (
    <div className={`min-h-screen font-sans selection:bg-emerald-500/30 selection:text-emerald-200 transition-colors duration-300 ${bgMain} ${textMain} ${darkModeClass}`}>
      <Alert alertMsg={alertMsg} isWork={isWork} />

      <Header
        isWork={isWork}
        darkMode={darkMode}
        activeContext={activeContext}
        setActiveContext={setActiveContext}
        setDarkMode={setDarkMode}
        setShowImport={setShowImport}
        user={user}
        setAlertMsg={setAlertMsg}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <BrainDump
          user={user}
          filteredBrainDump={filteredBrainDump}
          activeContext={activeContext}
          promoteToGoal={promoteToGoal}
          setAlertMsg={setAlertMsg}
          onDataChange={loadData} // Pass the refresh function
          isLoading={isDataLoading}
          darkMode={darkMode}
        />
        <Goals
          goals={filteredGoals}
          activeContext={activeContext}
          setSelectedGoal={setSelectedGoal}
          setGoalViewMode={setGoalViewMode}
          onDataChange={loadData} // Pass the refresh function
          isLoading={isDataLoading}
          darkMode={darkMode}
        />
      </main>

      {selectedGoal && <GoalDetailModal goal={selectedGoal} setGoal={setSelectedGoal} user={user} setAlertMsg={setAlertMsg} onDataChange={loadData} viewMode={goalViewMode} setViewMode={setGoalViewMode} darkMode={darkMode} />}
      {showImport && <ImportModal setShow={setShowImport} handleImport={handleImport} activeContext={activeContext} darkMode={darkMode} />}
    </div>
  );
}