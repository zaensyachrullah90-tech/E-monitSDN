import React, { memo, useState } from 'react';
import LiveCountdown from '../../common/LiveCountdown';
import { formatDateId } from '../../../utils/formatters';
import { exportGroupToExcel } from '../../../utils/excel';

// 1. KOMPONEN GROUPED TASK CARD
export const GroupedTaskCard = memo(({ group, onClick }) => {
  // PROTEKSI: Padukan assignees atau items
  const assignees = group?.assignees || group?.items || [];

  const percent = group?.target > 0 
    ? Math.min(Math.round(((group?.progress || 0) / group.target) * 100), 100) 
    : 0;
  const isDone = percent >= 100 || String(group?.status).toLowerCase() === 'selesai';
  
  const targetDate = group?.deadline ? new Date(`${group.deadline}T23:59:59`).getTime() : 0;
  const now = new Date().getTime();
  const diffDays = group?.deadline ? Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24)) : 99;
  const isUrgent = !isDone && diffDays <= 2 && group?.deadline;

  const borderColor = isDone 
    ? 'border-status-selesai' 
    : isUrgent 
      ? 'border-red-500' 
      : 'border-status-proses';
  const progressBg = isDone ? 'bg-status-selesai' : 'bg-status-proses';
  const percentColor = isDone ? 'text-status-selesai' : 'text-status-proses';

  const completedAssigneesCount = assignees.filter(a => Number(a.progress || 0) >= Number(a.target || 0)).length;

  return (
    <button 
      type="button" 
      className={`card-btn bg-white rounded-3xl shadow-soft border-l-[6px] ${borderColor} overflow-hidden relative transition-all duration-300 hover:shadow-xl text-left outline-none cursor-pointer w-full ${
        isUrgent ? 'animate-urgent-card ring-1 ring-red-400' : 'hover:border-slate-300'
      }`} 
      onClick={() => onClick(group?.taskName)}
    >
      {isUrgent && (
        <div className="bg-red-600 text-white text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-2xl absolute top-0 right-0 flex items-center gap-1.5 shadow-md z-10">
          <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
          <i className="fa-solid fa-fire text-yellow-300"></i> Segera Isi
        </div>
      )}

      <div className="p-5">
        <div className="flex justify-between items-start gap-3 mb-4">
          <div className="flex-1 pr-12">
            <h5 className="font-black text-midnight text-lg leading-tight mb-2 group-hover:text-status-selesai transition-colors">{group?.taskName}</h5>
            <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-500 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide">
              <i className="fa-regular fa-calendar-check"></i> {formatDateId(group?.deadline)}
            </span>
          </div>
          {!isUrgent && group?.deadline && <LiveCountdown deadline={group.deadline} />}
        </div>

        {isUrgent && group?.deadline && (
          <div className="mb-4">
            <LiveCountdown deadline={group.deadline} />
          </div>
        )}

        <div className="mb-4">
          <div className="flex justify-between text-xs font-bold mb-1.5">
            <span className="text-slate-500">Progress ({group?.progress || 0}/{group?.target || 0})</span>
            <span className={`font-black text-sm ${percentColor}`}>{percent}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 shadow-inner overflow-hidden">
            <div className={`${progressBg} h-2.5 rounded-full transition-all duration-1000 ease-out`} style={{ width: `${percent}%` }}></div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-slate-100/80">
          <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
            <i className="fa-solid fa-users text-slate-400"></i> {assignees.length} Pelaksana
          </div>
          <div className="text-xs font-black text-white bg-midnight px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5">
            <i className="fa-solid fa-check-double text-blue-400"></i> Selesai: {completedAssigneesCount}
          </div>
        </div>
      </div>
    </button>
  );
});

