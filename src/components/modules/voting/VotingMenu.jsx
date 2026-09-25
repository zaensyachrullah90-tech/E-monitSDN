import React, { useState } from 'react';
import { formatDateId, encodeSafeKey } from '../../../utils/formatters';
import { APP_ID } from '../../../config/firebase';
import LiveCountdown from '../../common/LiveCountdown';

const VotingMenu = ({ votings, db, employees, selectedVoteId, setSelectedVoteId }) => {
  const [activeTab, setActiveTab] = useState('statistik'); 
  const [voteEmp, setVoteEmp] = useState('');
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState(null);

  const activeVote = votings.find(v => String(v.id) === String(selectedVoteId));

  const showToast = (type) => {
    setToast(type);
    setTimeout(() => setToast(null), 3000);
  };

  const handleCastVote = async (e) => {
    e.preventDefault();
    if (!db || !voteEmp || selectedOptions.length === 0) { showToast('error'); return; }

    // FITUR BARU: CEK DEADLINE VOTING
    if (activeVote.deadline) {
      const targetTime = new Date(`${activeVote.deadline}T23:59:59`).getTime();
      if (new Date().getTime() > targetTime) {
        alert("Maaf, waktu untuk voting ini sudah habis!");
        return;
      }
    }

    setIsSyncing(true);
    try {
      const safeKey = encodeSafeKey(voteEmp);
      await db.ref(`artifacts/${APP_ID}/public/data/votings/${activeVote.id}/votes/${safeKey}`).set({
        name: voteEmp,
        options: selectedOptions
      });
      showToast('success');
      setVoteEmp(''); setSelectedOptions([]); setActiveTab('statistik');
    } catch (err) { showToast('error'); }
    setIsSyncing(false);
  };

  const toggleOption = (opt) => {
    if (!activeVote.isMulti) { setSelectedOptions([opt]); return; }
    if (selectedOptions.includes(opt)) setSelectedOptions(selectedOptions.filter(o => o !== opt));
    else setSelectedOptions([...selectedOptions, opt]);
  };

  if (!selectedVoteId) {
    return (
      <div className="animate-slide-up space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-black text-midnight tracking-tight">Kotak Suara</h3>
            <p className="text-slate-500 text-sm font-bold mt-0.5">Pemilihan & Voting Bersama (Terbaru)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {votings.length === 0 && (
            <div className="bg-white rounded-3xl shadow-soft border border-slate-100 text-center py-12">
              <i className="fa-solid fa-check-to-slot text-5xl mb-4 text-slate-300 block"></i>
              <p className="font-black text-slate-500">Belum ada voting aktif.</p>
            </div>
          )}
          {votings.map(v => {
            const totalVoters = v.voters ? v.voters.length : 0;
            const totalVotes = v.votes ? Object.keys(v.votes).length : 0;
            const isExpired = v.deadline && new Date().getTime() > new Date(`${v.deadline}T23:59:59`).getTime();

            return (
              <button type="button" key={v.id} onClick={() => setSelectedVoteId(v.id)} className="card-btn bg-white rounded-3xl shadow-soft border border-slate-100 p-5 relative overflow-hidden">
                <div className="flex items-start justify-between mb-3 gap-2">
                  <h5 className="font-black text-midnight text-lg w-3/4">{v.title}</h5>
                  <div className="flex flex-col items-end gap-1">
                    <span className="bg-blue-50 text-status-selesai text-[10px] font-black px-2 py-1 rounded-md border border-blue-100 uppercase">{v.isMulti ? 'Multi' : 'Single'}</span>
                    {isExpired && <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase">Ditutup</span>}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1 rounded-md">
                    <i className="fa-solid fa-calendar-day mr-1"></i> {formatDateId(v.createdAt)}
                  </div>
                  {v.deadline && <LiveCountdown deadline={v.deadline} />}
                </div>

                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1.5">
                  <div className="bg-status-selesai h-1.5 rounded-full" style={{ width: `${totalVoters === 0 ? 0 : (totalVotes / totalVoters) * 100}%` }}></div>
                </div>
                <div className="text-[10px] font-black text-slate-400 flex justify-between">
                  <span>SUARA MASUK</span> 
                  <span className="text-midnight">{totalVotes} / {totalVoters} Org</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const votesObj = activeVote.votes || {};
  const votesArray = Object.values(votesObj);
  const sudahVoteNames = votesArray.map(v => v.name).sort((a,b) => a.localeCompare(b));
  const voters = activeVote.voters || [];
  const belumVoteNames = voters.filter(v => !sudahVoteNames.includes(v)).sort((a,b) => a.localeCompare(b));

  const optionCounts = {};
  activeVote.options.forEach(o => optionCounts[o] = 0);
  let totalSuaraMasuk = 0;
  votesArray.forEach(vote => {
     if(vote.options && Array.isArray(vote.options)) {
       vote.options.forEach(p => { if(optionCounts[p] !== undefined) optionCounts[p]++; totalSuaraMasuk++; });
     }
  });

  const isExpired = activeVote.deadline && new Date().getTime() > new Date(`${activeVote.deadline}T23:59:59`).getTime();

  return (
    <div className="animate-slide-up space-y-4 relative pb-10">
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] animate-slide-up">
          <div className={`px-5 py-2 rounded-full shadow-lg font-black text-xs flex items-center gap-2 text-white ${toast === 'success' ? 'bg-status-selesai' : 'bg-red-500'}`}>
            <i className={`fa-solid ${toast === 'success' ? 'fa-check-circle' : 'fa-xmark-circle'} text-lg`}></i> 
            {toast === 'success' ? 'BERHASIL' : 'GAGAL'}
          </div>
        </div>
      )}

      <button type="button" onClick={() => setSelectedVoteId(null)} className="bg-white text-midnight border border-slate-200 shadow-sm rounded-full font-bold px-4 py-2 text-xs flex items-center gap-2 hover:bg-slate-50 outline-none cursor-pointer">
        <i className="fa-solid fa-arrow-left-long text-status-selesai"></i> Kembali
      </button>

      <div className="bg-gradient-to-br from-midnight to-midnight-light rounded-3xl p-6 text-white relative shadow-glossy">
        <i className="fa-solid fa-check-to-slot absolute -right-4 -bottom-4 text-7xl opacity-10"></i>
        <div className="flex justify-between items-start mb-2 relative z-10">
          <h3 className="text-2xl font-black leading-tight">{activeVote.title}</h3>
          {activeVote.deadline && <LiveCountdown deadline={activeVote.deadline} />}
        </div>
        <p className="text-white/60 font-bold text-xs relative z-10 uppercase tracking-widest">{activeVote.isMulti ? 'Bisa pilih lebih dari satu' : 'Hanya boleh pilih satu'}</p>
      </div>

      <div className="flex bg-white rounded-xl shadow-sm border border-slate-100 p-1">
         <button type="button" onClick={()=>setActiveTab('statistik')} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-colors outline-none cursor-pointer ${activeTab==='statistik' ? 'bg-midnight text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Statistik</button>
         <button type="button" onClick={()=>setActiveTab('sudah')} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-colors outline-none cursor-pointer ${activeTab==='sudah' ? 'bg-midnight text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Sudah ({sudahVoteNames.length})</button>
         <button type="button" onClick={()=>setActiveTab('belum')} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-colors outline-none cursor-pointer ${activeTab==='belum' ? 'bg-midnight text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Belum ({belumVoteNames.length})</button>
         <button type="button" onClick={()=>setActiveTab('beri_suara')} className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-colors outline-none cursor-pointer ${activeTab==='beri_suara' ? 'bg-status-selesai text-white shadow-md' : 'text-status-selesai hover:bg-blue-50'}`}>Vote!</button>
      </div>

      {activeTab === 'statistik' && (
        <div className="bg-white rounded-3xl shadow-soft border border-slate-100 p-5 space-y-4 animate-fade-in">
           {activeVote.options.map((opt, i) => {
              const count = optionCounts[opt];
              const pct = totalSuaraMasuk === 0 ? 0 : Math.round((count / totalSuaraMasuk) * 100);
              return (
                <div key={i} className="mb-2">
                   <div className="flex justify-between text-xs font-bold text-midnight mb-1">
                      <span>{opt}</span><span>{count} Suara ({pct}%)</span>
                   </div>
                   <div className="w-full bg-slate-100 rounded-full h-3">
                      <div className="bg-status-selesai h-3 rounded-full" style={{width: `${pct}%`}}></div>
                   </div>
                </div>
              )
           })}
        </div>
      )}

      {activeTab === 'sudah' && (
        <div className="bg-white rounded-3xl shadow-soft border border-slate-100 p-5 space-y-3 animate-fade-in">
           {votesArray.length === 0 && <p className="text-center text-xs font-bold text-slate-400 py-4">Belum ada suara masuk.</p>}
           {votesArray.map(voteData => (
             <div key={voteData.name} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="font-bold text-midnight text-xs">{voteData.name}</span>
                <div className="flex gap-1 flex-wrap justify-end max-w-[60%]">
                  {voteData.options && voteData.options.map(opt => <span key={opt} className="bg-blue-50 border border-blue-100 text-status-selesai text-[9px] font-bold px-2 py-1 rounded-md truncate">{opt}</span>)}
                </div>
             </div>
           ))}
        </div>
      )}

      {activeTab === 'belum' && (
        <div className="bg-white rounded-3xl shadow-soft border border-slate-100 p-5 space-y-2 animate-fade-in">
           {belumVoteNames.length === 0 && <p className="text-center text-xs font-bold text-slate-400 py-4">Semua orang sudah memberikan suaranya!</p>}
           {belumVoteNames.map(name => (
             <div key={name} className="bg-slate-50 p-3 rounded-xl border border-slate-100 font-bold text-slate-500 text-xs flex items-center gap-2">
                <i className="fa-solid fa-circle-exclamation text-orange-400"></i> {name}
             </div>
           ))}
        </div>
      )}

      {activeTab === 'beri_suara' && (
        <form onSubmit={handleCastVote} className="bg-white rounded-3xl shadow-soft border border-slate-100 p-5 space-y-5 animate-fade-in">
           {isExpired ? (
             <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-center font-black text-sm">
               <i className="fa-solid fa-lock mr-2"></i> WAKTU VOTING TELAH HABIS!
             </div>
           ) : (
             <>
               <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Pilih Identitas Anda</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-midnight outline-none cursor-pointer" value={voteEmp} onChange={(e) => setVoteEmp(e.target.value)}>
                    <option value="">-- Nama Anda --</option>
                    {voters.map(v => <option key={v} value={v}>{v} {sudahVoteNames.includes(v) ? '(Ubah Pilihan)' : ''}</option>)}
                  </select>
               </div>
               {voteEmp && (
                 <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase">Pilihan Anda</label>
                    <div className="space-y-2">
                       {activeVote.options.map(opt => {
                         const isSelected = selectedOptions.includes(opt);
                         return (
                           <button type="button" key={opt} onClick={() => toggleOption(opt)} className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm font-bold transition-colors outline-none cursor-pointer ${isSelected ? 'bg-blue-50 border-status-selesai text-status-selesai' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                              <span>{opt}</span>
                              {isSelected && <i className="fa-solid fa-circle-check"></i>}
                           </button>
                         )
                       })}
                    </div>
                 </div>
               )}
               <button type="submit" disabled={isSyncing} className="w-full bg-status-selesai text-white font-bold py-3.5 rounded-xl shadow-md active:scale-95 transition-all text-sm outline-none mt-2 cursor-pointer">
                  {isSyncing ? 'Mengirim...' : 'Kirim Suara'}
               </button>
             </>
           )}
        </form>
      )}
    </div>
  );
};

export default VotingMenu;