import React, { useState } from 'react';
import { APP_ID } from '../../../config/firebase';

const ProgressReportMenu = ({ tasks = [], employees = [], db }) => {
  const [selectedEmp, setSelectedEmp] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const [amount, setAmount] = useState('');
  const [toast, setToast] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // PROTEKSI SUPER KETAT: Abaikan spasi ekstra dan huruf besar/kecil dari Admin
  const availableTasks = (tasks || []).filter(t => {
    const dbPicId = String(t.picId || '').replace(/\s+/g, '').toUpperCase();
    const inputEmp = String(selectedEmp || '').replace(/\s+/g, '').toUpperCase();
    
    // Pastikan nama cocok
    const matchPic = (dbPicId === inputEmp) && (inputEmp !== '');
    
    const targetInt = parseInt(t.target) || 0;
    const progressInt = parseInt(t.progress) || 0;
    const dbStatus = String(t.status || '').trim().toLowerCase();
    
    // Tugas dianggap aktif jika status belum selesai ATAU progress masih kurang dari target
    const isNotDone = dbStatus !== 'selesai' && progressInt < targetInt; 
    
    return matchPic && isNotDone;
  });

  const showToast = (type) => {
    setToast(type);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmp || !selectedTask || !amount || parseInt(amount) <= 0) {
      showToast('error'); return;
    }
    if (!db) { showToast('error'); return; }
    
    setIsSyncing(true);
    try {
      const task = (tasks || []).find(t => String(t.id) === String(selectedTask));
      if (!task) { showToast('error'); setIsSyncing(false); return; }

      const amountInt = parseInt(amount);
      const newProgress = Math.min((parseInt(task.progress) || 0) + amountInt, (parseInt(task.target) || 1));
      const isDone = newProgress >= (parseInt(task.target) || 1);
      const today = new Date().toISOString().split('T')[0];

      const currentDaily = (task.daily && task.daily[today]) ? parseInt(task.daily[today]) : 0;
      
      const updates = { 
        progress: newProgress, 
        status: isDone ? 'Selesai' : 'On Progress'
      };
      updates[`daily/${today}`] = currentDaily + amountInt;
      
      if (isDone && String(task.status || '').toLowerCase() !== 'selesai') updates.completedAt = today;
      else if (!isDone) updates.completedAt = null;
      else updates.completedAt = task.completedAt || null;

      await db.ref(`artifacts/${APP_ID}/public/data/tasks/${task.id}`).update(updates);

      setAmount('');
      setSelectedTask('');
      showToast('success');
    } catch (err) { showToast('error'); }
    setIsSyncing(false);
  };

  return (
    <div className="animate-slide-up max-w-lg mx-auto space-y-6 relative">
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] animate-slide-up">
          <div className={`px-5 py-2 rounded-full shadow-lg font-black text-xs flex items-center gap-2 text-white ${toast === 'success' ? 'bg-status-selesai' : 'bg-red-500'}`}>
            <i className={`fa-solid ${toast === 'success' ? 'fa-check-circle' : 'fa-xmark-circle'} text-lg`}></i> 
            {toast === 'success' ? 'BERHASIL' : 'GAGAL'}
          </div>
        </div>
      )}

      <div className="text-center mt-4">
        <div className="bg-gradient-to-br from-midnight to-midnight-light text-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-glossy">
           <i className="fa-solid fa-pen-to-square text-3xl"></i>
        </div>
        <h3 className="text-2xl font-black text-midnight tracking-tight">Lapor Progres</h3>
        <p className="text-slate-500 text-sm font-bold mt-1">Kirim hasil pekerjaan harian Anda.</p>
      </div>
      
      <div className="bg-white rounded-3xl shadow-soft border border-slate-100 p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-black text-midnight mb-2 uppercase tracking-wider"><i className="fa-solid fa-user-tag text-slate-400 mr-2"></i>Pilih Identitas</label>
            <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-midnight outline-none cursor-pointer" value={selectedEmp} onChange={(e) => { setSelectedEmp(e.target.value); setSelectedTask(''); }}>
              <option value="">-- Ketuk untuk memilih --</option>
              {(employees || []).map(emp => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
            </select>
          </div>
          
          {selectedEmp && (
            <div className="animate-slide-up">
              <label className="block text-xs font-black text-midnight mb-2 uppercase tracking-wider"><i className="fa-solid fa-list-check text-slate-400 mr-2"></i>Pilih Pekerjaan Aktif</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-midnight outline-none cursor-pointer" value={selectedTask} onChange={(e) => setSelectedTask(e.target.value)}>
                {/* Fallback Indikator Visual Jika Tugas Kosong */}
                {availableTasks.length === 0 ? (
                  <option value="">Tidak ada tugas aktif untuk Anda</option>
                ) : (
                  <>
                    <option value="">-- Pilih Pekerjaan --</option>
                    {availableTasks.map(t => <option key={t.id} value={t.id}>{t.taskName} (Sisa target: {(t.target || 0) - (t.progress || 0)})</option>)}
                  </>
                )}
              </select>
            </div>
          )}
          
          {selectedTask && (
            <div className="animate-slide-up">
              <label className="block text-xs font-black text-midnight mb-2 uppercase tracking-wider"><i className="fa-solid fa-arrow-up-9-1 text-slate-400 mr-2"></i>Jumlah Diselesaikan Hari Ini</label>
              <input type="number" min="1" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-3xl text-center font-black text-status-selesai outline-none placeholder:text-slate-300" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
            </div>
          )}
          
          <button type="submit" disabled={isSyncing || !selectedTask} className={`w-full text-white font-bold py-4 rounded-xl shadow-glossy transition-all flex justify-center items-center gap-2 mt-2 outline-none cursor-pointer ${(!selectedTask || isSyncing) ? 'bg-slate-400 cursor-not-allowed opacity-70' : 'bg-gradient-to-r from-midnight to-midnight-light hover:opacity-90 active:scale-95'}`}>
            {isSyncing ? <><i className="fa-solid fa-circle-notch fa-spin text-white"></i> Memproses...</> : <><i className="fa-solid fa-paper-plane"></i> Kirim Laporan</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProgressReportMenu;
