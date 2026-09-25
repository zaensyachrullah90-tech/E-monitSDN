import React from 'react';
import { formatDateId } from '../../../utils/formatters';

const LivePreviewView = ({ taskName, groupedTasks }) => {
  const activeGroup = groupedTasks.find(g => g.taskName === taskName);

  if (!activeGroup) {
    return (
      <div className="min-h-screen flex flex-col gap-4 items-center justify-center bg-slate-50 p-6 text-center">
        <i className="fa-solid fa-circle-exclamation text-slate-400 text-6xl"></i>
        <h2 className="text-2xl font-black text-midnight">Kegiatan Tidak Ditemukan</h2>
        <p className="text-slate-500 font-bold text-sm">Mungkin kegiatan ini sudah dihapus atau namanya salah.</p>
      </div>
    );
  }

  const totalPelaksana = activeGroup.assignees.length;
  const selesaiCount = activeGroup.assignees.filter(a => a.progress >= a.target).length;
  const belumCount = totalPelaksana - selesaiCount;
  const totalProgressGroup = activeGroup.assignees.reduce((sum, a) => sum + a.progress, 0);
  const totalTargetGroup = activeGroup.assignees.reduce((sum, a) => sum + a.target, 0);
  const overallPercent = totalTargetGroup === 0 ? 0 : Math.min(Math.round((totalProgressGroup / totalTargetGroup) * 100), 100);
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-midnight text-white pb-10">
      <div className="bg-gradient-to-r from-midnight-light to-midnight shadow-nav sticky top-0 z-50 border-b border-white/10">
        <div className="px-5 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 border border-white/20 text-white rounded-xl p-2 flex items-center justify-center shadow-inner" style={{ width: '45px', height: '45px' }}>
              <i className="fa-solid fa-chart-line text-yellow-400 text-xl"></i>
            </div>
            <div>
              <h1 className="font-black text-lg leading-tight tracking-tight">Live Preview</h1>
              <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold">MonitorSDMPKHTapin</p>
            </div>
          </div>
          <span className="bg-red-500 text-white rounded-full px-3 py-1.5 shadow-glossy text-[10px] font-black uppercase tracking-wider flex items-center shadow-red-500/50">
            <i className="fa-solid fa-circle text-[8px] fa-fade mr-1.5"></i> Live
          </span>
        </div>
      </div>

      <div className="p-5 space-y-6 max-w-[800px] mx-auto animate-fade-in mt-4">
        <div className="text-center space-y-2 mb-8">
          <span className={`inline-flex items-center gap-1.5 ${activeGroup.status === 'Selesai' ? 'bg-status-selesai text-white' : 'bg-status-proses text-white'} text-xs font-black px-4 py-2 rounded-full shadow-glossy uppercase tracking-wider`}>
            <i className={`fa-solid ${activeGroup.status === 'Selesai' ? 'fa-check-double' : 'fa-spinner fa-spin'}`}></i> {activeGroup.status}
          </span>
          <h2 className="text-3xl sm:text-4xl font-black leading-tight mt-3 mb-1">{activeGroup.taskName}</h2>
          <p className="text-white/60 font-bold text-sm"><i className="fa-solid fa-calendar-day text-blue-400"></i> Tenggat: {formatDateId(activeGroup.deadline)}</p>
        </div>

        <div className="bg-midnight-light rounded-3xl p-6 shadow-glossy border border-white/10">
          <div className="flex justify-between items-end mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1">Capaian Keseluruhan</p>
              <div className="text-xl font-black text-white">{totalProgressGroup} <span className="text-sm text-white/50">/ {totalTargetGroup} Dokumen</span></div>
            </div>
            <h1 className="text-4xl font-black text-status-selesai">{overallPercent}%</h1>
          </div>
          <div className="w-full bg-midnight rounded-full h-4 shadow-inner border border-white/5">
            <div className={`${overallPercent >= 100 ? 'bg-status-selesai' : 'bg-status-proses'} h-4 rounded-full transition-all duration-1000 relative overflow-hidden`} style={{ width: `${overallPercent}%` }}></div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-midnight-light rounded-2xl p-4 text-center border border-white/5 shadow-soft">
            <h2 className="text-2xl font-black text-white mb-1">{totalPelaksana}</h2>
            <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Pelaksana</span>
          </div>
          <div className="bg-status-selesai/20 rounded-2xl p-4 text-center border border-status-selesai/30 shadow-soft">
            <h2 className="text-2xl font-black text-status-selesai mb-1">{selesaiCount}</h2>
            <span className="text-[10px] text-status-selesai font-bold uppercase tracking-wider">Selesai</span>
          </div>
          <div className="bg-status-proses/20 rounded-2xl p-4 text-center border border-status-proses/30 shadow-soft">
            <h2 className="text-2xl font-black text-status-proses mb-1">{belumCount}</h2>
            <span className="text-[10px] text-status-proses font-bold uppercase tracking-wider">Proses</span>
          </div>
        </div>

        <div className="pt-4">
          <h6 className="font-black text-white mb-4 flex items-center gap-2 text-sm uppercase tracking-wider border-b border-white/10 pb-3">
            <i className="fa-solid fa-list-check text-white/50"></i> Daftar Pelaksana Secara Live
          </h6>
          <div className="space-y-3">
            {activeGroup.assignees.map((a, idx) => {
              const isDone = a.progress >= a.target;
              const p = Math.min(Math.round((a.progress / a.target) * 100), 100);
              const progresHariIni = (a.daily && a.daily[today]) ? a.daily[today] : 0;
              
              return (
                <div key={idx} className="bg-midnight-light rounded-2xl border border-white/5 shadow-soft p-4 relative overflow-hidden">
                  <div className="flex justify-between items-center relative z-10 mb-3">
                    <div className="font-black text-white text-sm">{a.picId}</div>
                    <div className={`text-xs font-black ${isDone ? 'text-status-selesai' : 'text-status-proses'}`}>{p}%</div>
                  </div>
                  
                  <div className="w-full bg-midnight rounded-full h-2 shadow-inner border border-white/5 relative z-10 mb-3">
                    <div className={`${isDone ? 'bg-status-selesai' : 'bg-status-proses'} h-2 rounded-full transition-all duration-1000`} style={{ width: `${p}%` }}></div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider relative z-10">
                    <div className="flex flex-col gap-1">
                      <span className="text-white/50">Capaian: <span className="text-white">{a.progress}</span> / {a.target}</span>
                      {progresHariIni > 0 && <span className="text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded w-max"><i className="fa-solid fa-arrow-trend-up"></i> Hari Ini: +{progresHariIni}</span>}
                    </div>
                    <span className={isDone ? 'text-status-selesai' : 'text-status-proses'}>
                      <i className={`fa-solid ${isDone ? 'fa-check-circle' : 'fa-spinner fa-spin'} mr-1`}></i> {isDone ? 'Selesai' : 'Proses'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="text-center text-[10px] text-white/30 mt-10 mb-4 font-bold uppercase tracking-widest">
          Live Preview • MonitorSDMPKHTapin
        </div>
      </div>
    </div>
  );
};

export default LivePreviewView;