// 2. KOMPONEN TASK LIST MENU
const TaskListMenu = ({ groupedTasks = [], selectedTaskName, setSelectedTaskName, isAdminLogged }) => {
  const [toast, setToast] = useState(null);
  const activeGroup = (groupedTasks || []).find(g => g.taskName === selectedTaskName);

  const showToast = (type) => {
    setToast(type);
    setTimeout(() => setToast(null), 3000);
  };

  const handleExportExcel = () => {
    if (!activeGroup) return;
    try {
      exportGroupToExcel(activeGroup);
      showToast('success');
    } catch (err) {
      showToast('error');
    }
  };

  const handleShareLivePreview = () => {
    const url = `${window.location.origin}${window.location.pathname}?preview=${encodeURIComponent(activeGroup.taskName)}`;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(() => {
        showToast('success');
        alert('Berhasil! Link Live Preview telah disalin.\n\nSilakan Paste di WhatsApp:\n' + url);
      }).catch(() => {
        window.prompt("Salin link Live Preview berikut manual:", url);
      });
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = url;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        showToast('success');
        alert('Berhasil! Link Live Preview telah disalin.\n\nSilakan Paste di WhatsApp:\n' + url);
      } catch (err) {
        window.prompt("Salin link Live Preview berikut manual:", url);
      }
      document.body.removeChild(textArea);
    }
  };

  if (activeGroup) {
    // PROTEKSI UTAMA
    const assignees = activeGroup.assignees || activeGroup.items || [];
    const totalPelaksana = assignees.length;
    const selesaiCount = assignees.filter(a => Number(a.progress || 0) >= Number(a.target || 0)).length;
    const belumCount = totalPelaksana - selesaiCount;
    const today = new Date().toISOString().split('T')[0];

    return (
      <div className="animate-slide-up space-y-5">
        {toast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] animate-slide-up">
            <div className={`px-5 py-2 rounded-full shadow-lg font-black text-xs flex items-center gap-2 text-white ${toast === 'success' ? 'bg-status-selesai' : 'bg-red-500'}`}>
              <i className={`fa-solid ${toast === 'success' ? 'fa-check-circle' : 'fa-xmark-circle'} text-lg`}></i> 
              {toast === 'success' ? 'BERHASIL' : 'GAGAL'}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 justify-between items-center mb-2">
          <button onClick={() => setSelectedTaskName(null)} className="bg-white text-midnight border border-slate-200 shadow-sm rounded-full font-bold px-4 py-2 text-xs flex items-center gap-2 hover:bg-slate-50 transition-colors outline-none cursor-pointer">
            <i className="fa-solid fa-arrow-left-long text-status-selesai"></i> Kembali
          </button>
          
          {isAdminLogged && (
            <div className="flex gap-2">
              <button onClick={handleShareLivePreview} className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md rounded-full font-black px-3 py-2 text-[10px] sm:text-xs flex items-center gap-1.5 hover:scale-95 transition-transform outline-none cursor-pointer">
                <i className="fa-solid fa-share-nodes"></i> Share Live
              </button>
              <button onClick={handleExportExcel} className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-md rounded-full font-black px-3 py-2 text-[10px] sm:text-xs flex items-center gap-1.5 hover:scale-95 transition-transform outline-none cursor-pointer">
                <i className="fa-solid fa-file-export"></i> Excel
              </button>
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
          <div className="bg-gradient-to-r from-midnight to-midnight-light p-6 text-white relative">
            <div className="absolute top-0 right-0 p-4 opacity-10"><i className="fa-solid fa-chart-column text-8xl"></i></div>
            <span className={`inline-flex items-center gap-1.5 ${activeGroup.status === 'Selesai' ? 'bg-status-selesai' : 'bg-white text-status-proses'} text-xs font-black px-3 py-1.5 rounded-lg mb-4 shadow-sm uppercase tracking-wider`}>
              <i className={`fa-solid ${activeGroup.status === 'Selesai' ? 'fa-check-double text-white' : 'fa-spinner fa-spin'}`}></i> {activeGroup.status || 'Proses'}
            </span>
            <h3 className="text-2xl font-black mb-2 relative z-10 leading-tight">{activeGroup.taskName}</h3>
            <p className="text-white/80 font-bold text-sm m-0 flex items-center gap-2 relative z-10">
              <i className="fa-solid fa-calendar-day text-blue-300"></i> Tenggat: {formatDateId(activeGroup.deadline)}
            </p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-slate-50 rounded-2xl border border-slate-100 p-3 text-center flex flex-col justify-center shadow-sm">
                <h2 className="text-2xl font-black text-midnight mb-0.5">{totalPelaksana}</h2>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pelaksana</span>
              </div>
              <div className="bg-status-selesai/10 rounded-2xl border border-status-selesai/20 p-3 text-center flex flex-col justify-center shadow-sm">
                <h2 className="text-2xl font-black text-status-selesai mb-0.5">{selesaiCount}</h2>
                <span className="text-[10px] text-status-selesai font-bold uppercase tracking-wider">Selesai</span>
              </div>
              <div className="bg-status-proses/10 rounded-2xl border border-status-proses/20 p-3 text-center flex flex-col justify-center shadow-sm">
                <h2 className="text-2xl font-black text-status-proses mb-0.5">{belumCount}</h2>
                <span className="text-[10px] text-status-proses font-bold uppercase tracking-wider">Proses</span>
              </div>
            </div>

            <h6 className="font-black text-midnight mb-4 flex items-center gap-2 text-sm uppercase tracking-wider border-b border-slate-100 pb-3">
              <i className="fa-solid fa-list-check text-slate-400"></i> Rincian & Waktu Selesai
            </h6>
            <div className="space-y-3">
              {assignees.map((a, idx) => {
                const isDone = Number(a.progress || 0) >= Number(a.target || 0);
                const badgeBg = isDone ? 'bg-status-selesai border-status-selesai text-white' : 'bg-white border-status-proses border-2 text-status-proses';
                const iconClass = isDone ? 'fa-solid fa-circle-check text-white' : 'fa-solid fa-spinner fa-spin text-status-proses';
                const progresHariIni = (a.daily && a.daily[today]) ? a.daily[today] : 0;

                return (
                  <div key={idx} className="flex flex-col bg-slate-50 rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="flex justify-between items-center p-4">
                      <div>
                        <div className="font-bold text-midnight text-sm mb-1">{a.picId}</div>
                        <div className="text-[10px] text-slate-500 font-bold">
                          Trg: <span className="text-midnight">{a.target}</span> | Capaian: <span className="text-status-selesai">{a.progress}</span> 
                          {progresHariIni > 0 && <span className="text-yellow-600 ml-1 bg-yellow-50 px-1 rounded border border-yellow-100">(+{progresHariIni} hari ini)</span>}
                        </div>
                      </div>
                      <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${badgeBg}`}>
                        <i className={iconClass}></i> {isDone ? 'Selesai' : 'Proses'}
                      </span>
                    </div>
                    <div className={`px-4 py-2 text-[10px] font-bold tracking-wider ${isDone ? 'bg-status-selesai/10 text-status-selesai' : 'bg-slate-100 text-slate-400'}`}>
                      {isDone ? <><i className="fa-solid fa-flag-checkered mr-1"></i> Tuntas pada: {formatDateId(a.completedAt)}</> : <><i className="fa-solid fa-hourglass-start mr-1"></i> Mulai dikerjakan: {formatDateId(a.startDate)}</>}
                    </div>
                  </div>
                );
              })}
              {assignees.length === 0 && (
                <div className="text-center py-6 text-slate-400 font-bold text-xs">
                  Belum ada daftar pelaksana pada kegiatan ini.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up space-y-6">
      <div>
        <h3 className="text-2xl font-black text-midnight tracking-tight">Seluruh Kegiatan</h3>
        <p className="text-slate-500 text-sm font-bold mt-0.5"><i className="fa-solid fa-hand-pointer text-status-selesai mr-1"></i> Klik kartu untuk evaluasi mendalam.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(groupedTasks || []).length === 0 && (
          <div className="col-span-full bg-white rounded-3xl shadow-soft border border-slate-100 text-center py-12">
            <i className="fa-solid fa-box-open text-5xl mb-4 text-slate-300 block"></i>
            <p className="font-black text-slate-500">Belum ada kegiatan terdaftar.</p>
          </div>
        )}
        {(groupedTasks || []).map(group => <GroupedTaskCard key={group.taskName} group={group} onClick={setSelectedTaskName} />)}
      </div>
    </div>
  );
};

export default TaskListMenu;
