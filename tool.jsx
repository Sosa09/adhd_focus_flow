import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  MoreHorizontal, 
  TrendingUp, 
  X, 
  Upload,
  Layout,
  Brain,
  Moon,
  Sun,
  ArrowUpRight,
  Calendar,
  AlertCircle,
  Sparkles,
  ListTodo,
  Wand2,
  Loader2,
  Briefcase,
  Coffee,
  ListOrdered,
  Zap,
  Puzzle,
  HardHat,
  Columns,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken,
  onAuthStateChanged 
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch
} from "firebase/firestore";

const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

const AI_PERSONAS = {
  action: {
    id: 'action',
    name: 'Action Hero',
    iconName: 'zap',
    desc: 'Punchy, verb-first commands.',
    prompt: `
      You are an energetic Action Coach. 
      Goal: Convert the user's thoughts into high-impact, verb-first tasks.
      Rules:
      1. Start every task with a strong verb (Call, Buy, Write).
      2. Be specific but concise (under 8 words).
      3. Remove all fluff and anxiety.
      Return ONLY a raw JSON array of strings.
    `
  },
  micro: {
    id: 'micro',
    name: 'Micro-Breaker',
    iconName: 'puzzle',
    desc: 'Tiny steps for overwhelm.',
    prompt: `
      You are an ADHD Coach specializing in Paralysis.
      Goal: Break the user's goal into "Atomic Steps" so small they feel easy.
      Rules:
      1. The "2-Minute Rule": If a task looks hard, split it. 
      2. E.g., "Clean Kitchen" -> ["Put away milk", "Load dishwasher top rack", "Wipe counter"].
      3. Use encouraging, neutral language.
      Return ONLY a raw JSON array of strings.
    `
  },
  manager: {
    id: 'manager',
    name: 'Project Mgr',
    iconName: 'hardhat',
    desc: 'Logical dependency order.',
    prompt: `
      You are a Logical Project Manager.
      Goal: Organize tasks by dependency and priority.
      Rules:
      1. Chronological Order: Ensure "Step A" comes before "Step B" if B depends on A.
      2. Identify Blockers: Put the most critical prerequisite task first.
      3. Group related tasks together.
      Return ONLY a raw JSON array of strings.
    `
  }
};

