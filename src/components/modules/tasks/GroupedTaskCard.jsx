import React, { memo } from 'react';
import LiveCountdown from '../../common/LiveCountdown';
import { formatDateId } from '../../../utils/formatters';

const GroupedTaskCard = memo(({ group, onClick }) => {
  const percent = Math.min(Math.round((group.progress / group.target) * 100), 100);
  const isDone = percent >= 100;
  
  // Hitung apakah deadline mendesak (<= 2 hari & belum selesai)
  const targetDate = group.deadline ? new Date(`${group.deadline}T23:59:59`).getTime() : 0;
  const now = new Date().getTime();
  const diffDays = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));
  const isUrgent = !isDone && diffDays <= 2;

  const borderColor = isDone 
    ? 'border-status-selesai' 
    : isUrgent 
      ? 'border-red-500' 
      : 'border-status-proses';
  const progressBg = isDone ? 'bg-status-selesai' : 'bg-status-proses';
  const percentColor = isDone ? 'text-status-selesai' : 'text-status-proses';

  return (
    <button 
      type="button" 
      className={`card-btn bg-white rounded-3xl shadow-soft border-l-[6px] ${borderColor} overflow-hidden relative transition-all duration-300 hover:shadow-xl ${
        isUrgent ? 'animate-urgent-card ring-1 ring-red-400' : 'hover:border-slate-300'
      }`} 
      onClick={() => onClick(group.taskName)}
    >
      {/* BADGE ANIMASI MENDESAK */}
      {isUrgent && (
        <div className="bg-red-600 text-white text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-2xl absolute top-0 right-0 flex items-center gap-1.5 shadow-md z-10">
          <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
          <i className="fa-solid fa-fire text-yellow-300"></i> Segera Isi
        </div>
      )}

      <div className="p-5">
        <div className="flex justify-between items-start gap-3 mb-4">
          <div className="flex-1 pr-12">
            <h5 className="font-black text-midnight text-lg leading-tight mb-2 group-hover:text-status-selesai transition-colors">{group.taskName}</h5>
            <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-500 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide">
              <i className="fa-regular fa-calendar-check"></i> {formatDateId(group.deadline)}
            </span>
          </div>
          {!isUrgent && <LiveCountdown deadline={group.deadline} />}
        </div>

        {isUrgent && (
          <div className="mb-4">
            <LiveCountdown deadline={group.deadline} />
          </div>
        )}

        <div className="mb-4">
          <div className="flex justify-between text-xs font-bold mb-1.5">
            <span className="text-slate-500">Progress ({group.progress}/{group.target})</span>
            <span className={`font-black text-sm ${percentColor}`}>{percent}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 shadow-inner overflow-hidden">
            <div className={`${progressBg} h-2.5 rounded-full transition-all duration-1000 ease-out`} style={{ width: `${percent}%` }}></div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-slate-100/80">
          <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
            <i className="fa-solid fa-users text-slate-400"></i> {group.assignees.length} Pelaksana
          </div>
          <div className="text-xs font-black text-white bg-midnight px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5">
            <i className="fa-solid fa-check-double text-blue-400"></i> Selesai: {group.assignees.filter(a => a.progress >= a.target).length}
          </div>
        </div>
      </div>
    </button>
  );
});

export default GroupedTaskCard;