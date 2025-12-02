// src/App.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './hooks/useAuth.js';
import * as apiService from './services/apiService.js'; 
import { generateMotivatingDescription } from './services/ai.js'; 

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
  
  // State
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

  // Debugging
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
      // FIX: The PHP API returns { goals: [], brainDumps: [] }
      // We must map 'brainDumps' (plural) to 'brainDump' (singular state)
      const data = await apiService.fetchData();
      
      setBrainDump(data.brainDumps || []); 
      setGoals(data.goals || []);

    } catch (error) {
      console.error("Failed to load data:", error);
      setAlertMsg("Failed to load data. Please check your connection.");
    } finally {
      setIsDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]); 

  // Alert Timer
  useEffect(() => {
    if (alertMsg) {
      const timer = setTimeout(() => setAlertMsg(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [alertMsg]);

  // Goal Selection Sync
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

  // FIX: Defensive Filtering (Prevents "undefined" crash)
  const filteredBrainDump = useMemo(() => {
    return (brainDump || []).filter(item => (item.category || 'private') === activeContext);
  }, [brainDump, activeContext]);

  const filteredGoals = useMemo(() => {
    return (goals || []).filter(item => (item.category || 'private') === activeContext);
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
        createdAt: Date.now() // Note: PHP might prefer YYYY-MM-DD string, but let's try this
      };
      
      const result = await apiService.promoteToGoal(item.id, newGoalPayload);
      
      // Refresh Data
      await loadData();
      
      // Update UI
      if (result && result.newGoalId) {
          const newGoalRef = { id: result.newGoalId, ...newGoalPayload };
          setSelectedGoal(newGoalRef);
      }
      
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
      const parsed = JSON.parse(importJson);
      console.log("Importing is not implemented for MySQL yet.");
      setAlertMsg("Import not available in this version.");
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
          onDataChange={loadData}
          isLoading={isDataLoading}
          darkMode={darkMode}
        />
        <Goals
          goals={filteredGoals}
          activeContext={activeContext}
          setSelectedGoal={setSelectedGoal}
          setGoalViewMode={setGoalViewMode}
          onDataChange={loadData}
          isLoading={isDataLoading}
          darkMode={darkMode}
        />
      </main>

      {selectedGoal && <GoalDetailModal goal={selectedGoal} setGoal={setSelectedGoal} user={user} setAlertMsg={setAlertMsg} onDataChange={loadData} viewMode={goalViewMode} setViewMode={setGoalViewMode} darkMode={darkMode} />}
      {showImport && <ImportModal setShow={setShowImport} handleImport={handleImport} activeContext={activeContext} darkMode={darkMode} />}
    </div>
  );
}