export default function App() {
  const [user, setUser] = useState(null);
  const [brainDump, setBrainDump] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeContext, setActiveContext] = useState('work');
  const [activePersona, setActivePersona] = useState('action');

  const [brainDumpInput, setBrainDumpInput] = useState('');
  const [isOrganizingDump, setIsOrganizingDump] = useState(false); 
  const [darkMode, setDarkMode] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');
  
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [goalViewMode, setGoalViewMode] = useState('list');
  
  const [goalDumpInput, setGoalDumpInput] = useState('');
  const [isOrganizing, setIsOrganizing] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth failed", error);
        setAlertMsg("Authentication failed. Reload to try again.");
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const dumpRef = collection(db, 'artifacts', appId, 'users', user.uid, 'brainDump');
    const unsubDump = onSnapshot(dumpRef, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setBrainDump(data.sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    }, (error) => {
      console.error("BrainDump sync error:", error);
      setAlertMsg("Error syncing data.");
    });

    const goalsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'goals');
    const unsubGoals = onSnapshot(goalsRef, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setGoals(data.sort((a, b) => a.createdAt - b.createdAt));
    }, (error) => {
      console.error("Goals sync error:", error);
    });

    return () => {
      unsubDump();
      unsubGoals();
    };
  }, [user]);

  useEffect(() => {
    if (selectedGoal) {
      const liveGoal = goals.find(g => g.id === selectedGoal.id);
      if (liveGoal) {
        setSelectedGoal(liveGoal);
        // Only update view mode if switching contexts contextually if needed
      } else {
        setSelectedGoal(null);
      }
    }
  }, [goals]);

  const calculateProgress = (tasks) => {
    if (!tasks || tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.done).length;
    return Math.round((completed / tasks.length) * 100);
  };

  const filteredBrainDump = useMemo(() => {
    return brainDump.filter(item => (item.category || 'private') === activeContext);
  }, [brainDump, activeContext]);

  const filteredGoals = useMemo(() => {
    return goals.filter(item => (item.category || 'private') === activeContext);
  }, [goals, activeContext]);

  useEffect(() => {
    if (alertMsg) {
      const timer = setTimeout(() => setAlertMsg(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [alertMsg]);

  const addBrainDump = async (e) => {
    if(e) e.preventDefault();
    if (!brainDumpInput.trim() || !user) return;
    
    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'brainDump'), {
        text: brainDumpInput,
        done: false,
        category: activeContext,
        createdAt: Date.now()
      });
      setBrainDumpInput('');
    } catch (error) {
      console.error("Error adding dump:", error);
    }
  };

  const handleMagicBrainDump = async () => {
    if (!brainDumpInput.trim() || !user) return;
    setIsOrganizingDump(true);
    const apiKey = ""; 

    try {
      const systemPrompt = `
        You are an executive function assistant specialized in task decomposition.
        Your goal is to extract clear, high-quality, actionable task titles from a messy stream of consciousness.

        Guidelines for Titles & Splitting:
        1. **Parse Meta-Instructions:** If the user says "combine these" or "create one dump", group those items. If they just list them, split them.
        2. **Logical Separation:** - Distinct actions -> SPLIT (e.g. "Call Mom, fix door").
           - Distinct projects -> SPLIT.
        3. **Verb-First:** Start with a strong action verb (e.g., "Call", "Draft", "Buy", "Schedule").
        4. **Preserve Intent when Grouping:** If grouping items (e.g. multiple trainings), use a verb that matches the INTENT. 
           - Bad: "Consolidate training materials".
           - Good: "Complete trainings: Vector, Grafana, QuestDB".
        5. **No Fluff:** Remove "I need to", "maybe", "probably".

        Return ONLY a raw JSON array of strings.
      `;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: brainDumpInput }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { responseMimeType: "application/json" }
          })
        }
      );

      if (!response.ok) throw new Error('AI Request Failed');

      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      const itemsArray = JSON.parse(cleanJson);

      if (Array.isArray(itemsArray)) {
        const batch = writeBatch(db);
        itemsArray.forEach(text => {
           const newRef = doc(collection(db, 'artifacts', appId, 'users', user.uid, 'brainDump'));
           batch.set(newRef, {
             text: text,
             done: false,
             category: activeContext,
             createdAt: Date.now()
           });
        });
        await batch.commit();
        setBrainDumpInput('');
        setAlertMsg(`✨ Added ${itemsArray.length} items to ${activeContext} dump!`);
      }
    } catch (error) {
      console.error(error);
      setAlertMsg("AI Error: Couldn't organize dump. Try simpler text.");
    } finally {
      setIsOrganizingDump(false);
    }
  };

  const toggleBrainDump = async (item) => {
    if (!user) return;
    try {
      const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'brainDump', item.id);
      await updateDoc(ref, { done: !item.done });
    } catch (error) {
      console.error("Error toggling dump:", error);
    }
  };

  const deleteBrainDump = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'brainDump', id));
    } catch (error) {
      console.error("Error deleting dump:", error);
    }
  };

  const generateMotivatingDescription = async (goalTitle) => {
    const apiKey = "";
    const systemPrompt = `
      You are an ADHD Executive Function Coach. The user is promoting a task to a weekly goal. Your job is to generate a concise (2 sentence max), inspiring, and clarifying description for this goal.
      The description should answer: "Why am I doing this?" and "What is the expected long-term win?" Use motivating and encouraging language.
      Goal: "${goalTitle}"
      Return ONLY the raw string description. Do NOT use markdown formatting or any prefixes (e.g., do not start with "Description:" or "Here is the plan:").
    `;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Generate description for goal: ${goalTitle}` }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
          })
        }
      );

      if (!response.ok) throw new Error('AI Description Generation Failed');

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No AI description generated.';

    } catch (error) {
      console.error("Description AI Error:", error);
      return 'AI failed to generate motivation. Manual description required.';
    }
  }
  
  const promoteToGoal = async (item) => {
    if (!user) return;
    
    if (filteredGoals.length >= 3) {
      setAlertMsg(`Weekly Limit: Max 3 ${activeContext} Goals! Finish one first.`);
      return;
    }

    try {
      setAlertMsg(`✨ Generating motivation for "${item.text}"...`);
      
      const description = await generateMotivatingDescription(item.text);
      
      const newGoalRef = await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'goals'), {
        title: item.text,
        description: description, 
        deadline: '',
        category: activeContext,
        tasks: [],
        updates: [],
        createdAt: Date.now()
      });

      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'brainDump', item.id));

      setSelectedGoal({
        id: newGoalRef.id,
        title: item.text,
        description: description,
        deadline: '',
        category: activeContext,
        tasks: [],
        updates: []
      });
      setGoalViewMode(activeContext === 'work' ? 'board' : 'list');
      setAlertMsg(`Goal Promoted: "${item.text}" is now a Big 3 Focus.`);


    } catch (error) {
      console.error("Error promoting goal:", error);
      setAlertMsg("Failed to promote goal.");
    }
  };

  const handleEditGoalDetails = async (field, value) => {
    if (!selectedGoal || !user) return;
    setSelectedGoal(prev => ({ ...prev, [field]: value }));
    try {
      const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'goals', selectedGoal.id);
      await updateDoc(ref, { [field]: value });
    } catch (error) {
      console.error("Error updating goal:", error);
    }
  };

  const handleMagicOrganize = async () => {
    if (!goalDumpInput.trim()) return;
    setIsOrganizing(true);
    const apiKey = "";

    try {
      const systemPrompt = AI_PERSONAS[activePersona].prompt;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: goalDumpInput }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { responseMimeType: "application/json" }
          })
        }
      );

      if (!response.ok) throw new Error('AI Request Failed');

      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      const tasksArray = JSON.parse(cleanJson);

      if (Array.isArray(tasksArray)) {
        const newTasks = tasksArray.map((text, idx) => ({
          id: `t-${Date.now()}-${idx}`,
          text: text,
          done: false,
          status: 'todo'
        }));

        const updatedTasks = [...(selectedGoal.tasks || []), ...newTasks];

        if (user && selectedGoal) {
            const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'goals', selectedGoal.id);
            await updateDoc(ref, { tasks: updatedTasks });
        }

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
    if (!selectedGoal || !user) return;
    const updatedTasks = selectedGoal.tasks.map(t => 
      t.id === taskId ? { ...t, done: !t.done, status: !t.done ? 'done' : 'todo' } : t
    );
    try {
      const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'goals', selectedGoal.id);
      await updateDoc(ref, { tasks: updatedTasks });
    } catch (error) {
      console.error("Error toggling task:", error);
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    if (!selectedGoal || !user) return;
    const updatedTasks = selectedGoal.tasks.map(t => 
      t.id === taskId ? { ...t, status: newStatus, done: newStatus === 'done' } : t
    );
    try {
      const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'goals', selectedGoal.id);
      await updateDoc(ref, { tasks: updatedTasks });
    } catch (error) {
      console.error("Error moving task:", error);
    }
  };

  const deleteTask = async (taskId) => {
    if (!selectedGoal || !user) return;
    const updatedTasks = selectedGoal.tasks.filter(t => t.id !== taskId);
    try {
      const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'goals', selectedGoal.id);
      await updateDoc(ref, { tasks: updatedTasks });
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const deleteGoal = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'goals', id));
      if (selectedGoal?.id === id) setSelectedGoal(null);
    } catch (error) {
      console.error("Error deleting goal:", error);
    }
  };

  const handleImport = async () => {
    if (!user) return;
    try {
      const parsed = JSON.parse(importJson);
      if (parsed.brainDump && Array.isArray(parsed.goals)) {
        const batch = writeBatch(db);

        parsed.brainDump.forEach(bd => {
          const newRef = doc(collection(db, 'artifacts', appId, 'users', user.uid, 'brainDump'));
          batch.set(newRef, {
            text: bd.text || "Imported Item",
            done: bd.done || false,
            category: activeContext,
            createdAt: Date.now()
          });
        });

        const goalsToAdd = parsed.goals.slice(0, 3);
        goalsToAdd.forEach(g => {
            const newRef = doc(collection(db, 'artifacts', appId, 'users', user.uid, 'goals'));
            batch.set(newRef, {
                title: g.title || "Imported Goal",
                description: g.description || "",
                deadline: g.deadline || "",
                category: activeContext,
                tasks: g.tasks || [],
                updates: [],
                createdAt: Date.now()
            });
        });

        await batch.commit();
        setShowImport(false);
        setImportJson('');
        setAlertMsg(`Imported successfully to ${activeContext} view!`);
      } else {
        alert('Invalid JSON structure.');
      }
    } catch (e) {
      console.error(e);
      alert('Invalid JSON syntax.');
    }
  };

  const chartData = useMemo(() => {
    return filteredGoals.map(g => {
      const p = calculateProgress(g.tasks);
      const isWork = activeContext === 'work';
      return {
        name: g.title.length > 10 ? g.title.substring(0, 10) + '...' : g.title,
        progress: p,
        fill: p === 100 ? '#10b981' : (isWork ? '#4f46e5' : '#047857') 
      };
    });
  }, [filteredGoals, activeContext]);

  const isWork = activeContext === 'work';
  const bgMain = darkMode ? 'bg-slate-950' : 'bg-slate-50';
  const textMain = darkMode ? 'text-slate-100' : 'text-slate-800';
  const textSub = darkMode ? 'text-slate-400' : 'text-slate-500';
  const cardBg = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const inputBg = darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400';
  const headerBg = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';

  const ringAccent = isWork ? 'focus:ring-indigo-500' : 'focus:ring-emerald-500';
  const textAccent = isWork ? 'text-indigo-600' : 'text-emerald-600';
  const bgAccent = isWork ? 'bg-indigo-600' : 'bg-emerald-600';
  const bgAccentHover = isWork ? 'hover:bg-indigo-700' : 'hover:bg-emerald-700';
  const bgAccentLight = isWork ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700';
  const darkModeClass = darkMode ? 'dark' : '';

  const getTaskStatus = (t) => {
    if (t.status) return t.status;
    return t.done ? 'done' : 'todo';
  };

  const getPersonaIcon = (iconName) => {
    switch (iconName) {
      case 'zap': return <Zap className="w-3 h-3" />;
      case 'puzzle': return <Puzzle className="w-3 h-3" />;
      case 'hardhat': return <HardHat className="w-3 h-3" />;
      default: return <Zap className="w-3 h-3" />;
    }
  };

  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin" />
        </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans selection:bg-emerald-500/30 selection:text-emerald-200 transition-colors duration-300 ${bgMain} ${textMain} ${darkModeClass}`}>
      
      {alertMsg && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-top-4 zoom-in-95 duration-300">
          <div className={`${bgAccent} text-white px-6 py-3 rounded-full shadow-xl flex items-center space-x-2 font-bold tracking-wide`}>
            <Sparkles className="w-5 h-5 text-yellow-300" />
            <span>{alertMsg}</span>
          </div>
        </div>
      )}

      <header className={`${headerBg} border-b sticky top-0 z-10 transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className={`p-2 rounded-lg shadow-lg ${isWork ? 'bg-indigo-600 shadow-indigo-500/20' : 'bg-emerald-700 shadow-emerald-500/20'}`}>
              <Brain className="w-6 h-6 text-white" />
            </div>
            <h1 className={`text-2xl font-bold tracking-tight ${textMain}`}>Focus<span className={textAccent}>Flow</span></h1>
          </div>

          <div className={`flex p-1 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
            <button
                onClick={() => setActiveContext('work')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${activeContext === 'work' ? 'bg-white shadow-sm text-indigo-600 scale-105' : 'text-slate-500 hover:text-indigo-500'}`}
            >
                <Briefcase className="w-4 h-4" />
                <span className="hidden sm:inline">Work</span>
            </button>
            <button
                onClick={() => setActiveContext('private')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${activeContext === 'private' ? 'bg-white shadow-sm text-emerald-600 scale-105' : 'text-slate-500 hover:text-emerald-500'}`}
            >
                <Coffee className="w-4 h-4" />
                <span className="hidden sm:inline">Private</span>
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-full transition-colors ${darkMode ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => setShowImport(true)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
            >
              <Upload className="w-4 h-4" />
              <span className="hidden md:inline">Import Plan</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-4 space-y-6">
          <div className={`rounded-2xl shadow-sm border p-6 h-full max-h-[85vh] flex flex-col transition-colors duration-300 ${cardBg}`}>
            <h2 className={`text-lg font-bold flex items-center mb-4 ${textMain}`}>
              <Layout className={`w-5 h-5 mr-2 ${textAccent}`} />
              {activeContext === 'work' ? 'Work Dump' : 'Life Dump'}
            </h2>
            <p className={`text-xs mb-4 ${textSub}`}>
              Clear your {activeContext} mind here. <br/>
              Use <Sparkles className={`w-3 h-3 inline ${textAccent}`}/> to AI-Split.<br/>
              Use <ArrowUpRight className={`w-3 h-3 inline mx-1 ${textAccent}`}/> to promote to {activeContext} Goal.
            </p>
            
            <div className="relative mb-4">
              <textarea
                rows={3}
                value={brainDumpInput}
                onChange={(e) => setBrainDumpInput(e.target.value)}
                placeholder={`Type ${activeContext} tasks...`}
                className={`w-full pl-4 pr-20 py-3 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all resize-none ${inputBg} ${ringAccent}`}
                onKeyDown={(e) => {
                    if(e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        addBrainDump(e);
                    }
                }}
              />
              <div className="absolute right-2 bottom-2 flex space-x-1">
                <button 
                    onClick={handleMagicBrainDump}
                    disabled={!brainDumpInput.trim() || isOrganizingDump}
                    className={`p-2 rounded-lg transition-colors ${darkMode ? (isWork ? 'bg-indigo-900/50 text-indigo-400' : 'bg-emerald-900/50 text-emerald-400') : (isWork ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600')}`}
                    title="Magic AI Split"
                >
                    {isOrganizingDump ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                </button>
                <button 
                    onClick={addBrainDump}
                    disabled={!brainDumpInput.trim()}
                    className={`p-2 rounded-lg transition-colors ${darkMode ? (isWork ? 'bg-indigo-900/50 text-indigo-400' : 'bg-emerald-900/50 text-emerald-400') : (isWork ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600')}`}
                    title="Add Single Item"
                >
                    <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {filteredBrainDump.length === 0 && (
                <div className={`text-center py-10 italic text-sm ${textSub}`}>
                  No {activeContext} items. Mind clear?
                </div>
              )}
              {filteredBrainDump.map((item) => (
                <div 
                  key={item.id} 
                  className={`group flex items-start space-x-3 p-3 rounded-xl transition-all border ${
                    item.done 
                      ? (darkMode ? 'bg-slate-800/50 border-slate-800 opacity-50' : 'bg-slate-50 border-slate-100 opacity-60') 
                      : (darkMode ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-100 hover:bg-slate-50 shadow-sm')
                  }`}
                >
                  <button onClick={() => toggleBrainDump(item)} className={`mt-0.5 flex-shrink-0 transition-colors ${item.done ? (isWork ? 'text-indigo-500' : 'text-emerald-500') : 'text-slate-400 hover:text-slate-600'}`}>
                    {item.done ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                  </button>
                  <span className={`text-sm flex-1 leading-relaxed break-words ${item.done ? 'line-through text-slate-500' : textMain}`}>
                    {item.text}
                  </span>
                  
                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     {!item.done && (
                      <button 
                        onClick={() => promoteToGoal(item)} 
                        title={`Promote to ${activeContext} Goal`}
                        className={`p-1 rounded-md transition-colors ${isWork ? 'text-indigo-500 hover:bg-indigo-100' : 'text-emerald-500 hover:bg-emerald-100'}`}
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                     )}
                    <button onClick={() => deleteBrainDump(item.id)} className="p-1 text-slate-400 hover:bg-rose-100 hover:text-rose-500 rounded-md transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-8">
          
          <div className={`rounded-2xl shadow-sm border p-6 transition-colors duration-300 ${cardBg}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-lg font-bold flex items-center ${textMain}`}>
                <TrendingUp className={`w-5 h-5 mr-2 ${textAccent}`} />
                {activeContext === 'work' ? 'Work Week Progress' : 'Life Week Progress'}
              </h2>
              <div className={`text-xs font-bold px-3 py-1 rounded-full ${filteredGoals.length >= 3 ? 'bg-rose-100 text-rose-600' : bgAccentLight}`}>
                {filteredGoals.length}/3 Weekly {activeContext === 'work' ? 'Work' : 'Life'} Goals
              </div>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12, fill: darkMode ? '#94a3b8' : '#64748b'}} />
                  <Tooltip 
                    cursor={{fill: darkMode ? '#334155' : '#f1f5f9'}}
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      backgroundColor: darkMode ? '#1e293b' : '#fff',
                      color: darkMode ? '#f8fafc' : '#0f172a',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                    }}
                  />
                  <Bar dataKey="progress" radius={[0, 4, 4, 0]} barSize={20}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {filteredGoals.length === 0 && (
              <div className={`p-10 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <Layout className={`w-10 h-10 mb-3 ${textSub}`} />
                <h3 className={`font-bold ${textMain}`}>No Active Weekly Goals ({activeContext})</h3>
                <p className={`text-sm mt-2 ${textSub}`}>Pick your "Big 3" for the week from the dump.</p>
              </div>
            )}
            {filteredGoals.map((goal) => {
               const progress = calculateProgress(goal.tasks);
               return (
                <div 
                  key={goal.id}
                  onClick={() => {
                    setSelectedGoal(goal);
                    setGoalViewMode(activeContext === 'work' ? 'board' : 'list');
                  }}
                  className={`rounded-2xl p-6 shadow-sm border transition-all cursor-pointer group relative overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-current' : 'bg-white border-slate-200 hover:shadow-md hover:border-current'} ${isWork ? 'hover:border-indigo-300' : 'hover:border-emerald-300'}`}
                >
                  <div 
                    className="absolute bottom-0 left-0 h-1 transition-all duration-500 ease-out" 
                    style={{ width: `${progress}%`, backgroundColor: progress === 100 ? '#10b981' : (isWork ? '#4f46e5' : '#047857') }} 
                  />

                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 pr-4">
                      <h3 className={`text-xl font-bold transition-colors ${isWork ? 'group-hover:text-indigo-600' : 'group-hover:text-emerald-600'} ${textMain}`}>{goal.title}</h3>
                      <p className={`text-sm mt-1 line-clamp-1 ${textSub}`}>{goal.description}</p>
                      {goal.deadline && (
                        <div className={`flex items-center mt-2 text-xs font-medium ${textAccent}`}>
                          <Calendar className="w-3 h-3 mr-1" />
                          {goal.deadline}
                        </div>
                      )}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${progress === 100 ? 'bg-emerald-100 text-emerald-800' : bgAccentLight}`}>
                      {progress}%
                    </div>
                  </div>

                  <div className={`mt-6 flex items-center justify-between text-sm ${textSub}`}>
                    <div className="flex items-center space-x-2">
                      <ListTodo className="w-4 h-4" />
                      <span>{goal.tasks.filter(t => !t.done).length} Remaining Tasks</span>
                    </div>
                    <div className={`flex items-center font-medium opacity-0 group-hover:opacity-100 transition-opacity ${textAccent}`}>
                      Open Goal <MoreHorizontal className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {selectedGoal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-3xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 ${darkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
            
            <div className={`p-6 border-b flex justify-between items-start ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
              <div className="flex-1 mr-6 space-y-3">
                <div className="flex items-center space-x-3 mb-1">
                    <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${isWork ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {selectedGoal.category || 'private'} Goal
                    </span>
                </div>
                <input 
                  type="text"
                  value={selectedGoal.title}
                  onChange={(e) => handleEditGoalDetails('title', e.target.value)}
                  className={`w-full text-2xl font-bold bg-transparent border-b border-transparent focus:outline-none transition-colors ${isWork ? 'focus:border-indigo-500 hover:border-indigo-500' : 'focus:border-emerald-500 hover:border-emerald-500'} ${textMain}`}
                  placeholder="Goal Title"
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Details</label>
                    <input 
                      type="text"
                      value={selectedGoal.description}
                      onChange={(e) => handleEditGoalDetails('description', e.target.value)}
                      className={`w-full text-sm bg-transparent border-b border-transparent focus:outline-none transition-colors ${isWork ? 'focus:border-indigo-500 hover:border-indigo-500' : 'focus:border-emerald-500 hover:border-emerald-500'} ${textSub}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Deadline</label>
                    <input 
                      type="text"
                      value={selectedGoal.deadline || ''}
                      placeholder="Set deadline..."
                      onChange={(e) => handleEditGoalDetails('deadline', e.target.value)}
                      className={`w-full text-sm bg-transparent border-b border-transparent focus:outline-none transition-colors ${isWork ? 'focus:border-indigo-500 hover:border-indigo-500' : 'focus:border-emerald-500 hover:border-emerald-500'} ${textSub}`}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-2">
                <button 
                  onClick={() => setSelectedGoal(null)}
                  className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}
                >
                  <X className="w-6 h-6" />
                </button>
                <button 
                  onClick={() => deleteGoal(selectedGoal.id)}
                  className="p-2 rounded-full hover:bg-rose-100 text-slate-400 hover:text-rose-500 transition-colors"
                >
                  <Trash2 className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              
              <div className={`w-full md:w-[35%] p-6 flex flex-col border-b md:border-b-0 md:border-r ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                        <Wand2 className={`w-5 h-5 ${textAccent}`} />
                        <h3 className={`font-bold ${textMain}`}>Smart Plan</h3>
                    </div>
                </div>
                
                <div className="flex space-x-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
                  {Object.values(AI_PERSONAS).map((persona) => (
                    <button
                      key={persona.id}
                      onClick={() => setActivePersona(persona.id)}
                      className={`text-xs px-2 py-1.5 rounded-lg flex items-center space-x-1 border transition-all whitespace-nowrap ${
                        activePersona === persona.id 
                          ? (isWork ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-emerald-100 border-emerald-300 text-emerald-700') 
                          : (darkMode ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50')
                      }`}
                      title={persona.desc}
                    >
                      {getPersonaIcon(persona.iconName)}
                      <span>{persona.name}</span>
                    </button>
                  ))}
                </div>

                <p className={`text-xs mb-3 ${textSub}`}>
                  {AI_PERSONAS[activePersona].desc} Dump thoughts here:
                </p>
                <textarea 
                  value={goalDumpInput}
                  onChange={(e) => setGoalDumpInput(e.target.value)}
                  placeholder="E.g. I need to email the client but first I have to find the contract... also buy ink..."
                  className={`flex-1 p-4 rounded-xl resize-none focus:outline-none focus:ring-2 mb-4 text-sm leading-relaxed ${inputBg} ${ringAccent}`}
                />
                <button 
                  onClick={handleMagicOrganize}
                  disabled={!goalDumpInput.trim() || isOrganizing}
                  className={`w-full py-3 text-white rounded-xl font-medium transition-colors flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50 ${bgAccent} ${bgAccentHover}`}
                >
                  {isOrganizing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Thinking...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Plan</span>
                    </>
                  )}
                </button>
              </div>

              <div className="w-full md:w-[65%] p-6 flex flex-col overflow-hidden bg-slate-50/5 dark:bg-slate-900/50">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-2">
                    {goalViewMode === 'board' ? <Columns className={`w-5 h-5 ${textAccent}`} /> : <ListOrdered className={`w-5 h-5 ${textAccent}`} />}
                    <h3 className={`font-bold ${textMain}`}>{goalViewMode === 'board' ? 'Kanban Board' : 'Action Plan'}</h3>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                     <div className={`flex p-1 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                        <button onClick={() => setGoalViewMode('list')} className={`p-1.5 rounded-md transition-all ${goalViewMode === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                            <ListOrdered className="w-4 h-4" />
                        </button>
                        <button onClick={() => setGoalViewMode('board')} className={`p-1.5 rounded-md transition-all ${goalViewMode === 'board' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                            <Columns className="w-4 h-4" />
                        </button>
                     </div>
                     <span className={`text-xs font-bold ${textAccent}`}>
                        {calculateProgress(selectedGoal.tasks)}% Done
                     </span>
                  </div>
                </div>

                <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full mb-6 overflow-hidden shrink-0">
                  <div 
                    className={`h-full transition-all duration-500 ${bgAccent}`}
                    style={{ width: `${calculateProgress(selectedGoal.tasks)}%` }}
                  />
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {selectedGoal.tasks.length === 0 && (
                    <div className={`text-center py-20 italic text-sm ${textSub}`}>
                      No tasks yet. Use the Smart Plan tool!
                    </div>
                  )}

                  {goalViewMode === 'list' && selectedGoal.tasks.map((task) => (
                    <div 
                      key={task.id} 
                      className={`flex items-start space-x-3 p-3 rounded-xl transition-all group ${
                        task.done 
                        ? (darkMode ? 'bg-slate-800/30 text-slate-500' : 'bg-slate-100/50 text-slate-400') 
                        : (darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200 shadow-sm')
                      }`}
                    >
                      <button 
                        onClick={() => toggleTask(task.id)}
                        className={`mt-0.5 flex-shrink-0 transition-colors ${task.done ? textAccent : 'text-slate-300 hover:text-slate-500'}`}
                      >
                        {task.done ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                      </button>
                      <span className={`text-sm flex-1 leading-relaxed ${task.done ? 'line-through' : textMain}`}>
                        {task.text}
                      </span>
                      <button 
                        onClick={() => deleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {goalViewMode === 'board' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
                        <div className={`flex flex-col h-full rounded-xl p-3 ${darkMode ? 'bg-slate-800/50' : 'bg-slate-100/50'}`}>
                            <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center space-x-2 ${textSub}`}>
                                <Circle className="w-3 h-3" /> <span>To Do</span>
                            </h4>
                            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                                {selectedGoal.tasks.filter(t => getTaskStatus(t) === 'todo').map(t => (
                                    <div 
                                        key={t.id} 
                                        onClick={() => updateTaskStatus(t.id, 'doing')}
                                        className={`p-3 rounded-lg text-xs border shadow-sm cursor-pointer hover:scale-[1.02] transition-all group relative ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}
                                    >
                                        {t.text}
                                        <ArrowRight className="absolute right-2 top-3 w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={`flex flex-col h-full rounded-xl p-3 ${darkMode ? 'bg-indigo-900/10' : 'bg-indigo-50/50'}`}>
                            <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center space-x-2 ${isWork ? 'text-indigo-500' : 'text-emerald-500'}`}>
                                <Loader2 className="w-3 h-3" /> <span>Doing</span>
                            </h4>
                            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                                {selectedGoal.tasks.filter(t => getTaskStatus(t) === 'doing').map(t => (
                                    <div 
                                        key={t.id} 
                                        className={`p-3 rounded-lg text-xs border shadow-sm cursor-pointer transition-all group relative ${darkMode ? 'bg-slate-800 border-indigo-500/30 text-slate-200' : 'bg-white border-indigo-100 text-slate-700'}`}
                                    >
                                        <div className="absolute right-1 top-1 flex space-x-1 opacity-0 group-hover:opacity-100">
                                            <button onClick={(e) => { e.stopPropagation(); updateTaskStatus(t.id, 'todo'); }} className="p-1 hover:bg-slate-100 rounded"><ArrowLeft className="w-3 h-3 text-slate-400" /></button>
                                            <button onClick={(e) => { e.stopPropagation(); updateTaskStatus(t.id, 'done'); }} className="p-1 hover:bg-slate-100 rounded"><ArrowRight className="w-3 h-3 text-slate-400" /></button>
                                        </div>
                                        <div onClick={() => updateTaskStatus(t.id, 'done')}>{t.text}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={`flex flex-col h-full rounded-xl p-3 ${darkMode ? 'bg-emerald-900/10' : 'bg-emerald-50/50'}`}>
                            <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center space-x-2 text-emerald-600">
                                <CheckCircle2 className="w-3 h-3" /> <span>Done</span>
                            </h4>
                            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                                {selectedGoal.tasks.filter(t => getTaskStatus(t) === 'done').map(t => (
                                    <div 
                                        key={t.id} 
                                        className={`p-3 rounded-lg text-xs border shadow-sm opacity-60 group relative ${darkMode ? 'bg-slate-800 border-emerald-500/20 text-slate-400 line-through' : 'bg-white border-emerald-100 text-slate-500 line-through'}`}
                                    >
                                         <div className="absolute right-1 top-1 flex space-x-1 opacity-0 group-hover:opacity-100">
                                            <button onClick={(e) => { e.stopPropagation(); updateTaskStatus(t.id, 'doing'); }} className="p-1 hover:bg-slate-100 rounded"><ArrowLeft className="w-3 h-3 text-slate-400" /></button>
                                            <button onClick={(e) => { e.stopPropagation(); deleteTask(t.id); }} className="p-1 hover:bg-rose-100 rounded"><Trash2 className="w-3 h-3 text-rose-400" /></button>
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
      )}

      {showImport && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl shadow-xl w-full max-w-lg p-6 ${darkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
            <h2 className={`text-xl font-bold mb-4 ${textMain}`}>Import AI Plan</h2>
            <p className={`text-sm mb-4 ${textSub}`}>Paste the JSON provided by ChatGPT/Gemini here. Items will be imported into your <strong>{activeContext}</strong> view.</p>
            <textarea
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder='{ "brainDump": [...], "goals": [...] }'
              className={`w-full h-48 p-4 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 mb-4 ${inputBg} ${ringAccent}`}
            />
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setShowImport(false)}
                className={`px-4 py-2 rounded-lg transition-colors ${darkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Cancel
              </button>
              <button 
                onClick={handleImport}
                disabled={!importJson}
                className={`px-4 py-2 text-white rounded-lg font-medium transition-colors disabled:opacity-50 ${bgAccent} ${bgAccentHover}`}
              >
                Import to {activeContext}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}