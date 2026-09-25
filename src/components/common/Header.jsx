import React from 'react';

const Header = () => {
  return (
    <header className="bg-gradient-to-r from-midnight to-midnight-light text-white shadow-nav sticky top-0 z-40 border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-row items-center justify-between">
        <a className="font-black text-white flex items-center text-base sm:text-xl tracking-tight" href="#">
          <div className="bg-white/10 border border-white/20 text-white rounded-xl p-1.5 mr-3 flex items-center justify-center shadow-inner backdrop-blur-sm" style={{ width: '38px', height: '38px' }}>
            <i className="fa-solid fa-chart-line text-yellow-400 text-lg"></i>
          </div>
          MonitorSDMPKHTapin
        </a>
        <span className="bg-white/10 border border-white/20 text-white rounded-full px-3.5 py-1.5 shadow-sm text-[10px] sm:text-xs font-bold uppercase tracking-wider backdrop-blur-sm flex items-center">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-2"></span>
          <i className="fa-solid fa-cloud-arrow-up mr-1 text-status-selesai"></i> Sync
        </span>
      </div>
    </header>
  );
};

export default Header;