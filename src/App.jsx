import React, { useState } from 'react';
import { useRealtimeData } from './hooks/useRealtimeData';
import Header from './components/common/Header';
import Navbar from './components/common/Navbar';

import DashboardMenu from './components/modules/dashboard/DashboardMenu';
import TaskListMenu from './components/modules/tasks/TaskListMenu';
import LeaderboardMenu from './components/modules/leaderboard/LeaderboardMenu';
import ProgressReportMenu from './components/modules/progress/ProgressReportMenu';
import VotingMenu from './components/modules/voting/VotingMenu';
import AttendanceMenu from './components/modules/attendance/AttendanceMenu';
import AdminMenu from './components/modules/admin/AdminMenu';
import LivePreviewView from './components/modules/preview/LivePreviewView';

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const previewParam = urlParams.get('preview');
  const voteParam = urlParams.get('vote'); // MENAMBAHKAN PENDETEKSI LINK VOTE

  // PERBAIKAN: Berikan fallback = [] pada semua data array agar tidak "undefined" dan menyebabkan error 'length'
  const { 
    tasks = [], 
    groupedTasks = [], 
    votings = [], 
    employees = [], 
    attendanceEvents = [], 
    db, 
    isLoading, 
    globalError 
  } = useRealtimeData();

  // OTOMATIS BUKA MENU VOTING JIKA ADA LINK VOTE, JIKA TIDAK BUKA DASHBOARD
  const [activeTab, setActiveTab] = useState(voteParam ? 'voting' : 'dashboard');
  const [selectedTaskName, setSelectedTaskName] = useState(null);
  const [selectedVoteId, setSelectedVoteId] = useState(null);
  const [isAdminLogged, setIsAdminLogged] = useState(() => sessionStorage.getItem('adminAuth') === 'true');

  if (previewParam) {
    return <LivePreviewView taskName={previewParam} groupedTasks={groupedTasks} />;
  }

  if (globalError) {
    return (
      <div className="min-h-screen flex flex-col gap-5 items-center justify-center bg-slate-50 p-6 text-center">
        <i className="fa-solid fa-triangle-exclamation text-red-500 text-7xl drop-shadow-md"></i>
        <h2 className="text-2xl font-black text-midnight">Koneksi Terhambat</h2>
        <p className="text-slate-600 font-bold bg-white border border-red-100 p-5 rounded-2xl shadow-soft text-sm max-w-sm">
          <span className="text-red-500 block mb-2">{globalError}</span>
        </p>
        <button onClick={() => window.location.reload()} className="bg-midnight text-white px-8 py-3.5 rounded-full font-bold shadow-glossy mt-2 active:scale-95 transition-all outline-none cursor-pointer">
          Muat Ulang Layar
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col gap-5 items-center justify-center bg-slate-50">
        <i className="fa-solid fa-circle-notch fa-spin text-status-selesai text-5xl drop-shadow-sm"></i>
        <h5 className="font-black text-midnight text-sm uppercase tracking-widest">Menghubungkan ke Server...</h5>
      </div>
    );
  }

  const renderModule = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardMenu 
            groupedTasks={groupedTasks} 
            votings={votings} 
            employees={employees} 
            attendanceEvents={attendanceEvents} 
            setActiveTab={setActiveTab} 
            setSelectedTaskName={setSelectedTaskName} 
            setSelectedVoteId={setSelectedVoteId} 
          />
        );
      case 'kegiatan':
        return (
          <TaskListMenu 
            groupedTasks={groupedTasks} 
            selectedTaskName={selectedTaskName} 
            setSelectedTaskName={setSelectedTaskName} 
            isAdminLogged={isAdminLogged} 
          />
        );
      case 'peringkat':
        return <LeaderboardMenu groupedTasks={groupedTasks} />;
      case 'input':
        return <ProgressReportMenu tasks={tasks} employees={employees} db={db} />;
      case 'voting':
        return (
          <VotingMenu 
            votings={votings} 
            db={db} 
            employees={employees} 
            selectedVoteId={selectedVoteId} 
            setSelectedVoteId={setSelectedVoteId} 
          />
        );
      case 'absensi':
        return <AttendanceMenu db={db} employees={employees} />;
      case 'admin':
        return (
          <AdminMenu 
            db={db} 
            tasks={tasks} 
            groupedTasks={groupedTasks} 
            votings={votings} 
            employees={employees} 
            isAdminLogged={isAdminLogged} 
            setIsAdminLogged={setIsAdminLogged} 
          />
        );
      default:
        return (
          <DashboardMenu 
            groupedTasks={groupedTasks} 
            votings={votings} 
            employees={employees} 
            attendanceEvents={attendanceEvents}
            setActiveTab={setActiveTab} 
            setSelectedTaskName={setSelectedTaskName} 
            setSelectedVoteId={setSelectedVoteId} 
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex flex-col selection:bg-blue-500 selection:text-white">
      <Header />
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-44 flex-1">
        {renderModule()}
      </main>
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onTabChange={() => { 
          setSelectedTaskName(null); 
          setSelectedVoteId(null); 
          // BERSIHKAN URL AGAR TIDAK MENGUNCI SAAT PINDAH MENU
          const url = new URL(window.location);
          if (url.searchParams.has('vote')) {
            url.searchParams.delete('vote');
            window.history.pushState({}, '', url);
          }
        }} 
      />
    </div>
  );
}
