import React, { useMemo } from 'react';
import { TrendingUp, Layout, Calendar, ListTodo, MoreHorizontal } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const Goals = ({ goals, activeContext, setSelectedGoal, setGoalViewMode, isLoading, darkMode }) => {
  const isWork = activeContext === 'work';
  const cardBg = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const textMain = darkMode ? 'text-slate-100' : 'text-slate-800';
  const textSub = darkMode ? 'text-slate-400' : 'text-slate-500';
  const textAccent = isWork ? 'text-indigo-600' : 'text-emerald-600';
  const bgAccentLight = isWork ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700';

  const calculateProgress = (tasks) => {
    if (!tasks || tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.done).length;
    return Math.round((completed / tasks.length) * 100);
  };

  const chartData = useMemo(() => {
    return goals.map(g => {
      const p = calculateProgress(g.tasks);
      return {
        name: g.title.length > 10 ? g.title.substring(0, 10) + '...' : g.title,
        progress: p,
        fill: p === 100 ? '#10b981' : (isWork ? '#4f46e5' : '#047857')
      };
    });
  }, [goals, activeContext, darkMode]);

  return (
    <div className="lg:col-span-8 space-y-8">
      <div className={`rounded-2xl shadow-sm border p-6 transition-colors duration-300 ${cardBg}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-lg font-bold flex items-center ${textMain}`}>
            <TrendingUp className={`w-5 h-5 mr-2 ${textAccent}`} />
            {activeContext === 'work' ? 'Work Week Progress' : 'Life Week Progress'}
          </h2>
          <div className={`text-xs font-bold px-3 py-1 rounded-full ${goals.length >= 3 ? 'bg-rose-100 text-rose-600' : bgAccentLight}`}>
            {goals.length}/3 Weekly {activeContext === 'work' ? 'Work' : 'Life'} Goals
          </div>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fill: darkMode ? '#94a3b8' : '#64748b' }} />
              <Tooltip
                cursor={{ fill: darkMode ? '#334155' : '#f1f5f9' }}
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
        {isLoading ? (
          <div className="space-y-6">
            <div className={`h-32 rounded-2xl animate-pulse ${darkMode ? 'bg-slate-900' : 'bg-slate-200'}`}></div>
            <div className={`h-32 rounded-2xl animate-pulse ${darkMode ? 'bg-slate-900' : 'bg-slate-200'}`} style={{ animationDelay: '150ms' }}></div>
          </div>
        ) : (
          goals.length === 0 ? (
          <div className={`p-10 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <Layout className={`w-10 h-10 mb-3 ${textSub}`} />
            <h3 className={`font-bold ${textMain}`}>No Active Weekly Goals ({activeContext})</h3>
            <p className={`text-sm mt-2 ${textSub}`}>Pick your "Big 3" for the week from the dump.</p>
          </div>
          ) : (
            goals.map((goal) => {
          const progress = calculateProgress(goal.tasks);
          return (
            <div
              key={goal.id}
              onClick={() => { setSelectedGoal(goal); setGoalViewMode(activeContext === 'work' ? 'board' : 'list'); }}
              className={`rounded-2xl p-6 shadow-sm border transition-all cursor-pointer group relative overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-current' : 'bg-white border-slate-200 hover:shadow-md hover:border-current'} ${isWork ? 'hover:border-indigo-300' : 'hover:border-emerald-300'}`}
            >
              <div className="absolute bottom-0 left-0 h-1 transition-all duration-500 ease-out" style={{ width: `${progress}%`, backgroundColor: progress === 100 ? '#10b981' : (isWork ? '#4f46e5' : '#047857') }} />
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
                <div className="flex items-center space-x-2"><ListTodo className="w-4 h-4" /><span>{goal.tasks?.filter(t => !t.done).length || 0} Remaining Tasks</span></div>
                <div className={`flex items-center font-medium opacity-0 group-hover:opacity-100 transition-opacity ${textAccent}`}>Open Goal <MoreHorizontal className="w-4 h-4 ml-1" /></div>
              </div>
            </div>
          );
            })
          )
        )}
      </div>
    </div>
  );
};

export default Goals;