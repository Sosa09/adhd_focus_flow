import React from 'react';
import { Loader2 } from 'lucide-react';

const Loader = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 dark:bg-slate-950 dark:text-slate-500">
      <Loader2 className="w-8 h-8 animate-spin" />
    </div>
  );
};

export default Loader;