
"use client";
import React from 'react';

interface ViewSwitcherProps {
  currentView: 'list' | 'kanban';
  onViewChange: (view: 'list' | 'kanban') => void;
}

const ViewSwitcher: React.FC<ViewSwitcherProps> = ({ currentView, onViewChange }) => {
  return (
    <div className="flex items-center justify-center mb-6">
      <div className="flex rounded-md bg-slate-800 p-1">
        <button
          onClick={() => onViewChange('list')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            currentView === 'list' ? 'bg-cyan-500 text-white rounded-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          List
        </button>
        <button
          onClick={() => onViewChange('kanban')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            currentView === 'kanban' ? 'bg-cyan-500 text-white rounded-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          Kanban
        </button>
      </div>
    </div>
  );
};

export default ViewSwitcher;
