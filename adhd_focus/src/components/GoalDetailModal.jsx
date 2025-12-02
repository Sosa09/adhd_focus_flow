import React, { useState } from 'react';
import { X, Trash2, Wand2, Sparkles, Loader2, Columns, ListOrdered, CheckCircle2, Circle, ArrowRight, ArrowLeft, Zap, Puzzle, HardHat } from 'lucide-react';
import { AI_PERSONAS } from '../constants/personas.js';
import * as apiService from '../services/apiService.js'; // Import all functions from apiService
import { organizeGoalTasks } from '../services/ai.js';

const GoalDetailModal = ({ goal, setGoal, user, setAlertMsg, onDataChange, viewMode, setViewMode, darkMode }) => {
  const [goalDumpInput, setGoalDumpInput] = useState('');
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [activePersona, setActivePersona] = useState('action');

  const isWork = goal.category === 'work';
  const textMain = darkMode ? 'text-slate-100' : 'text-slate-800';
  const textSub = darkMode ? 'text-slate-400' : 'text-slate-500';
  const inputBg = darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400';
  const ringAccent = isWork ? 'focus:ring-indigo-500' : 'focus:ring-emerald-500';
  const textAccent = isWork ? 'text-indigo-600' : 'text-emerald-600';
  const bgAccent = isWork ? 'bg-indigo-600' : 'bg-emerald-600';
  const bgAccentHover = isWork ? 'hover:bg-indigo-700' : 'hover:bg-emerald-700';

  const handleEditGoalDetails = async (field, value) => {
    if (!goal || !user) return;
    setGoal(prev => ({ ...prev, [field]: value }));
    try { // Send full goal object for update
      await apiService.updateDocument('goals', goal.id, { ...goal, [field]: value });
    } catch (error) {
      console.error("Error updating goal:", error);
      setAlertMsg("Failed to update goal details.");
    }
  };

  const handleMagicOrganize = async () => {
    if (!goalDumpInput.trim()) return;
    setIsOrganizing(true);
    try {
      const tasksArray = await organizeGoalTasks(goalDumpInput, activePersona);
      if (Array.isArray(tasksArray)) {
        const newTasks = tasksArray.map((text, idx) => ({ id: `t-${Date.now()}-${idx}`, text: text, done: false, status: 'todo' }));
        const updatedTasks = [...(goal.tasks || []), ...newTasks];
        await apiService.updateDocument('goals', goal.id, { ...goal, tasks: updatedTasks });
        onDataChange(); // <-- REFRESH DATA
        setGoalDumpInput('');
        setAlertMsg(`✨ ${AI_PERSONAS[activePersona].name} created ${newTasks.length} tasks!`);
      }
    } catch (error) {
      console.error(error);
      setAlertMsg("AI Error: Couldn't organize. Try simpler text.");
    } finally {
      setIsOrganizing(false);
    }
  };

  const toggleTask = async (taskId) => {
    const updatedTasks = goal.tasks.map(t => t.id === taskId ? { ...t, done: !t.done, status: !t.done ? 'done' : 'todo' } : t);
    await apiService.updateDocument('goals', goal.id, { ...goal, tasks: updatedTasks });
    onDataChange(); // <-- REFRESH DATA
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    const updatedTasks = goal.tasks.map(t => t.id === taskId ? { ...t, status: newStatus, done: newStatus === 'done' } : t);
    await apiService.updateDocument('goals', goal.id, { ...goal, tasks: updatedTasks });
    onDataChange(); // <-- REFRESH DATA
  };

  const deleteTask = async (taskId) => {
    const updatedTasks = goal.tasks.filter(t => t.id !== taskId);
    await apiService.updateDocument('goals', goal.id, { ...goal, tasks: updatedTasks });
    onDataChange(); // <-- REFRESH DATA
  };

  const deleteGoalHandler = async () => {
    if (window.confirm(`Are you sure you want to delete the goal: "${goal.title}"?`)) {
      await apiService.deleteDocument('goals', goal.id);
      onDataChange(); // <-- REFRESH DATA
      setGoal(null);
    }
  };

  const calculateProgress = (tasks) => {
    if (!tasks || tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.done).length;
    return Math.round((completed / tasks.length) * 100);
  };

  const getPersonaIcon = (iconName) => {
    switch (iconName) {
      case 'zap': return <Zap className="w-3 h-3" />;
      case 'puzzle': return <Puzzle className="w-3 h-3" />;
      case 'hardhat': return <HardHat className="w-3 h-3" />;
      default: return <Zap className="w-3 h-3" />;
    }
  };

  const getTaskStatus = (t) => t.status || (t.done ? 'done' : 'todo');

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`rounded-3xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 ${darkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
        <div className={`p-6 border-b flex justify-between items-start ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
          <div className="flex-1 mr-6 space-y-3">
            <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${isWork ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>{goal.category} Goal</span>
            <input type="text" value={goal.title} onChange={(e) => handleEditGoalDetails('title', e.target.value)} className={`w-full text-2xl font-bold bg-transparent border-b border-transparent focus:outline-none transition-colors ${isWork ? 'focus:border-indigo-500 hover:border-indigo-500' : 'focus:border-emerald-500 hover:border-emerald-500'} ${textMain}`} placeholder="Goal Title" />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Details</label>
                <input type="text" value={goal.description} onChange={(e) => handleEditGoalDetails('description', e.target.value)} className={`w-full text-sm bg-transparent border-b border-transparent focus:outline-none transition-colors ${isWork ? 'focus:border-indigo-500 hover:border-indigo-500' : 'focus:border-emerald-500 hover:border-emerald-500'} ${textSub}`} />
              </div>
              <div className="space-y-1">
                <label className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Deadline</label>
                <input type="text" value={goal.deadline || ''} placeholder="Set deadline..." onChange={(e) => handleEditGoalDetails('deadline', e.target.value)} className={`w-full text-sm bg-transparent border-b border-transparent focus:outline-none transition-colors ${isWork ? 'focus:border-indigo-500 hover:border-indigo-500' : 'focus:border-emerald-500 hover:border-emerald-500'} ${textSub}`} />
              </div>
            </div>
          </div>
          <div className="flex flex-col space-y-2">
            <button onClick={() => setGoal(null)} className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}><X className="w-6 h-6" /></button>
            <button onClick={deleteGoalHandler} className="p-2 rounded-full hover:bg-rose-100 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 className="w-6 h-6" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          <div className={`w-full md:w-[35%] p-6 flex flex-col border-b md:border-b-0 md:border-r ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
            <div className="flex items-center space-x-2 mb-4"><Wand2 className={`w-5 h-5 ${textAccent}`} /><h3 className={`font-bold ${textMain}`}>Smart Plan</h3></div>
            <div className="flex space-x-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
              {Object.values(AI_PERSONAS).map((persona) => (
                <button key={persona.id} onClick={() => setActivePersona(persona.id)} className={`text-xs px-2 py-1.5 rounded-lg flex items-center space-x-1 border transition-all whitespace-nowrap ${activePersona === persona.id ? (isWork ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-emerald-100 border-emerald-300 text-emerald-700') : (darkMode ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50')}`} title={persona.desc}>
                  {getPersonaIcon(persona.iconName)}
                  <span>{persona.name}</span>
                </button>
              ))}
            </div>
            <p className={`text-xs mb-3 ${textSub}`}>{AI_PERSONAS[activePersona].desc} Dump thoughts here:</p>
            <textarea value={goalDumpInput} onChange={(e) => setGoalDumpInput(e.target.value)} placeholder="E.g. I need to email the client but first I have to find the contract..." className={`flex-1 p-4 rounded-xl resize-none focus:outline-none focus:ring-2 mb-4 text-sm leading-relaxed ${inputBg} ${ringAccent}`} />
            <button onClick={handleMagicOrganize} disabled={!goalDumpInput.trim() || isOrganizing} className={`w-full py-3 text-white rounded-xl font-medium transition-colors flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50 ${bgAccent} ${bgAccentHover}`}>
              {isOrganizing ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Thinking...</span></> : <><Sparkles className="w-4 h-4" /><span>Generate Plan</span></>}
            </button>
          </div>

          <div className="w-full md:w-[65%] p-6 flex flex-col overflow-hidden bg-slate-50/5 dark:bg-slate-900/50">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                {viewMode === 'board' ? <Columns className={`w-5 h-5 ${textAccent}`} /> : <ListOrdered className={`w-5 h-5 ${textAccent}`} />}
                <h3 className={`font-bold ${textMain}`}>{viewMode === 'board' ? 'Kanban Board' : 'Action Plan'}</h3>
              </div>
              <div className="flex items-center space-x-4">
                <div className={`flex p-1 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                  <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-800 dark:bg-slate-700 dark:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}><ListOrdered className="w-4 h-4" /></button>
                  <button onClick={() => setViewMode('board')} className={`p-1.5 rounded-md transition-all ${viewMode === 'board' ? 'bg-white shadow-sm text-slate-800 dark:bg-slate-700 dark:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}><Columns className="w-4 h-4" /></button>
                </div>
                <span className={`text-xs font-bold ${textAccent}`}>{calculateProgress(goal.tasks || [])}% Done</span>
              </div>
            </div>
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full mb-6 overflow-hidden shrink-0">
              <div className={`h-full transition-all duration-500 ${bgAccent}`} style={{ width: `${calculateProgress(goal.tasks || [])}%` }} />
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {!goal.tasks || goal.tasks.length === 0 ? (
                <div className={`text-center py-20 italic text-sm ${textSub}`}>No tasks yet. Use the Smart Plan tool!</div>
              ) : viewMode === 'list' ? (
                goal.tasks.map((task) => (
                  <div key={task.id} className={`flex items-start space-x-3 p-3 rounded-xl transition-all group ${task.done ? (darkMode ? 'bg-slate-800/30 text-slate-500' : 'bg-slate-100/50 text-slate-400') : (darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200 shadow-sm')}`}>
                    <button onClick={() => toggleTask(task.id)} className={`mt-0.5 flex-shrink-0 transition-colors ${task.done ? textAccent : 'text-slate-300 hover:text-slate-500'}`}>
                      {task.done ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                    </button>
                    <span className={`text-sm flex-1 leading-relaxed ${task.done ? 'line-through' : textMain}`}>{task.text}</span>
                    <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
                  <div className={`flex flex-col h-full rounded-xl p-3 ${darkMode ? 'bg-slate-800/50' : 'bg-slate-100/50'}`}>
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center space-x-2 ${textSub}`}><Circle className="w-3 h-3" /> <span>To Do</span></h4>
                    <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                      {goal.tasks.filter(t => getTaskStatus(t) === 'todo').map(t => (
                        <div key={t.id} onClick={() => updateTaskStatus(t.id, 'doing')} className={`p-3 rounded-lg text-xs border shadow-sm cursor-pointer hover:scale-[1.02] transition-all group relative ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}>
                          {t.text}
                          <ArrowRight className="absolute right-2 top-3 w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className={`flex flex-col h-full rounded-xl p-3 ${darkMode ? 'bg-indigo-900/10' : 'bg-indigo-50/50'}`}>
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center space-x-2 ${isWork ? 'text-indigo-500' : 'text-emerald-500'}`}><Loader2 className="w-3 h-3" /> <span>Doing</span></h4>
                    <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                      {goal.tasks.filter(t => getTaskStatus(t) === 'doing').map(t => (
                        <div key={t.id} className={`p-3 rounded-lg text-xs border shadow-sm cursor-pointer transition-all group relative ${darkMode ? 'bg-slate-800 border-indigo-500/30 text-slate-200' : 'bg-white border-indigo-100 text-slate-700'}`}>
                          <div className="absolute right-1 top-1 flex space-x-1 opacity-0 group-hover:opacity-100">
                            <button onClick={(e) => { e.stopPropagation(); updateTaskStatus(t.id, 'todo'); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><ArrowLeft className="w-3 h-3 text-slate-400" /></button>
                            <button onClick={(e) => { e.stopPropagation(); updateTaskStatus(t.id, 'done'); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><ArrowRight className="w-3 h-3 text-slate-400" /></button>
                          </div>
                          <div onClick={() => updateTaskStatus(t.id, 'done')}>{t.text}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className={`flex flex-col h-full rounded-xl p-3 ${darkMode ? 'bg-emerald-900/10' : 'bg-emerald-50/50'}`}>
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center space-x-2 text-emerald-600"><CheckCircle2 className="w-3 h-3" /> <span>Done</span></h4>
                    <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                      {goal.tasks.filter(t => getTaskStatus(t) === 'done').map(t => (
                        <div key={t.id} className={`p-3 rounded-lg text-xs border shadow-sm opacity-60 group relative ${darkMode ? 'bg-slate-800 border-emerald-500/20 text-slate-400 line-through' : 'bg-white border-emerald-100 text-slate-500 line-through'}`}>
                          <div className="absolute right-1 top-1 flex space-x-1 opacity-0 group-hover:opacity-100">
                            <button onClick={(e) => { e.stopPropagation(); updateTaskStatus(t.id, 'doing'); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><ArrowLeft className="w-3 h-3 text-slate-400" /></button>
                            <button onClick={(e) => { e.stopPropagation(); deleteTask(t.id); }} className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded"><Trash2 className="w-3 h-3 text-rose-400" /></button>
                          </div>
                          {t.text}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalDetailModal;