import React from 'react';
import { NAV_ITEMS } from '../../config/constants';

const Navbar = ({ activeTab, setActiveTab, onTabChange }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center p-3 pointer-events-none">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-[0_10px_30px_rgba(11,19,43,0.15)] border border-slate-200/80 w-full max-w-lg sm:max-w-xl flex justify-around items-center px-2 py-2.5 sm:py-3 pointer-events-auto">
        {NAV_ITEMS.map(item => (
          <button
            type="button"
            key={item.id}
            onClick={() => {
              setActiveTab(item.id);
              if (onTabChange) onTabChange();
            }}
            className={`flex flex-col items-center justify-center flex-1 min-w-[48px] gap-1 transition-all duration-200 outline-none cursor-pointer ${
              activeTab === item.id ? 'text-midnight scale-105' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <i className={`fa-solid ${item.icon} text-lg sm:text-xl transition-transform ${activeTab === item.id ? 'drop-shadow text-status-selesai' : ''}`}></i>
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;