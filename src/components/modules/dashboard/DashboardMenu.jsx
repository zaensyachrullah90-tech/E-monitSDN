import React from 'react';
import GroupedTaskCard from '../tasks/GroupedTaskCard';
import LiveCountdown from '../../common/LiveCountdown';
import { formatDateId } from '../../../utils/formatters';

const DashboardMenu = ({ 
  groupedTasks = [], 
  votings = [], 
  employees = [], 
  attendanceEvents = [], 
  setActiveTab, 
  setSelectedTaskName, 
  setSelectedVoteId 
}) => {
  const nowTime = new Date().getTime();

  // 1. AKUMULASI TUGAS
  const totalTasks = groupedTasks ? groupedTasks.length : 0;
  const completedTasks = groupedTasks ? groupedTasks.filter(g => {
    const isStatusDone = String(g.status).toLowerCase() === 'selesai';
    const isProgressDone = g.target > 0 && g.progress >= g.target;
    return isStatusDone || isProgressDone;
  }).length : 0;
  const inProgressTasks = totalTasks - completedTasks;

  const activeGroups = groupedTasks ? groupedTasks.filter(g => {
    const isStatusDone = String(g.status).toLowerCase() === 'selesai';
    const isProgressDone = g.target > 0 && g.progress >= g.target;
    return !(isStatusDone || isProgressDone);
  }) : [];

  // 2. AKUMULASI VOTING
  const totalVotings = votings ? votings.length : 0;
  const activeVotingsCount = votings ? votings.filter(v => {
    if (!v.deadline) return true;
    return nowTime <= new Date(`${v.deadline}T23:59:59`).getTime();
  }).length : 0;

  const totalVotesCount = votings ? votings.reduce((sum, v) => {
    return sum + (v.votes ? Object.keys(v.votes).length : 0);
  }, 0) : 0;

  // 3. AKUMULASI SDM / PEGAWAI
  const totalEmployees = employees ? employees.length : 0;

  // 4. AKUMULASI ABSENSI
  const totalAttendanceEvents = attendanceEvents ? attendanceEvents.length : 0;
  const activeAttendanceCount = attendanceEvents ? attendanceEvents.filter(ev => {
    const timeLimit = ev.timeLimit || '23:59';
    return new Date() <= new Date(`${ev.date}T${timeLimit}`);
  }).length : 0;

  return (
    <div className="animate-slide-up space-y-6">
      {/* HEADER OVERVIEW */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl sm:text-3xl font-black text-midnight tracking-tight">Beranda Overview</h3>
          <p className="text-slate-500 text-xs sm:text-sm font-bold mt-0.5">Akumulasi Seluruh Sistem & Kinerja SDM</p>
        </div>
        <span className="bg-white border border-slate-200 text-midnight font-bold px-3 py-1.5 rounded-full shadow-sm text-xs flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <i className="fa-solid fa-wifi text-status-selesai"></i> Live Sync
        </span>
      </div>

      {/* GRID 5 STAT CARD UTAMA */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        
        {/* CARD 1: TOTAL TUGAS */}
        <div 
          onClick={() => setActiveTab('kegiatan')} 
          className="bg-gradient-to-br from-midnight to-midnight-light rounded-3xl p-4 sm:p-5 text-white shadow-glossy relative overflow-hidden cursor-pointer hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300"
        >
          <i className="fa-solid fa-list-check absolute -right-3 -bottom-3 text-6xl sm:text-7xl opacity-15"></i>
          <div className="relative z-10">
            <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-white/70 font-black block mb-1">Total Tugas</span>
            <h2 className="text-2xl sm:text-4xl font-black">{totalTasks}</h2>
            <div className="mt-2 text-[10px] sm:text-xs text-blue-300 font-bold flex items-center gap-1">
              <span>{completedTasks} Selesai</span> • <span>{inProgressTasks} Proses</span>
            </div>
          </div>
        </div>

        {/* CARD 2: ABSENSI AKTIF */}
        <div 
          onClick={() => setActiveTab('absensi')} 
          className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-4 sm:p-5 text-white shadow-glossy relative overflow-hidden cursor-pointer hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300"
        >
          <i className="fa-solid fa-fingerprint absolute -right-3 -bottom-3 text-6xl sm:text-7xl opacity-20"></i>
          <div className="relative z-10">
            <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-white/80 font-black block mb-1">Absensi Aktif</span>
            <h2 className="text-2xl sm:text-4xl font-black">{activeAttendanceCount}</h2>
            <div className="mt-2 text-[10px] sm:text-xs text-amber-100 font-bold flex items-center gap-1">
              <i className="fa-solid fa-clock text-[10px] animate-pulse"></i>
              <span>{totalAttendanceEvents} Total Kegiatan</span>
            </div>
          </div>
        </div>

        {/* CARD 3: TOTAL VOTING */}
        <div 
          onClick={() => setActiveTab('voting')} 
          className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-4 sm:p-5 text-white shadow-glossy relative overflow-hidden cursor-pointer hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300"
        >
          <i className="fa-solid fa-check-to-slot absolute -right-3 -bottom-3 text-6xl sm:text-7xl opacity-15"></i>
          <div className="relative z-10">
            <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-white/70 font-black block mb-1">Total Voting</span>
            <h2 className="text-2xl sm:text-4xl font-black">{totalVotings}</h2>
            <div className="mt-2 text-[10px] sm:text-xs text-yellow-300 font-bold flex items-center gap-1">
              <i className="fa-solid fa-fire text-[10px] animate-pulse"></i> {activeVotingsCount} Voting Aktif
            </div>
          </div>
        </div>

        {/* CARD 4: SUARA MASUK */}
        <div 
          onClick={() => setActiveTab('voting')} 
          className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-4 sm:p-5 text-white shadow-glossy relative overflow-hidden cursor-pointer hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300"
        >
          <i className="fa-solid fa-box-archive absolute -right-3 -bottom-3 text-6xl sm:text-7xl opacity-15"></i>
          <div className="relative z-10">
            <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-white/70 font-black block mb-1">Suara Masuk</span>
            <h2 className="text-2xl sm:text-4xl font-black">{totalVotesCount}</h2>
            <div className="mt-2 text-[10px] sm:text-xs text-emerald-200 font-bold">
              Partisipasi Suara
            </div>
          </div>
        </div>

        {/* CARD 5: SDM TERDAFTAR */}
        <div 
          onClick={() => setActiveTab('peringkat')} 
          className="bg-gradient-to-br from-slate-800 to-midnight rounded-3xl p-4 sm:p-5 text-white shadow-glossy relative overflow-hidden cursor-pointer hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 col-span-2 sm:col-span-1"
        >
          <i className="fa-solid fa-users absolute -right-3 -bottom-3 text-6xl sm:text-7xl opacity-15"></i>
          <div className="relative z-10">
            <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-white/70 font-black block mb-1">SDM Terdaftar</span>
            <h2 className="text-2xl sm:text-4xl font-black">{totalEmployees}</h2>
            <div className="mt-2 text-[10px] sm:text-xs text-purple-300 font-bold">
              Lihat Ranking &gt;
            </div>
          </div>
        </div>

      </div>

      {/* METRIK DETAIL TUGAS */}
      <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
        <div className="bg-white rounded-3xl shadow-soft border border-slate-100 p-4 sm:p-5 flex items-center gap-3 sm:gap-4 hover:shadow-md transition-shadow">
          <div className="bg-status-selesai/10 text-status-selesai w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0">
            <i className="fa-solid fa-circle-check text-xl sm:text-2xl"></i>
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-midnight leading-none mb-1">{completedTasks}</h2>
            <h6 className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider leading-none">Tugas Selesai</h6>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-soft border border-slate-100 p-4 sm:p-5 flex items-center gap-3 sm:gap-4 hover:shadow-md transition-shadow">
          <div className="bg-status-proses/10 text-status-proses w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0">
            <i className="fa-solid fa-person-digging text-xl sm:text-2xl"></i>
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-midnight leading-none mb-1">{inProgressTasks}</h2>
            <h6 className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider leading-none">Sedang Proses</h6>
          </div>
        </div>
      </div>

      {/* SECTION 1: KEGIATAN ABSENSI AKTIF & TERBARU */}
      <div className="space-y-3 pt-2">
        <div className="flex justify-between items-center">
          <h5 className="font-bold text-midnight flex items-center gap-2 text-sm sm:text-base">
            <i className="fa-solid fa-fingerprint text-amber-500 animate-pulse"></i> Absensi & Kegiatan Terbaru
          </h5>
          <button onClick={() => setActiveTab('absensi')} className="text-xs font-bold text-amber-600 hover:underline outline-none cursor-pointer">
            Lihat Semua ({totalAttendanceEvents}) &gt;
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {attendanceEvents && attendanceEvents.slice(0, 3).map(ev => {
            const isExpired = new Date() > new Date(`${ev.date}T${ev.timeLimit || '23:59'}`);
            return (
              <button 
                key={ev.id} 
                onClick={() => setActiveTab('absensi')}
                className={`bg-white rounded-3xl shadow-soft border p-4 sm:p-5 text-left transition-all duration-300 hover:shadow-md cursor-pointer outline-none relative overflow-hidden group ${
                  !isExpired ? 'border-amber-200 hover:border-amber-400' : 'border-slate-100 hover:border-slate-300'
                }`}
              >
                <div className={`absolute top-0 right-0 text-[9px] font-black px-3 py-1 rounded-bl-xl border-b border-l uppercase ${
                  isExpired ? 'bg-red-50 text-red-500 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                }`}>
                  {isExpired ? 'Waktu Habis' : 'Buka'}
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Form Absensi</span>
                </div>

                <h4 className="font-black text-midnight text-base leading-tight mb-3 pr-16 truncate">{ev.title}</h4>
                
                <div className="space-y-1.5 border-t border-slate-100 pt-3">
                  <div className="text-[10px] font-bold text-slate-500 flex items-center gap-2">
                    <i className="fa-regular fa-calendar-days text-amber-500 w-4"></i> 
                    <span>{formatDateId(ev.date)} • Batas: {ev.timeLimit || '23:59'}</span>
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 flex items-center gap-2">
                    <i className="fa-solid fa-location-dot text-amber-500 w-4"></i> 
                    <span className="truncate">{ev.location || 'Lokasi Kegiatan'}</span>
                  </div>
                </div>
              </button>
            );
          })}

          {(!attendanceEvents || attendanceEvents.length === 0) && (
            <div className="col-span-full bg-white rounded-3xl shadow-soft border border-slate-100 text-center py-8 sm:py-10">
              <i className="fa-solid fa-fingerprint text-4xl sm:text-5xl mb-3 text-slate-300 block"></i>
              <h5 className="font-black text-midnight text-base sm:text-lg mb-1">Belum Ada Absensi</h5>
              <p className="text-slate-500 text-xs sm:text-sm font-medium">Admin belum membuat jadwal absensi kegiatan baru.</p>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: VOTING & PEMILIHAN TERBARU */}
      {votings && votings.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-center">
            <h5 className="font-bold text-midnight flex items-center gap-2 text-sm sm:text-base">
              <i className="fa-solid fa-check-to-slot text-blue-500"></i> Voting & Pemilihan Terbaru
            </h5>
            <button onClick={() => setActiveTab('voting')} className="text-xs font-bold text-status-selesai hover:underline outline-none cursor-pointer">
              Lihat Semua ({totalVotings}) &gt;
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {votings.slice(0, 3).map(v => {
              const totalVoters = v.voters ? v.voters.length : 0;
              const totalVotes = v.votes ? Object.keys(v.votes).length : 0;
              const targetTime = v.deadline ? new Date(`${v.deadline}T23:59:59`).getTime() : 0;
              const isExpired = v.deadline && nowTime > targetTime;
              const diffDays = v.deadline ? Math.ceil((targetTime - nowTime) / (1000 * 60 * 60 * 24)) : 99;
              const isUrgent = !isExpired && diffDays <= 2 && v.deadline;

              return (
                <button 
                  key={v.id} 
                  onClick={() => { setSelectedVoteId(v.id); setActiveTab('voting'); }} 
                  className={`card-btn bg-white rounded-3xl shadow-soft border p-4 sm:p-5 relative overflow-hidden transition-all duration-300 text-left cursor-pointer outline-none ${
                    isUrgent 
                      ? 'animate-urgent-card ring-1 ring-red-400 border-red-500' 
                      : 'border-slate-100 hover:border-blue-300 hover:shadow-md'
                  }`}
                >
                  {isUrgent && (
                    <div className="bg-red-600 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-bl-xl absolute top-0 right-0 flex items-center gap-1 shadow-sm z-10">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                      Mendesak
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-2 gap-2">
                    <h5 className="font-black text-midnight text-base leading-tight truncate">{v.title}</h5>
                    <span className="bg-blue-50 text-status-selesai text-[9px] font-black px-2 py-0.5 rounded border border-blue-100 uppercase shrink-0">
                      {v.isMulti ? 'Multi' : 'Single'}
                    </span>
                  </div>
                  
                  <div className="text-[10px] font-bold text-slate-500 mb-3 flex items-center gap-2 flex-wrap">
                    <span className="bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                      <i className="fa-solid fa-calendar-day mr-1"></i> {formatDateId(v.createdAt)}
                    </span>
                    {v.deadline && <LiveCountdown deadline={v.deadline} />}
                    {isExpired && <span className="bg-red-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase">Ditutup</span>}
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1.5">
                    <div className="bg-status-selesai h-1.5 rounded-full transition-all duration-500" style={{ width: `${totalVoters === 0 ? 0 : (totalVotes / totalVoters) * 100}%` }}></div>
                  </div>
                  <div className="text-[10px] font-black text-slate-400 flex justify-between">
                    <span>SUARA MASUK</span> 
                    <span className="text-midnight">{totalVotes} / {totalVoters} SDM</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: TUGAS ON PROGRESS (MENDESAK) */}
      <div className="space-y-3 pt-2">
        <div className="flex justify-between items-center">
          <h5 className="font-bold text-midnight flex items-center gap-2 text-sm sm:text-base">
            <i className="fa-solid fa-fire-flame-curved text-red-500 animate-bounce"></i> Tugas On Progress (Mendesak)
          </h5>
          <button onClick={() => setActiveTab('kegiatan')} className="text-xs font-bold text-status-selesai hover:underline outline-none cursor-pointer">
            Lihat Semua ({totalTasks}) &gt;
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {activeGroups.sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 6).map(group => (
            <GroupedTaskCard key={group.taskName} group={group} onClick={(name) => { setSelectedTaskName(name); setActiveTab('kegiatan'); }} />
          ))}
          {activeGroups.length === 0 && (
            <div className="col-span-full bg-white rounded-3xl shadow-soft border border-slate-100 text-center py-8 sm:py-10">
              <i className="fa-solid fa-mug-hot text-4xl sm:text-5xl mb-3 text-slate-300 block"></i>
              <h5 className="font-black text-midnight text-base sm:text-lg mb-1">Pekerjaan Tuntas!</h5>
              <p className="text-slate-500 text-xs sm:text-sm font-medium">Tidak ada kegiatan yang berjalan saat ini.</p>
            </div>
          )}
        </div>
      </div>

      <div className="text-center text-xs text-slate-400 mt-10 mb-4 font-bold uppercase tracking-widest opacity-60">
        Developed by M. Zaen Syachrullah
      </div>
    </div>
  );
};

export default DashboardMenu;