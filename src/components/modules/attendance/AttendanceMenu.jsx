import React, { useState, useEffect } from 'react';
import { APP_ID } from '../../../config/firebase';
import { formatDateId } from '../../../utils/formatters';

const AttendanceMenu = ({ db, employees }) => {
  const [attendanceEvents, setAttendanceEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventRecords, setEventRecords] = useState({});
  const [selectedEmp, setSelectedEmp] = useState('');
  const [status, setStatus] = useState('Hadir');
  const [reason, setReason] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState(null);

  const isAdminLogged = sessionStorage.getItem('adminAuth') === 'true';

  // Ambil daftar kegiatan absensi secara realtime
  useEffect(() => {
    if (!db) return;
    const ref = db.ref(`artifacts/${APP_ID}/public/data/attendance_events`);
    ref.on('value', (snapshot) => {
      if (snapshot.exists()) {
        const eventsArray = Object.values(snapshot.val()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setAttendanceEvents(eventsArray);
      } else {
        setAttendanceEvents([]);
      }
    });
    return () => ref.off();
  }, [db]);

  // FITUR BARU: SISTEM PEMBACA LINK OTOMATIS
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const absenParam = urlParams.get('absen');
    
    // Jika ada link absen di URL, cari database dan langsung buka form absennya
    if (absenParam && !selectedEvent && attendanceEvents.length > 0) {
      const targetEvent = attendanceEvents.find(ev => ev.title === absenParam);
      if (targetEvent) {
        setSelectedEvent(targetEvent);
      }
    }
  }, [attendanceEvents, selectedEvent]);

  // Ambil riwayat absen KHUSUS untuk event yang sedang dipilih
  useEffect(() => {
    if (!db || !selectedEvent) return;
    const ref = db.ref(`artifacts/${APP_ID}/public/data/attendance_records/${selectedEvent.id}`);
    ref.on('value', (snapshot) => {
      if (snapshot.exists()) {
        setEventRecords(snapshot.val());
      } else {
        setEventRecords({});
      }
    });
    return () => ref.off();
  }, [db, selectedEvent]);

  // SISTEM PEMBERSIH URL SAAT MENEKAN TOMBOL KEMBALI
  const handleBack = () => {
    setSelectedEvent(null);
    setEventRecords({});
    const url = new URL(window.location);
    if (url.searchParams.has('absen')) {
      url.searchParams.delete('absen');
      window.history.pushState({}, '', url);
    }
  };

  const showToast = (type) => {
    setToast(type);
    setTimeout(() => setToast(null), 3000);
  };

  // FITUR BARU: SHARE LINK ABSEN KHUSUS ADMIN
  const handleShareAbsen = (e, ev) => {
    if(e) e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}?absen=${encodeURIComponent(ev.title)}`;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(() => {
        showToast('success');
        alert(`Berhasil! Link Absensi telah disalin.\n\nSilakan Paste di Grup WhatsApp:\n${url}`);
      }).catch(() => {
        window.prompt("Salin link absensi berikut manual:", url);
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
        alert(`Berhasil! Link Absensi telah disalin.\n\nSilakan Paste di Grup WhatsApp:\n${url}`);
      } catch (err) {
        window.prompt("Salin link absensi berikut manual:", url);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleAbsen = async (e) => {
    e.preventDefault();
    if (!selectedEmp || !selectedEvent || !db) return;
    setIsSyncing(true);
    
    try {
      const timeNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      await db.ref(`artifacts/${APP_ID}/public/data/attendance_records/${selectedEvent.id}/${selectedEmp}`).set({
        status: status,
        timestamp: timeNow,
        alasan: (status === 'Izin' || status === 'Sakit') ? reason : ''
      });
      showToast('success');
      setSelectedEmp('');
      setStatus('Hadir');
      setReason('');
    } catch (err) {
      showToast('error');
    }
    setIsSyncing(false);
  };

  // Cek apakah waktu sudah kedaluwarsa
  const isExpired = selectedEvent ? new Date() > new Date(`${selectedEvent.date}T${selectedEvent.timeLimit || '23:59'}`) : false;

  return (
    <div className="animate-slide-up space-y-6">
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] animate-slide-up">
          <div className={`px-5 py-2 rounded-full shadow-lg font-black text-xs flex items-center gap-2 text-white ${toast === 'success' ? 'bg-status-selesai' : 'bg-red-500'}`}>
            <i className={`fa-solid ${toast === 'success' ? 'fa-check-circle' : 'fa-xmark-circle'} text-lg`}></i> 
            {toast === 'success' ? 'BERHASIL' : 'GAGAL'}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl sm:text-3xl font-black text-midnight tracking-tight">Daftar Kehadiran</h3>
          <p className="text-slate-500 text-xs sm:text-sm font-bold mt-0.5">Pilih kegiatan untuk mengisi absen</p>
        </div>
      </div>

      {!selectedEvent ? (
        // ================= TAMPILAN LIST KEGIATAN =================
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {attendanceEvents.length === 0 && (
             <div className="col-span-full text-center py-10 bg-white rounded-3xl shadow-soft border border-slate-100">
                <i className="fa-solid fa-mug-hot text-5xl mb-3 text-slate-300 block"></i>
                <h5 className="font-black text-midnight text-lg mb-1">Belum Ada Kegiatan</h5>
                <p className="text-slate-500 text-xs sm:text-sm font-medium">Admin belum membuka form absensi baru.</p>
             </div>
          )}
          {attendanceEvents.map(ev => {
            const evIsExpired = new Date() > new Date(`${ev.date}T${ev.timeLimit || '23:59'}`);
            return (
              <div key={ev.id} className="bg-white rounded-3xl shadow-soft border border-slate-100 relative overflow-hidden group hover:shadow-md hover:border-blue-300 transition-all duration-300">
                <button 
                  onClick={() => setSelectedEvent(ev)}
                  className="w-full p-5 text-left cursor-pointer outline-none"
                >
                  <div className={`absolute top-0 right-0 text-[9px] font-black px-3 py-1 rounded-bl-xl border-b border-l uppercase shadow-sm ${evIsExpired ? 'bg-red-50 text-red-500 border-red-100' : 'bg-blue-50 text-status-selesai border-blue-100'}`}>
                    {evIsExpired ? 'Waktu Habis' : 'Buka'}
                  </div>
                  <h4 className="font-black text-midnight text-base leading-tight mb-3 pr-20 group-hover:text-status-selesai transition-colors">{ev.title}</h4>
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-500 flex items-center gap-2">
                      <i className="fa-regular fa-calendar-days text-slate-400 w-4"></i> {formatDateId(ev.date)} • {ev.timeLimit || '23:59'}
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 flex items-center gap-2">
                      <i className="fa-solid fa-location-dot text-slate-400 w-4"></i> <span className="truncate">{ev.location}</span>
                    </div>
                  </div>
                </button>
                
                {/* TOMBOL SHARE LINK ABSEN KHUSUS ADMIN DI LUAR KARTU */}
                {isAdminLogged && (
                  <div className="px-5 pb-5 pt-0">
                    <button 
                      type="button"
                      onClick={(e) => handleShareAbsen(e, ev)}
                      className="w-full bg-orange-50 text-orange-500 border border-orange-200 font-black py-2.5 rounded-xl text-[10px] sm:text-xs hover:bg-orange-100 transition-colors flex items-center justify-center gap-2 outline-none cursor-pointer shadow-sm"
                    >
                      <i className="fa-solid fa-share-nodes"></i> Salin Link ({ev.title})
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        // ================= TAMPILAN FORM ISI ABSEN & RIWAYAT =================
        <div className="space-y-5 animate-fade-in">
          
          {/* HEADER NAVIGASI & TOMBOL SHARE ADMIN SAAT DI DALAM DETAIL */}
          <div className="flex flex-wrap gap-2 justify-end mb-2">
            {isAdminLogged && (
              <button 
                type="button"
                onClick={(e) => handleShareAbsen(e, selectedEvent)} 
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md rounded-full font-black px-4 py-2 text-[10px] sm:text-xs flex items-center gap-1.5 hover:scale-95 transition-transform outline-none cursor-pointer"
              >
                <i className="fa-solid fa-share-nodes"></i> Share Live Link
              </button>
            )}
          </div>

          <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-midnight to-midnight-light p-4 px-5 flex items-start justify-between gap-3 text-white shadow-glossy">
              <div>
                <span className="font-black text-sm uppercase tracking-wider block mb-1">Form Absensi</span>
                <span className="text-[10px] text-white/70 block leading-tight">{selectedEvent.title}</span>
              </div>
              <button onClick={handleBack} className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors outline-none cursor-pointer shrink-0 border border-white/20">
                <i className="fa-solid fa-arrow-left"></i> Kembali
              </button>
            </div>
            
            <div className="p-5">
              <div className="mb-5 bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs font-bold text-blue-800 flex justify-between items-center shadow-sm">
                <div>
                  <div className="flex gap-2 mb-1"><i className="fa-regular fa-calendar mt-0.5"></i> {formatDateId(selectedEvent.date)}</div>
                  <div className="flex gap-2"><i className="fa-solid fa-location-dot mt-0.5"></i> {selectedEvent.location}</div>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] uppercase opacity-70">Batas Waktu</span>
                  <span className="font-black text-sm">{selectedEvent.timeLimit || '23:59'}</span>
                </div>
              </div>

              {isExpired ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center shadow-sm">
                   <i className="fa-regular fa-clock text-4xl text-red-400 mb-2"></i>
                   <h5 className="font-black text-red-600 text-lg">Waktu Absen Telah Habis</h5>
                   <p className="text-xs text-red-500 font-bold mt-1">Anda sudah tidak bisa mengisi absensi untuk kegiatan ini. Pegawai yang belum absen otomatis tercatat Alpa.</p>
                </div>
              ) : (
                <form onSubmit={handleAbsen} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Pilih Nama Anda</label>
                    <select required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold text-midnight outline-none cursor-pointer shadow-inner focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" value={selectedEmp} onChange={(e) => setSelectedEmp(e.target.value)}>
                      <option value="" disabled>-- Cari / Pilih Nama --</option>
                      {employees && employees.map(emp => (
                        <option key={emp.id} value={emp.name}>{emp.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Status Kehadiran</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Hadir', 'Sakit', 'Izin'].map(st => (
                        <button type="button" key={st} onClick={() => setStatus(st)} className={`py-2.5 rounded-xl text-xs font-black transition-all border outline-none cursor-pointer ${status === st ? 'bg-midnight text-white border-midnight shadow-md scale-[1.02]' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(status === 'Sakit' || status === 'Izin') && (
                    <div className="animate-fade-in">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Keterangan / Alasan</label>
                      <input 
                        type="text" 
                        required 
                        placeholder={`Tulis alasan ${status.toLowerCase()}...`}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold text-midnight outline-none focus:ring-1 focus:ring-midnight shadow-inner" 
                        value={reason} 
                        onChange={(e) => setReason(e.target.value)} 
                      />
                    </div>
                  )}

                  <button type="submit" disabled={isSyncing || !selectedEmp} className="w-full bg-status-selesai text-white font-black py-3.5 rounded-xl shadow-md active:scale-95 transition-all outline-none flex justify-center items-center gap-2 cursor-pointer mt-2 disabled:opacity-50">
                    {isSyncing ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-fingerprint"></i>} Rekam Kehadiran
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* TABEL RIWAYAT KEHADIRAN */}
          <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
             <div className="bg-slate-50 border-b border-slate-100 p-4 px-5 flex items-center gap-2">
                <i className="fa-solid fa-list-check text-status-proses"></i> 
                <span className="font-black text-midnight text-sm uppercase tracking-wider">Riwayat Kehadiran Pegawai</span>
             </div>
             <div className="p-5">
               <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto shadow-sm">
                 <table className="w-full text-left text-xs whitespace-nowrap">
                   <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-black">
                     <tr>
                       <th className="px-4 py-3">Nama Pegawai</th>
                       <th className="px-4 py-3 text-center">Status</th>
                       <th className="px-4 py-3 text-center">Waktu</th>
                       <th className="px-4 py-3">Keterangan</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {employees.map(emp => {
                       const record = eventRecords[emp.name];
                       let badgeColor = 'bg-slate-100 text-slate-400 border-slate-200';
                       let statusText = 'Belum Absen';

                       if (record) {
                         if (record.status === 'Hadir') badgeColor = 'bg-emerald-100 text-emerald-600 border-emerald-200 shadow-sm';
                         else if (record.status === 'Sakit') badgeColor = 'bg-orange-100 text-orange-600 border-orange-200 shadow-sm';
                         else if (record.status === 'Izin') badgeColor = 'bg-blue-100 text-blue-600 border-blue-200 shadow-sm';
                         statusText = record.status;
                       } else if (isExpired) {
                         badgeColor = 'bg-red-50 text-red-500 border-red-100 shadow-sm';
                         statusText = 'Alpa';
                       }

                       return (
                         <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                           <td className="px-4 py-3 font-bold text-midnight">{emp.name}</td>
                           <td className="px-4 py-3 text-center">
                             <span className={`text-[9px] font-black uppercase px-2 py-1 rounded border ${badgeColor}`}>
                               {statusText}
                             </span>
                           </td>
                           <td className="px-4 py-3 text-center font-bold text-slate-400">
                             {record ? record.timestamp : '-'}
                           </td>
                           <td className="px-4 py-3 font-bold text-slate-500 truncate max-w-[120px]">
                             {record?.alasan || '-'}
                           </td>
                         </tr>
                       );
                     })}
                   </tbody>
                 </table>
               </div>
             </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default AttendanceMenu;
