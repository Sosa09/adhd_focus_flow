import React, { useState, useRef, useCallback, useReducer } from 'react';
import { Layout, Sparkles, ArrowUpRight, Plus, CheckCircle2, Circle, Trash2, XCircle } from 'lucide-react';
import * as apiService from '../services/apiService.js'; // Import all functions from apiService
import { organizeBrainDump } from '../services/ai.js';

const BrainDump = ({ user, filteredBrainDump, activeContext, promoteToGoal, setAlertMsg, onDataChange, isLoading, darkMode }) => {
  const [brainDumpInput, setBrainDumpInput] = useState('');
  const abortControllerRef = useRef(null);
  const isOrganizingRef = useRef(false);
  const [, forceUpdate] = useReducer(x => x + 1, 0); // A simple way to force a re-render

  const isWork = activeContext === 'work';
  const cardBg = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const textMain = darkMode ? 'text-slate-100' : 'text-slate-800';
  const textSub = darkMode ? 'text-slate-400' : 'text-slate-500';
  const inputBg = darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400';
  const ringAccent = isWork ? 'focus:ring-indigo-500' : 'focus:ring-emerald-500';
  const textAccent = isWork ? 'text-indigo-600' : 'text-emerald-600';

  const addBrainDumpItem = async (e) => {
    if (e) e.preventDefault();
    if (!brainDumpInput.trim() || !user) return;

    try {
      // The backend will handle user_id based on the token
      await apiService.addDocument('braindump', {
        text: brainDumpInput,
        done: false,
        category: activeContext,
        createdAt: Date.now()
      });
      setBrainDumpInput('');
      onDataChange(); // <-- REFRESH DATA
    } catch (error) {
      console.error("Error adding dump:", error);
      setAlertMsg("Failed to add item.");
    }
  };

  const handleMagicBrainDump = useCallback(async () => {
    if (!brainDumpInput.trim() || !user) return;

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      // Pass the signal to the AI function
      const itemsArray = await organizeBrainDump(brainDumpInput, activeContext, signal);

      if (Array.isArray(itemsArray)) {
        itemsArray.forEach(text => {
          // Add each item individually via API
          apiService.addDocument('braindump', {
            text: text,
            done: false,
            category: activeContext,
            createdAt: Date.now()
          });
        });
        // No batch commit for now, individual adds
        setBrainDumpInput('');
        await onDataChange(); // <-- REFRESH DATA
        setAlertMsg(`✨ Added ${itemsArray.length} items to ${activeContext} dump!`);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log("AI request was cancelled by the user.");
        setAlertMsg("AI request cancelled.");
      } else {
        console.error(error);
        setAlertMsg("AI Error: Couldn't organize dump. Try simpler text.");
      }
    } finally {
      // This is the crucial part: ensure the state is always reset.
      isOrganizingRef.current = false;
      abortControllerRef.current = null;
      forceUpdate(); // Force a re-render to hide the spinner
    }
  }, [user, activeContext, brainDumpInput]); // Keep brainDumpInput to get the latest value

  const cancelMagicBrainDump = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const toggleBrainDumpItem = async (item) => {
    if (!user) return;
    await apiService.updateDocument('braindump', item.id, { ...item, done: !item.done });
    onDataChange(); // <-- REFRESH DATA
  };

  const deleteBrainDumpItem = async (itemId) => {
    if (!user) return;
    if (window.confirm("Are you sure you want to delete this item?")) {
      await apiService.deleteDocument('braindump', itemId);
      onDataChange(); // <-- REFRESH DATA
    }
  };

  return (
    <div className="lg:col-span-4 space-y-6">
      <div className={`rounded-2xl shadow-sm border p-6 h-full max-h-[85vh] flex flex-col transition-colors duration-300 ${cardBg}`}>
        <h2 className={`text-lg font-bold flex items-center mb-4 ${textMain}`}>
          <Layout className={`w-5 h-5 mr-2 ${textAccent}`} />
          {activeContext === 'work' ? 'Work Dump' : 'Life Dump'}
        </h2>
        <p className={`text-xs mb-4 ${textSub}`}>
          Clear your {activeContext} mind. Use <Sparkles className={`w-3 h-3 inline ${textAccent}`} /> to AI-Split, and <ArrowUpRight className={`w-3 h-3 inline mx-1 ${textAccent}`} /> to promote to a goal.
        </p>

        <div className="relative mb-4">
          <textarea
            rows={3}
            value={brainDumpInput}
            onChange={(e) => setBrainDumpInput(e.target.value)}
            placeholder={`Type ${activeContext} tasks...`}
            className={`w-full pl-4 pr-20 py-3 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all resize-none ${inputBg} ${ringAccent}`}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addBrainDumpItem(e); } }}
          />
          <div className="absolute right-2 bottom-2 flex space-x-1">
            {isOrganizingRef.current ? (
              <button onClick={cancelMagicBrainDump} className="p-2 rounded-lg bg-rose-500/20 text-rose-500 hover:bg-rose-500/30" title="Cancel AI Split">
                <XCircle className="w-5 h-5" />
              </button>
            ) : (
              <button onClick={handleMagicBrainDump} disabled={!brainDumpInput.trim()} className={`p-2 rounded-lg transition-colors ${darkMode ? (isWork ? 'bg-indigo-900/50 text-indigo-400' : 'bg-emerald-900/50 text-emerald-400') : (isWork ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600')}`} title="Magic AI Split">
                <Sparkles className="w-5 h-5" />
              </button>
            )}
            <button onClick={addBrainDumpItem} disabled={!brainDumpInput.trim()} className={`p-2 rounded-lg transition-colors ${darkMode ? (isWork ? 'bg-indigo-900/50 text-indigo-400' : 'bg-emerald-900/50 text-emerald-400') : (isWork ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600')}`} title="Add Single Item">
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
          {isLoading ? (
            <div className="space-y-2">
              <div className={`h-12 rounded-xl animate-pulse ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
              <div className={`h-12 rounded-xl animate-pulse ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`} style={{ animationDelay: '100ms' }}></div>
              <div className={`h-12 rounded-xl animate-pulse ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`} style={{ animationDelay: '200ms' }}></div>
            </div>
          ) : (
            filteredBrainDump.length === 0 ? (
            <div className={`text-center py-10 italic text-sm ${textSub}`}>
              No {activeContext} items. Mind clear?
            </div>
            ) : (
              filteredBrainDump.map((item) => (
            <div key={item.id} className={`group flex items-start space-x-3 p-3 rounded-xl transition-all border ${item.done ? (darkMode ? 'bg-slate-800/50 border-slate-800 opacity-50' : 'bg-slate-50 border-slate-100 opacity-60') : (darkMode ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-100 hover:bg-slate-50 shadow-sm')}`}>
              <button onClick={() => toggleBrainDumpItem(item)} className={`mt-0.5 flex-shrink-0 transition-colors ${item.done ? (isWork ? 'text-indigo-500' : 'text-emerald-500') : 'text-slate-400 hover:text-slate-600'}`}>
                {item.done ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
              </button>
              <span className={`text-sm flex-1 leading-relaxed break-words ${item.done ? 'line-through text-slate-500' : textMain}`}>
                {item.text}
              </span>
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!item.done && (
                  <button onClick={() => promoteToGoal(item)} title={`Promote to ${activeContext} Goal`} className={`p-1 rounded-md transition-colors ${isWork ? 'text-indigo-500 hover:bg-indigo-100' : 'text-emerald-500 hover:bg-emerald-100'}`}>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => deleteBrainDumpItem(item.id)} className="p-1 text-slate-400 hover:bg-rose-100 hover:text-rose-500 rounded-md transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default BrainDump;