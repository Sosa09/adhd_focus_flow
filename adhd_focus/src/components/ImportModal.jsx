import React, { useState } from 'react';

const ImportModal = ({ setShow, handleImport, activeContext, darkMode }) => {
  const [importJson, setImportJson] = useState('');

  const isWork = activeContext === 'work';
  const textMain = darkMode ? 'text-slate-100' : 'text-slate-800';
  const textSub = darkMode ? 'text-slate-400' : 'text-slate-500';
  const inputBg = darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400';
  const ringAccent = isWork ? 'focus:ring-indigo-500' : 'focus:ring-emerald-500';
  const bgAccent = isWork ? 'bg-indigo-600' : 'bg-emerald-600';
  const bgAccentHover = isWork ? 'hover:bg-indigo-700' : 'hover:bg-emerald-700';

  const onImport = () => {
    handleImport(importJson);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`rounded-2xl shadow-xl w-full max-w-lg p-6 ${darkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
        <h2 className={`text-xl font-bold mb-4 ${textMain}`}>Import AI Plan</h2>
        <p className={`text-sm mb-4 ${textSub}`}>Paste the JSON provided by an AI assistant here. Items will be imported into your <strong>{activeContext}</strong> view.</p>
        <textarea
          value={importJson}
          onChange={(e) => setImportJson(e.target.value)}
          placeholder='{ "brainDump": [...], "goals": [...] }'
          className={`w-full h-48 p-4 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 mb-4 ${inputBg} ${ringAccent}`}
        />
        <div className="flex justify-end space-x-3">
          <button onClick={() => setShow(false)} className={`px-4 py-2 rounded-lg transition-colors ${darkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}>Cancel</button>
          <button onClick={onImport} disabled={!importJson} className={`px-4 py-2 text-white rounded-lg font-medium transition-colors disabled:opacity-50 ${bgAccent} ${bgAccentHover}`}>Import to {activeContext}</button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;