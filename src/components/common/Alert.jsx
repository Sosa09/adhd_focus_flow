import React from 'react';
import { Sparkles } from 'lucide-react';

const Alert = ({ alertMsg, isWork }) => {
  if (!alertMsg) return null;

  const bgAccent = isWork ? 'bg-indigo-600' : 'bg-emerald-600';

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-top-4 zoom-in-95 duration-300">
      <div className={`${bgAccent} text-white px-6 py-3 rounded-full shadow-xl flex items-center space-x-2 font-bold tracking-wide`}>
        <Sparkles className="w-5 h-5 text-yellow-300" />
        <span>{alertMsg}</span>
      </div>
    </div>
  );
};

export default Alert;