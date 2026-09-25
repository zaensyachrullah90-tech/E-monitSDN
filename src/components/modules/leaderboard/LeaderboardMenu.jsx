import React, { useState } from 'react';
import GroupedTaskCard from '../tasks/GroupedTaskCard';

const LeaderboardMenu = ({ groupedTasks }) => {
  const [selectedRankTask, setSelectedRankTask] = useState(null);

  if (selectedRankTask) {
    const activeGroup = groupedTasks.find(g => g.taskName === selectedRankTask);
    if (!activeGroup) {
      setSelectedRankTask(null);
      return null;
    }

    const stats = activeGroup.assignees.map(a => {
       const percent = a.target === 0 ? 0 : Math.min(Math.round((a.progress / a.target) * 100), 100);
       return { ...a, percent };
    }).sort((a, b) => b.percent - a.percent);

    return (
      <div className="animate-slide-up space-y-6 pb-10">
        <div className="flex flex-col gap-2">
          <button onClick={() => setSelectedRankTask(null)} className="w-max bg-white text-midnight border border-slate-200 shadow-sm rounded-full font-bold px-4 py-2 text-xs flex items-center gap-2 hover:bg-slate-50 outline-none cursor-pointer">
            <i className="fa-solid fa-arrow-left-long text-status-selesai"></i> Kembali
          </button>
          <div>
            <h3 className="text-2xl font-black text-midnight tracking-tight">Leaderboard Spesifik</h3>
            <p className="text-slate-500 text-sm font-bold mt-0.5">Ranking kinerja untuk kegiatan <span className="text-status-selesai">"{selectedRankTask}"</span></p>
          </div>
        </div>
        
        <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider font-bold border-b border-slate-200">
                  <th className="p-4 text-center">#</th>
                  <th className="p-4">Pegawai</th>
                  <th className="p-4 text-center">Capaian / Target</th>
                  <th className="p-4">Kinerja (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.length === 0 && <tr><td colSpan="4" className="text-center py-10 text-slate-400 font-bold">Belum ada data pegawai</td></tr>}
                {stats.map((stat, index) => (
                  <tr key={stat.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-center">
                      {index === 0 ? <span className="bg-gradient-to-br from-yellow-300 to-yellow-500 text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto shadow-sm text-sm"><i className="fa-solid fa-crown"></i></span> : 
                       index === 1 ? <span className="bg-slate-800 text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto shadow-sm text-sm font-bold">2</span> : 
                       index === 2 ? <span className="bg-slate-600 text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto shadow-sm text-sm font-bold">3</span> : 
                       <span className="text-slate-400 font-bold text-sm">{index + 1}</span>}
                    </td>
                    <td className="p-4 font-black text-midnight text-sm">{stat.picId}</td>
                    <td className="p-4 text-center">
                      <span className="bg-slate-100 text-slate-600 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold">{stat.progress} / {stat.target}</span>
                    </td>
                    <td className="p-4 min-w-[120px]">
                      <div className="flex items-center gap-3">
                        <div className="w-full bg-slate-100 rounded-full h-2.5 shadow-inner">
                          <div className={`${stat.percent >= 100 ? 'bg-status-selesai' : 'bg-status-proses'} h-2.5 rounded-full`} style={{ width: `${stat.percent}%` }}></div>
                        </div>
                        <span className="text-xs font-black text-midnight">{stat.percent}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up space-y-6">
      <div>
        <h3 className="text-2xl font-black text-midnight tracking-tight">Leaderboard</h3>
        <p className="text-slate-500 text-sm font-bold mt-0.5"><i className="fa-solid fa-hand-pointer text-status-selesai mr-1"></i> Klik kegiatan untuk melihat ranking pegawai.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groupedTasks.length === 0 && (
          <div className="col-span-full bg-white rounded-3xl shadow-soft border border-slate-100 text-center py-12">
            <i className="fa-solid fa-box-open text-5xl mb-4 text-slate-300 block"></i>
            <p className="font-black text-slate-500">Belum ada kegiatan terdaftar.</p>
          </div>
        )}
        {groupedTasks.map(group => <GroupedTaskCard key={group.taskName} group={group} onClick={setSelectedRankTask} />)}
      </div>
    </div>
  );
};

export default LeaderboardMenu;