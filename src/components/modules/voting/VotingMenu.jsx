import React, { useState } from 'react';
import { formatDateId, encodeSafeKey } from '../../../utils/formatters';
import { APP_ID } from '../../../config/firebase';
import LiveCountdown from '../../common/LiveCountdown';

const VotingMenu = ({ votings = [], db, employees = [], selectedVoteId, setSelectedVoteId }) => {
  const [activeTab, setActiveTab] = useState('statistik'); 
  const [voteEmp, setVoteEmp] = useState('');
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState(null);

  const activeVote = (votings || []).find(v => String(v.id) === String(selectedVoteId));
  
  // Deteksi status admin dari sesi yang aktif
  const isAdminLogged = sessionStorage.getItem('adminAuth') === 'true'; 

  const showToast = (type) => {
    setToast(type);
    setTimeout(() => setToast(null), 3000);
  };

  // FITUR BARU: SHARE LINK MENGGUNAKAN JUDUL VOTE
  const handleShareVote = (e, v) => {
    if(e) e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}?vote=${encodeURIComponent(v.title)}`;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(() => {
        showToast('success');
        alert(`Berhasil! Link Voting telah disalin.\n\nSilakan Paste di Grup WhatsApp:\n${url}`);
      }).catch(() => {
        window.prompt("Salin link voting berikut manual:", url);
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
        alert(`Berhasil! Link Voting telah disalin.\n\nSilakan Paste di Grup WhatsApp:\n${url}`);
      } catch (err) {
        window.prompt("Salin link voting berikut manual:", url);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleCastVote = async (e) => {
    e.preventDefault();
    if (!db || !voteEmp || selectedOptions.length === 0) { showToast('error'); return; }

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
          {(votings || []).length === 0 && (
            <div className="bg-white rounded-3xl shadow-soft border border-slate-100 text-center py-12">
              <i className="fa-solid fa-check-to-slot text-5xl mb-4 text-slate-300 block"></i>
              <p className="font-black text-slate-500">Belum ada voting aktif.</p>
            </div>
          )}
          {(votings || []).map(v => {
            const totalVoters = v.voters ? v.voters.length : 0;
            const totalVotes = v.votes ? Object.keys(v.votes).length : 0;
            const isExpired = v.deadline && new Date().getTime() > new Date(`${v.deadline}T23:59:59`).getTime();

            return (
              <div key={v.id} className="bg-white rounded-3xl shadow-soft border border-slate-100 relative overflow-hidden transition-all duration-300 hover:shadow-md hover:border-blue-300 group">
                <button type="button" onClick={() => setSelectedVoteId(v.id)} className="w-full p-5 text-left outline-none cursor-pointer">
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <h5 className="font-black text-midnight text-lg w-3/4 group-hover:text-status-selesai transition-colors">{v.title}</h5>
                    <div className="flex flex-col items-end gap-1">
                      <span className="bg-blue-50 text-status-selesai text-[10px] font-black px-2 py-1 rounded-md border border-blue-100 uppercase">{v.isMulti ? 'Multi' : 'Single'}</span>
                      {isExpired && <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase shadow-sm">Ditutup</span>}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1 rounded-md">
                      <i className="fa-solid fa-calendar-day mr-1 text-slate-400"></i> {formatDateId(v.createdAt)}
                    </div>
                    {v.deadline && <LiveCountdown deadline={v.deadline} />}
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1.5 overflow-hidden">
                    <div className="bg-status-selesai h-1.5 rounded-full transition-all duration-1000 ease-out" style={{ width: `${totalVoters === 0 ? 0 : (totalVotes / totalVoters) * 100}%` }}></div>
                  </div>
                  <div className="text-[10px] font-black text-slate-400 flex justify-between">
                    <span>SUARA MASUK</span> 
                    <span className="text-midnight">{totalVotes} / {totalVoters} SDM</span>
                  </div>
                </button>

                {/* TOMBOL SHARE LINK KHUSUS ADMIN DI LUAR KARTU */}
                {isAdminLogged && (
                  <div className="px-5 pb-5 pt-0">
                    <button 
                      type="button"
                      onClick={(e) => handleShareVote(e, v)}
                      className="w-full bg-blue-50 text-status-selesai border border-blue-200 font-black py-2.5 rounded-xl text-[10px] sm:text-xs hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 outline-none cursor-pointer shadow-sm"
                    >
                      <i className="fa-solid fa-share-nodes"></i> Salin Link ({v.title})
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // --- PEMROSESAN DATA VOTING (SIMETRIS) ---
  const votesObj = activeVote.votes || {};
  const votesArray = Object.values(votesObj);
  const sudahVoteNames = votesArray.map(v => v.name).sort((a,b) => a.localeCompare(b));
  const voters = activeVote.voters || [];
  const belumVoteNames = voters.filter(v => !sudahVoteNames.includes(v)).sort((a,b) => a.localeCompare(b));

  // Menampung siapa saja yang vote di masing-masing opsi
  const optionData = {};
  activeVote.options.forEach(o => {
    optionData[o] = { count: 0, voters: [] };
  });

  let totalSuaraMasuk = 0;
  votesArray.forEach(vote => {
     if(vote.options && Array.isArray(vote.options)) {
       vote.options.forEach(p => { 
         if(optionData[p]) {
           optionData[p].count++; 
           optionData[p].voters.push(vote.name);
           totalSuaraMasuk++; 
         }
       });
     }
  });

  // Urutkan opsi berdasarkan suara terbanyak
  const sortedOptions = activeVote.options.sort((a, b) => optionData[b].count - optionData[a].count);
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

      {/* HEADER NAVIGASI & TOMBOL SHARE ADMIN */}
      <div className="flex flex-wrap gap-2 justify-between items-center mb-2">
        <button type="button" onClick={() => setSelectedVoteId(null)} className="bg-white text-midnight border border-slate-200 shadow-sm rounded-full font-bold px-4 py-2 text-xs flex items-center gap-2 hover:bg-slate-50 transition-colors outline-none cursor-pointer">
          <i className="fa-solid fa-arrow-left-long text-status-selesai"></i> Kembali
        </button>

        {isAdminLogged && (
          <button 
            type="button"
            onClick={(e) => handleShareVote(e, activeVote)} 
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md rounded-full font-black px-4 py-2 text-[10px] sm:text-xs flex items-center gap-1.5 hover:scale-95 transition-transform outline-none cursor-pointer"
          >
            <i className="fa-solid fa-share-nodes"></i> Share Live Link
          </button>
        )}
      </div>

      <div className="bg-gradient-to-br from-midnight to-midnight-light rounded-3xl p-6 text-white relative shadow-glossy overflow-hidden">
        <i className="fa-solid fa-check-to-slot absolute -right-4 -bottom-4 text-7xl opacity-10"></i>
        <div className="flex justify-between items-start mb-2 relative z-10 gap-2">
          <h3 className="text-2xl font-black leading-tight flex-1">{activeVote.title}</h3>
          {activeVote.deadline && <LiveCountdown deadline={activeVote.deadline} />}
        </div>
        <p className="text-white/60 font-bold text-xs relative z-10 uppercase tracking-widest bg-white/10 w-max px-3 py-1 rounded-full border border-white/20">
          <i className="fa-solid fa-fingerprint text-yellow-300 mr-1.5"></i> 
          {activeVote.isMulti ? 'Bisa pilih lebih dari satu' : 'Hanya boleh pilih satu'}
        </p>
      </div>

      <div className="flex bg-white rounded-xl shadow-sm border border-slate-100 p-1.5 sticky top-20 z-20">
         <button type="button" onClick={()=>setActiveTab('statistik')} className={`flex-1 py-2.5 px-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all duration-300 outline-none cursor-pointer ${activeTab==='statistik' ? 'bg-midnight text-white shadow-md transform scale-[1.02]' : 'text-slate-500 hover:bg-slate-50'}`}>Statistik</button>
         <button type="button" onClick={()=>setActiveTab('sudah')} className={`flex-1 py-2.5 px-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all duration-300 outline-none cursor-pointer ${activeTab==='sudah' ? 'bg-midnight text-white shadow-md transform scale-[1.02]' : 'text-slate-500 hover:bg-slate-50'}`}>Masuk ({sudahVoteNames.length})</button>
         <button type="button" onClick={()=>setActiveTab('belum')} className={`flex-1 py-2.5 px-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all duration-300 outline-none cursor-pointer ${activeTab==='belum' ? 'bg-midnight text-white shadow-md transform scale-[1.02]' : 'text-slate-500 hover:bg-slate-50'}`}>Belum ({belumVoteNames.length})</button>
         <button type="button" onClick={()=>setActiveTab('beri_suara')} className={`flex-[1.2] py-2.5 px-2 text-[10px] sm:text-xs font-black rounded-lg transition-all duration-300 outline-none cursor-pointer flex justify-center items-center gap-1.5 ${activeTab==='beri_suara' ? 'bg-status-selesai text-white shadow-md transform scale-[1.02]' : 'text-status-selesai border border-blue-100 bg-blue-50 hover:bg-blue-100'}`}><i className="fa-solid fa-paper-plane"></i> VOTE!</button>
      </div>

      {activeTab === 'statistik' && (
        <div className="bg-white rounded-3xl shadow-soft border border-slate-100 p-5 sm:p-6 space-y-6 animate-fade-in">
           <h4 className="font-black text-midnight text-sm uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
             <i className="fa-solid fa-chart-bar text-status-selesai"></i> Rekapitulasi Akhir Pilihan
           </h4>
           
           <div className="space-y-5">
             {sortedOptions.map((opt, i) => {
                const count = optionData[opt].count;
                const votersList = optionData[opt].voters;
                const pct = totalSuaraMasuk === 0 ? 0 : Math.round((count / totalSuaraMasuk) * 100);
                const isWinner = i === 0 && count > 0; // Opsi pertama adalah yang terbanyak (karena sudah di-sort)

                return (
                  <div key={i} className={`relative p-4 rounded-2xl border transition-all duration-300 hover:shadow-md ${isWinner ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                     
                     {/* BAGIAN ATAS: JUDUL OPSI & PERSENTASE */}
                     <div className="flex justify-between items-end mb-3 gap-4">
                        <div className="flex-1">
                          <h5 className={`font-black text-base sm:text-lg leading-tight mb-1 ${isWinner ? 'text-status-selesai' : 'text-midnight'}`}>
                            {isWinner && <i className="fa-solid fa-crown text-yellow-500 mr-2 drop-shadow-sm"></i>}
                            {opt}
                          </h5>
                          <div className="text-[10px] sm:text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded inline-block shadow-sm">
                            <span className="text-midnight font-black">{count}</span> Suara Terkumpul
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-2xl sm:text-3xl font-black ${isWinner ? 'text-status-selesai' : 'text-slate-300'}`}>
                            {pct}%
                          </span>
                        </div>
                     </div>

                     {/* BAR PROGRESS */}
                     <div className="w-full bg-slate-200 rounded-full h-2.5 mb-4 overflow-hidden shadow-inner">
                        <div 
                          className={`${isWinner ? 'bg-gradient-to-r from-blue-500 to-status-selesai' : 'bg-slate-400'} h-2.5 rounded-full transition-all duration-1000 ease-out`} 
                          style={{ width: `${pct}%` }}
                        ></div>
                     </div>

                     {/* DAFTAR PEMILIH (SIMETRIS & RAPI) */}
                     {votersList.length > 0 && (
                       <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                         <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                           <i className="fa-solid fa-users text-slate-300"></i> Daftar Pemilih Opsi Ini:
                         </div>
                         <div className="flex flex-wrap gap-1.5">
                           {votersList.map((voterName, vIdx) => (
                             <span key={vIdx} className="bg-slate-50 border border-slate-200 text-midnight text-[10px] font-bold px-2.5 py-1 rounded-md shadow-sm">
                               {voterName}
                             </span>
                           ))}
                         </div>
                       </div>
                     )}
                  </div>
                )
             })}
           </div>
        </div>
      )}

      {/* --- TAB SUDAH VOTE (RINCIAN MASUK) --- */}
      {activeTab === 'sudah' && (
        <div className="bg-white rounded-3xl shadow-soft border border-slate-100 p-5 sm:p-6 space-y-4 animate-fade-in">
           <h4 className="font-black text-midnight text-sm uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
             <i className="fa-solid fa-inbox text-status-selesai"></i> Log Suara Masuk Terperinci
           </h4>

           {votesArray.length === 0 && (
             <div className="text-center text-xs font-bold text-slate-400 py-10 bg-slate-50 rounded-2xl border border-slate-100">
               <i className="fa-solid fa-envelope-open text-4xl mb-3 text-slate-300 block"></i>
               Belum ada suara masuk.
             </div>
           )}

           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
             {votesArray.map((voteData, index) => (
               <div key={index} className="flex flex-col bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm transition-all hover:border-blue-200 hover:shadow-md">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-black text-midnight text-sm flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-status-selesai flex items-center justify-center text-[10px] shadow-sm"><i className="fa-solid fa-check"></i></div>
                      {voteData.name}
                    </span>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-100 p-2.5 shadow-inner flex flex-wrap gap-1.5">
                    {voteData.options && voteData.options.map((opt, oIdx) => (
                      <span key={oIdx} className="bg-blue-50 border border-blue-100 text-status-selesai text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">
                        {opt}
                      </span>
                    ))}
                  </div>
               </div>
             ))}
           </div>
        </div>
      )}

      {activeTab === 'belum' && (
        <div className="bg-white rounded-3xl shadow-soft border border-slate-100 p-5 sm:p-6 space-y-4 animate-fade-in">
           <h4 className="font-black text-midnight text-sm uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
             <i className="fa-solid fa-hourglass-half text-orange-500"></i> Menunggu Pemilih ({belumVoteNames.length})
           </h4>
           
           {belumVoteNames.length === 0 && (
             <div className="text-center text-xs font-bold text-slate-400 py-10 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600">
               <i className="fa-solid fa-check-double text-4xl mb-3 block"></i>
               Luar biasa! Semua SDM sudah memberikan suaranya!
             </div>
           )}
           
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
             {belumVoteNames.map(name => (
               <div key={name} className="bg-orange-50/50 p-3.5 rounded-2xl border border-orange-100 font-bold text-orange-800 text-xs flex items-center gap-2 shadow-sm transition-transform hover:scale-[1.02]">
                  <i className="fa-solid fa-circle-exclamation text-orange-500 animate-pulse text-lg"></i> {name}
               </div>
             ))}
           </div>
        </div>
      )}

      {activeTab === 'beri_suara' && (
        <form onSubmit={handleCastVote} className="bg-white rounded-3xl shadow-soft border border-slate-100 p-5 sm:p-6 space-y-6 animate-fade-in">
           <div className="text-center mb-6">
             <h4 className="font-black text-midnight text-lg tracking-tight">Formulir Suara Rahasia</h4>
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Sistem Otomatis Terkunci Saat Deadline</p>
           </div>

           {isExpired ? (
             <div className="p-6 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-center font-black text-sm shadow-sm flex flex-col items-center justify-center gap-3">
               <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-500 text-3xl shadow-inner"><i className="fa-solid fa-lock"></i></div>
               WAKTU VOTING TELAH HABIS!
             </div>
           ) : (
             <>
               <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <label className="block text-[10px] font-black text-midnight mb-2 uppercase tracking-wider flex items-center gap-2"><i className="fa-solid fa-user-tag text-status-selesai"></i> Verifikasi Identitas SDM</label>
                  <select className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-midnight outline-none cursor-pointer shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" value={voteEmp} onChange={(e) => setVoteEmp(e.target.value)}>
                    <option value="">-- Ketuk Untuk Memilih Nama Anda --</option>
                    {voters.map(v => <option key={v} value={v}>{v} {sudahVoteNames.includes(v) ? '(Timpa Pilihan Lama)' : ''}</option>)}
                  </select>
               </div>
               
               {voteEmp && (
                 <div className="animate-slide-up bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <label className="block text-[10px] font-black text-midnight mb-3 uppercase tracking-wider flex items-center gap-2"><i className="fa-solid fa-list-check text-status-selesai"></i> Tentukan Pilihan Anda</label>
                    <div className="space-y-3">
                       {activeVote.options.map(opt => {
                         const isSelected = selectedOptions.includes(opt);
                         return (
                           <button type="button" key={opt} onClick={() => toggleOption(opt)} className={`w-full flex items-center justify-between p-4 rounded-xl border-2 text-sm font-black transition-all duration-300 outline-none cursor-pointer ${isSelected ? 'bg-blue-50 border-status-selesai text-status-selesai shadow-md scale-[1.01]' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>
                              <span>{opt}</span>
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${isSelected ? 'bg-status-selesai border-status-selesai text-white' : 'border-slate-300 text-transparent'}`}>
                                <i className="fa-solid fa-check text-[10px]"></i>
                              </div>
                           </button>
                         )
                       })}
                    </div>
                 </div>
               )}
               
               <button type="submit" disabled={isSyncing || selectedOptions.length === 0} className={`w-full text-white font-black py-4.5 rounded-xl shadow-glossy transition-all text-sm outline-none mt-4 cursor-pointer flex justify-center items-center gap-2 ${(!voteEmp || selectedOptions.length === 0 || isSyncing) ? 'bg-slate-400 opacity-70 cursor-not-allowed' : 'bg-gradient-to-r from-midnight to-midnight-light hover:opacity-90 active:scale-95'}`}>
                  {isSyncing ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Merekam Suara...</> : <><i className="fa-solid fa-paper-plane text-status-selesai"></i> Masukkan Suara Ke Kotak</>}
               </button>
             </>
           )}
        </form>
      )}
    </div>
  );
};

export default VotingMenu;
