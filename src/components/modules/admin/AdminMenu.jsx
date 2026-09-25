import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { APP_ID } from '../../../config/firebase';
import { ADMIN_PASSWORD_HASH } from '../../../config/constants';
import { downloadExcelTemplate } from '../../../utils/excel';
import { formatDateId } from '../../../utils/formatters';

const AdminMenu = ({ db, tasks, groupedTasks, employees, votings, isAdminLogged, setIsAdminLogged }) => {
  const [pwd, setPwd] = useState('');
  const [toast, setToast] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const fileInputRef = useRef(null);

  // TAB MENU ADMIN UTAMA
  const [activeSubTab, setActiveSubTab] = useState('tugas'); 

  // ================= STATE TUGAS =================
  const [newTask, setNewTask] = useState({ taskName: '', picId: '', target: '', deadline: '', multiTargets: {} });
  const [editModal, setEditModal] = useState({ isOpen: false, type: '', data: {}, oldTaskName: '' });

  // ================= STATE VOTING =================
  const [voteTitle, setVoteTitle] = useState('');
  const [voteDeadline, setVoteDeadline] = useState('');
  const [voteOptions, setVoteOptions] = useState(['']);
  const [isMulti, setIsMulti] = useState(false);
  const [editVoteModal, setEditVoteModal] = useState({ isOpen: false, id: null, title: '', deadline: '', options: [''], isMulti: false });

  // ================= STATE ABSENSI & PDF =================
  const [absEventTitle, setAbsEventTitle] = useState('');
  const [absEventDate, setAbsEventDate] = useState('');
  const [absEventTimeLimit, setAbsEventTimeLimit] = useState('23:59');
  const [absEventLocation, setAbsEventLocation] = useState('');
  const [absEventMinRows, setAbsEventMinRows] = useState(29);
  const [attendanceEvents, setAttendanceEvents] = useState([]);
  const [allAttendanceRecords, setAllAttendanceRecords] = useState({});
  const [editAbsEventModal, setEditAbsEventModal] = useState({ isOpen: false, id: null, title: '', date: '', timeLimit: '', location: '', minRows: 29 });

  // ================= STATE PEJABAT TTD =================
  const [signatures, setSignatures] = useState([]);
  const [activeSigId, setActiveSigId] = useState(null);
  const [newSig, setNewSig] = useState({ jabatan: '', nama: '', nip: '' });
  const [editSigModal, setEditSigModal] = useState({ isOpen: false, id: null, jabatan: '', nama: '', nip: '' });

  // ================= STATE REKAP KINERJA =================
  const [rekapPeriod, setRekapPeriod] = useState('all'); // all, 1m, 3m, 6m, 1y

  // FETCH DATA EVENT & RECORDS ABSENSI (REALTIME)
  useEffect(() => {
    if (!db) return;
    const refEvent = db.ref(`artifacts/${APP_ID}/public/data/attendance_events`);
    refEvent.on('value', (snapshot) => {
      if (snapshot.exists()) {
        const eventsArray = Object.values(snapshot.val()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setAttendanceEvents(eventsArray);
      } else {
        setAttendanceEvents([]);
      }
    });

    const refRecords = db.ref(`artifacts/${APP_ID}/public/data/attendance_records`);
    refRecords.on('value', (snapshot) => {
      if (snapshot.exists()) setAllAttendanceRecords(snapshot.val());
      else setAllAttendanceRecords({});
    });

    return () => { refEvent.off(); refRecords.off(); };
  }, [db]);

  // FETCH DATA TANDA TANGAN
  useEffect(() => {
    if (!db) return;
    const refSigs = db.ref(`artifacts/${APP_ID}/public/data/settings/signatures`);
    refSigs.on('value', (snapshot) => {
      if (snapshot.exists()) setSignatures(Object.values(snapshot.val()));
      else setSignatures([]);
    });

    const refActive = db.ref(`artifacts/${APP_ID}/public/data/settings/activeSignatureId`);
    refActive.on('value', (snapshot) => {
      if (snapshot.exists()) setActiveSigId(snapshot.val());
      else setActiveSigId(null);
    });
    return () => { refSigs.off(); refActive.off(); };
  }, [db]);

  const showToast = (type) => {
    setToast(type);
    setTimeout(() => setToast(null), 3000);
  };

  if (!isAdminLogged) {
    return (
      <div className="animate-slide-up text-center pt-10 px-4 max-w-sm mx-auto">
        <div className="bg-white border border-slate-200 text-midnight rounded-3xl w-24 h-24 flex items-center justify-center mx-auto mb-6 shadow-soft">
           <i className="fa-solid fa-user-shield text-5xl"></i>
        </div>
        <h3 className="text-2xl font-black text-midnight mb-2 tracking-tight">Super Admin Panel</h3>
        <p className="text-xs text-slate-500 font-bold mb-6">Database dilindungi enkripsi sistem.</p>
        <div className="bg-white rounded-3xl shadow-soft border border-slate-100 p-6">
          <form onSubmit={e => { 
            e.preventDefault(); 
            if (btoa(pwd) === ADMIN_PASSWORD_HASH) { setIsAdminLogged(true); sessionStorage.setItem('adminAuth', 'true'); } 
            else { alert('Password Salah!'); setPwd(''); }
          }}>
            <input type="password" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-center text-lg font-black text-midnight tracking-widest mb-4 focus:ring-2 focus:ring-midnight outline-none transition-all shadow-inner" placeholder="PASSWORD" value={pwd} onChange={e => setPwd(e.target.value)}/>
            <button type="submit" className="w-full bg-midnight text-white font-bold py-3.5 rounded-xl shadow-glossy active:scale-95 transition-all flex justify-center items-center gap-2 outline-none cursor-pointer">
              <i className="fa-solid fa-lock-open text-status-selesai"></i> Buka Panel Admin
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ================= CRUD PENGATURAN TANDA TANGAN =================
  const handleAddSignature = async (e) => {
    e.preventDefault();
    setIsSyncing(true);
    try {
      const id = Date.now();
      await db.ref(`artifacts/${APP_ID}/public/data/settings/signatures/${id}`).set({ id, ...newSig });
      if (!activeSigId) await db.ref(`artifacts/${APP_ID}/public/data/settings/activeSignatureId`).set(id);
      showToast('success');
      setNewSig({ jabatan: '', nama: '', nip: '' });
    } catch (err) { showToast('error'); }
    setIsSyncing(false);
  };
  const handleEditSignature = async (e) => {
    e.preventDefault();
    setIsSyncing(true);
    try {
      await db.ref(`artifacts/${APP_ID}/public/data/settings/signatures/${editSigModal.id}`).update({ jabatan: editSigModal.jabatan, nama: editSigModal.nama, nip: editSigModal.nip });
      showToast('success'); setEditSigModal({ isOpen: false, id: null, jabatan: '', nama: '', nip: '' });
    } catch (err) { showToast('error'); }
    setIsSyncing(false);
  };
  const handleDeleteSignature = async (id) => {
    if(window.confirm("Hapus Pejabat Penandatangan ini?")) {
      setIsSyncing(true);
      await db.ref(`artifacts/${APP_ID}/public/data/settings/signatures/${id}`).remove();
      if(activeSigId === id) await db.ref(`artifacts/${APP_ID}/public/data/settings/activeSignatureId`).remove();
      showToast('success'); setIsSyncing(false);
    }
  };
  const handleActivateSignature = async (id) => {
    setIsSyncing(true); await db.ref(`artifacts/${APP_ID}/public/data/settings/activeSignatureId`).set(id); showToast('success'); setIsSyncing(false);
  };

  // ================= CRUD KEGIATAN ABSENSI =================
  const handleCreateAttendanceEvent = async (e) => {
    e.preventDefault();
    if (!absEventTitle || !absEventDate || !absEventLocation || !absEventTimeLimit) return;
    setIsSyncing(true);
    try {
      const newId = Date.now();
      await db.ref(`artifacts/${APP_ID}/public/data/attendance_events/${newId}`).set({
        id: newId, title: absEventTitle.trim(), date: absEventDate, timeLimit: absEventTimeLimit, location: absEventLocation.trim(), minRows: parseInt(absEventMinRows) || 29, createdAt: new Date().toISOString()
      });
      showToast('success');
      setAbsEventTitle(''); setAbsEventDate(''); setAbsEventTimeLimit('23:59'); setAbsEventLocation(''); setAbsEventMinRows(29);
    } catch (error) { showToast('error'); }
    setIsSyncing(false);
  };
  const handleEditAttendanceEvent = async (e) => {
    e.preventDefault();
    setIsSyncing(true);
    try {
      await db.ref(`artifacts/${APP_ID}/public/data/attendance_events/${editAbsEventModal.id}`).update({
        title: editAbsEventModal.title.trim(), date: editAbsEventModal.date, timeLimit: editAbsEventModal.timeLimit, location: editAbsEventModal.location.trim(), minRows: parseInt(editAbsEventModal.minRows) || 29
      });
      showToast('success'); setEditAbsEventModal({ isOpen: false, id: null, title: '', date: '', timeLimit: '', location: '', minRows: 29 });
    } catch (err) { showToast('error'); }
    setIsSyncing(false);
  };
  const handleDeleteAttendanceEvent = async (eventId) => {
    if(window.confirm("Hapus kegiatan absensi ini berserta seluruh riwayat rekamannya?")) {
      setIsSyncing(true);
      try {
        await db.ref(`artifacts/${APP_ID}/public/data/attendance_events/${eventId}`).remove();
        await db.ref(`artifacts/${APP_ID}/public/data/attendance_records/${eventId}`).remove();
        showToast('success');
      } catch(e) { showToast('error'); }
      setIsSyncing(false);
    }
  };

  // ================= EXPORT PDF ABSENSI F4 =================
  const handleExportPDF = async (event) => {
    const records = allAttendanceRecords[event.id] || {};
    const sigToUse = (signatures || []).find(s => s.id === activeSigId) || { jabatan: 'Pejabat', nama: 'Nama Pejabat', nip: '-' };
    const doc = new jsPDF('p', 'mm', [215.9, 330]);
    
    doc.setFontSize(12); doc.setFont("helvetica", "bold");
    doc.text("DAFTAR HADIR", 107.95, 20, { align: "center" });
    doc.text(event.title.toUpperCase(), 107.95, 26, { align: "center" });
    
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    const displayDate = formatDateId(event.date);
    doc.text(`HARI / TANGGAL`, 15, 38); doc.text(`: ${displayDate}`, 55, 38);
    doc.text(`TEMPAT`, 15, 44); doc.text(`: ${event.location}`, 55, 44);

    const tableColumn = ["NO.", "N A M A", "L/P", "JABATAN/INSTANSI", "TANDA TANGAN"];
    const tableRows = [];
    let currentNo = 1;

    (employees || []).forEach((emp) => {
      // Format zig-zag murni untuk tanda tangan agar PDF bisa diprint & ditandatangani basah
      let signatureStr = currentNo % 2 !== 0 ? `${currentNo}. ` : `           ${currentNo}. `;
      const lpStr = emp.lp || emp.gender || emp.jk || ""; // Ambil dinamis dari database jika diedit
      
      tableRows.push([currentNo, emp.name, lpStr, "SDM PKH", signatureStr]);
      currentNo++;
    });

    const targetMin = parseInt(event.minRows) || 29;
    while(currentNo <= targetMin) {
      const sig = currentNo % 2 !== 0 ? `${currentNo}. ` : `           ${currentNo}. `;
      tableRows.push([currentNo, "", "", "", sig]);
      currentNo++;
    }

    autoTable(doc, {
      head: [tableColumn], body: tableRows, startY: 50, theme: 'grid', margin: { left: 15, right: 15 },
      styles: { fontSize: 10, cellPadding: 3, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1, overflow: 'linebreak', valign: 'middle' },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', valign: 'middle' },
      columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 1: { cellWidth: 65 }, 2: { halign: 'center', cellWidth: 15 }, 3: { halign: 'center', cellWidth: 40 }, 4: { cellWidth: 55.9, valign: 'middle' } }
    });

    const finalY = doc.lastAutoTable.finalY + 15; 
    const pageWidth = doc.internal.pageSize.getWidth();
    const sigX = pageWidth - 60;
    
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text("Mengetahui,", sigX, finalY, { align: "center" });
    doc.text(sigToUse.jabatan, sigX, finalY + 5, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.text(sigToUse.nama, sigX, finalY + 25, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.text(`NIP. ${sigToUse.nip}`, sigX, finalY + 30, { align: "center" });
    doc.save(`Daftar_Hadir_${event.title.replace(/\s+/g, '_')}.pdf`);
  };

  // ================= ALGORITMA REKAPITULASI KINERJA =================
  const getRekapData = () => {
    let startDate = new Date(0);
    const now = new Date();
    
    if (rekapPeriod === '1m') startDate = new Date(now.setMonth(now.getMonth() - 1));
    else if (rekapPeriod === '3m') startDate = new Date(now.setMonth(now.getMonth() - 3));
    else if (rekapPeriod === '6m') startDate = new Date(now.setMonth(now.getMonth() - 6));
    else if (rekapPeriod === '1y') startDate = new Date(now.setFullYear(now.getFullYear() - 1));

    const validEvents = (attendanceEvents || []).filter(e => new Date(e.date) >= startDate);
    const validTasks = (tasks || []).filter(t => new Date(t.deadline || t.startDate) >= startDate);
    const validVotes = votings ? votings.filter(v => new Date(v.createdAt) >= startDate) : [];

    const stats = (employees || []).map(emp => {
      let abs = { h: 0, i: 0, s: 0, a: 0 };
      let tsk = { sel: 0, kur: 0, tid: 0 };
      let vts = { v: 0, x: 0 };

      // Kalkulasi Absensi
      validEvents.forEach(ev => {
         const recs = allAttendanceRecords[ev.id] || {};
         const userRec = recs[emp.name];
         const isExpired = new Date() > new Date(`${ev.date}T${ev.timeLimit || '23:59'}`);
         if (userRec) {
           if (userRec.status === 'Hadir') abs.h++;
           else if (userRec.status === 'Izin') abs.i++;
           else if (userRec.status === 'Sakit') abs.s++;
         } else if (isExpired) {
           abs.a++;
         }
      });

      // Kalkulasi Tugas
      validTasks.forEach(t => {
         if (t.picId.toUpperCase() === emp.name.toUpperCase()) {
           if (t.progress >= t.target) tsk.sel++;
           else if (t.progress > 0) tsk.kur++;
           else tsk.tid++;
         }
      });

      // Kalkulasi Voting
      validVotes.forEach(v => {
         let hasVoted = false;
         if (v.votes && Object.keys(v.votes).includes(emp.name)) hasVoted = true;
         if (hasVoted) vts.v++; else vts.x++;
      });

      // Sistem Scoring: Adil dan Tepat
      const score = (abs.h * 10) + ((abs.i + abs.s) * 5) + (tsk.sel * 20) + (tsk.kur * 10) + (vts.v * 5);
      const lpStr = emp.lp || emp.gender || emp.jk || "";

      return { name: emp.name, lpStr, abs, tsk, vts, score };
    });

    return stats.sort((a, b) => b.score - a.score); // Ranking Kinerja (Tertinggi ke Terendah)
  };

  const handleExportRekapPDF = () => {
    const data = getRekapData();
    const sigToUse = (signatures || []).find(s => s.id === activeSigId) || { jabatan: 'Pejabat', nama: 'Nama Pejabat', nip: '-' };
    const doc = new jsPDF('l', 'mm', [330, 215.9]); // Landscape F4
    
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("REKAPITULASI & RANKING KINERJA SDM PKH", 165, 20, { align: "center" });
    
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    const periodStr = rekapPeriod === 'all' ? 'Keseluruhan (All-time)' : rekapPeriod === '1m' ? '1 Bulan Terakhir' : rekapPeriod === '3m' ? '3 Bulan Terakhir' : rekapPeriod === '6m' ? '6 Bulan Terakhir' : '1 Tahun Terakhir';
    doc.text(`Periode: ${periodStr}`, 15, 30);
    doc.text(`Tanggal Cetak: ${formatDateId(new Date().toISOString().split('T')[0])}`, 15, 36);

    const tableColumn = ["RANK", "NAMA SDM", "L/P", "ABSENSI (H/I/S/A)", "TUGAS (Selesai/Kurang/Tidak)", "VOTING (Ikut/Abstain)", "SKOR AKHIR"];
    const tableRows = data.map((d, i) => [
      i + 1, d.name, d.lpStr, 
      `${d.abs.h} / ${d.abs.i} / ${d.abs.s} / ${d.abs.a}`, 
      `${d.tsk.sel} / ${d.tsk.kur} / ${d.tsk.tid}`, 
      `${d.vts.v} / ${d.vts.x}`, 
      d.score
    ]);

    autoTable(doc, {
      head: [tableColumn], body: tableRows, startY: 42, theme: 'grid', margin: { left: 15, right: 15 },
      styles: { fontSize: 9, cellPadding: 3, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1 },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
      columnStyles: { 0: { halign: 'center', cellWidth: 15 }, 1: { cellWidth: 70 }, 2: { halign: 'center', cellWidth: 15 }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' }, 6: { halign: 'center', fontStyle: 'bold' } }
    });

    const finalY = doc.lastAutoTable.finalY + 15; 
    const sigX = 270;
    
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text("Mengetahui,", sigX, finalY, { align: "center" });
    doc.text(sigToUse.jabatan, sigX, finalY + 5, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.text(sigToUse.nama, sigX, finalY + 25, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.text(`NIP. ${sigToUse.nip}`, sigX, finalY + 30, { align: "center" });
    doc.save(`Rekap_Kinerja_${periodStr.replace(/\s+/g, '_')}.pdf`);
  };

  // ================= LOGIKA TUGAS (TETAP UTUH) =================
  const handleAddManual = async (e) => {
    e.preventDefault();
    if (!newTask.taskName || !newTask.picId || !newTask.deadline) { showToast('error'); return; }
    setIsSyncing(true);
    try {
      const updates = {};
      let addedCount = 0;
      const baseId = Date.now();
      const today = new Date().toISOString().split('T')[0];

      if (newTask.picId === 'all') {
         (employees || []).forEach((emp, idx) => {
            const tgt = parseInt(newTask.multiTargets[emp.id]);
            if (tgt > 0) {
               const newId = baseId + idx;
               updates[`artifacts/${APP_ID}/public/data/tasks/${newId}`] = { id: newId, taskName: newTask.taskName.trim(), picId: emp.name, target: tgt, progress: 0, deadline: newTask.deadline, status: 'On Progress', startDate: today };
               addedCount++;
            }
         });
      } else {
         const newId = baseId;
         updates[`artifacts/${APP_ID}/public/data/tasks/${newId}`] = { id: newId, taskName: newTask.taskName.trim(), picId: newTask.picId.toUpperCase().trim(), target: parseInt(newTask.target), progress: 0, deadline: newTask.deadline, status: 'On Progress', startDate: today };
         addedCount++;
      }

      if (addedCount > 0) {
         await db.ref().update(updates); showToast('success'); setNewTask({ taskName: '', picId: '', target: '', deadline: '', multiTargets: {} });
      } else { showToast('error'); }
    } catch (err) { showToast('error'); }
    setIsSyncing(false);
  };
  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !db) return;
    setIsSyncing(true);
    const fileExt = file.name.toLowerCase().split('.').pop();
    const reader = new FileReader();

    reader.onload = async (event) => {
       try {
         let excelData = [];
         if (fileExt === 'csv') {
           const workbook = XLSX.read(event.target.result, { type: 'string' });
           excelData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: "" });
         } else {
           const workbook = XLSX.read(new Uint8Array(event.target.result), { type: 'array' });
           excelData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: "" });
         }

         const updates = {}; let addedCount = 0; const today = new Date().toISOString().split('T')[0];

         for (let i = 1; i < excelData.length; i++) {
           const row = excelData[i];
           if (!row || row.length === 0) continue; 
           const taskName = String(row[0] || "").trim(); const picIndicator = String(row[1] || "").trim(); const target = parseInt(row[2]);
           if (!taskName || !picIndicator || isNaN(target)) continue;

           let finalDeadline = new Date().toISOString().split('T')[0];
           const rawDeadline = row[3];
           if (rawDeadline) {
             if (typeof rawDeadline === 'number') {
               const dateObj = new Date((rawDeadline - (25567 + 2)) * 86400 * 1000);
               if (!isNaN(dateObj.getTime())) finalDeadline = dateObj.toISOString().split('T')[0];
             } else {
               const parts = String(rawDeadline).trim().split(/[-/]/);
               if (parts.length === 3) finalDeadline = parts[0].length <= 2 ? `${parts[2]}-${parts[1]}-${parts[0]}` : new Date(String(rawDeadline)).toISOString().split('T')[0];
             }
           }
           const newId = Date.now() + Math.floor(Math.random() * 10000) + i;
           updates[`artifacts/${APP_ID}/public/data/tasks/${newId}`] = { id: newId, taskName: taskName, picId: picIndicator.toUpperCase(), target: target, progress: 0, deadline: finalDeadline, status: 'On Progress', startDate: today };
           addedCount++;
         }
         if (addedCount > 0) { await db.ref().update(updates); showToast('success'); } else { showToast('error'); }
       } catch (error) { showToast('error'); } finally { setIsSyncing(false); if(fileInputRef.current) fileInputRef.current.value = ''; }
    };
    if (fileExt === 'csv') reader.readAsText(file); else reader.readAsArrayBuffer(file);
  };
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setIsSyncing(true);
    try {
      const updates = {};
      if (editModal.type === 'group') {
         (tasks || []).filter(t => t.taskName === editModal.oldTaskName).forEach(t => { updates[`artifacts/${APP_ID}/public/data/tasks/${t.id}/taskName`] = editModal.data.taskName.trim(); updates[`artifacts/${APP_ID}/public/data/tasks/${t.id}/deadline`] = editModal.data.deadline; });
      } else {
         const target = parseInt(editModal.data.target); const progress = parseInt(editModal.data.progress); const isDone = progress >= target; const oldTask = (tasks || []).find(t => t.id === editModal.data.id);
         updates[`artifacts/${APP_ID}/public/data/tasks/${editModal.data.id}`] = { ...oldTask, taskName: editModal.data.taskName.trim(), picId: editModal.data.picId.toUpperCase().trim(), target: target, progress: progress, deadline: editModal.data.deadline, status: isDone ? 'Selesai' : 'On Progress' };
      }
      await db.ref().update(updates); showToast('success'); setEditModal({ isOpen: false, type: '', data: {}, oldTaskName: '' });
    } catch (err) { showToast('error'); }
    setIsSyncing(false);
  };
  const handleDeleteGroup = async (taskName) => { if (window.confirm(`Hapus kegiatan "${taskName}"?`)) { setIsSyncing(true); const updates = {}; (tasks || []).filter(t => t.taskName === taskName).forEach(t => { updates[`artifacts/${APP_ID}/public/data/tasks/${t.id}`] = null; }); await db.ref().update(updates); showToast('success'); setIsSyncing(false); } };
  const handleResetGroupProgress = async (taskName) => { if (window.confirm(`Reset progress "${taskName}" ke 0?`)) { setIsSyncing(true); const updates = {}; (tasks || []).filter(t => t.taskName === taskName).forEach(t => { updates[`artifacts/${APP_ID}/public/data/tasks/${t.id}/progress`] = 0; updates[`artifacts/${APP_ID}/public/data/tasks/${t.id}/status`] = 'On Progress'; }); await db.ref().update(updates); showToast('success'); setIsSyncing(false); } };
  const handleResetIndividualProgress = async (id) => { if (window.confirm(`Reset progress pegawai ke 0?`)) { setIsSyncing(true); await db.ref(`artifacts/${APP_ID}/public/data/tasks/${id}`).update({ progress: 0, status: 'On Progress' }); showToast('success'); setIsSyncing(false); } };
  const handleDeletePerson = async (id) => { if (window.confirm(`Hapus pegawai ini dari tugas?`)) { setIsSyncing(true); await db.ref(`artifacts/${APP_ID}/public/data/tasks/${id}`).remove(); showToast('success'); setIsSyncing(false); } };
  
  // ================= LOGIKA VOTING (TETAP UTUH) =================
  const handleCreateVoting = async (e) => {
    e.preventDefault();
    const cleanOptions = (voteOptions || []).map(o => o.trim()).filter(o => o !== '');
    if(cleanOptions.length < 2) return showToast('error');
    setIsSyncing(true);
    try {
      const newId = Date.now();
      await db.ref(`artifacts/${APP_ID}/public/data/votings/${newId}`).set({ id: newId, title: voteTitle, deadline: voteDeadline || null, options: cleanOptions, isMulti: isMulti, voters: (employees || []).map(e => e.name), createdAt: new Date().toISOString().split('T')[0], status: 'Active' });
      showToast('success'); setVoteTitle(''); setVoteDeadline(''); setVoteOptions(['']); setIsMulti(false);
    } catch (err) { showToast('error'); }
    setIsSyncing(false);
  };
  const handleSaveEditVote = async (e) => { 
    e.preventDefault(); 
    const cleanOptions = (editVoteModal.options || []).map(o => o.trim()).filter(o => o !== ''); 
    if(cleanOptions.length < 2) return showToast('error'); 
    setIsSyncing(true); 
    await db.ref(`artifacts/${APP_ID}/public/data/votings/${editVoteModal.id}`).update({ title: editVoteModal.title, deadline: editVoteModal.deadline || null, options: cleanOptions, isMulti: editVoteModal.isMulti }); 
    showToast('success'); setEditVoteModal({ isOpen: false, id: null, title: '', deadline: '', options: [''], isMulti: false }); setIsSyncing(false); 
  };
  const handleDeleteVoting = async (voteId) => { if(window.confirm(`Hapus voting secara permanen?`)) { setIsSyncing(true); await db.ref(`artifacts/${APP_ID}/public/data/votings/${voteId}`).remove(); showToast('success'); setIsSyncing(false); } };
  const handleResetVoting = async (voteId) => { if(window.confirm(`Hapus semua suara yang sudah masuk ke kotak ini?`)) { setIsSyncing(true); await db.ref(`artifacts/${APP_ID}/public/data/votings/${voteId}/votes`).remove(); showToast('success'); setIsSyncing(false); } };

  // ================= SISTEM =================
  const handleResetAll = async () => { 
    if(window.confirm("Yakin format/kosongkan SELURUH DATABASE? Ini tidak bisa di-undo!")) { 
      setIsSyncing(true); 
      await db.ref(`artifacts/${APP_ID}/public/data/tasks`).remove(); 
      await db.ref(`artifacts/${APP_ID}/public/data/votings`).remove(); 
      await db.ref(`artifacts/${APP_ID}/public/data/attendance_events`).remove(); 
      await db.ref(`artifacts/${APP_ID}/public/data/attendance_records`).remove(); 
      showToast('success'); setIsSyncing(false); 
    } 
  };

  return (
    <div className="animate-slide-up space-y-5 pb-10 relative">
      {/* TOAST NOTIFIKASI */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] animate-slide-up">
          <div className={`px-5 py-2 rounded-full shadow-lg font-black text-xs flex items-center gap-2 text-white ${toast === 'success' ? 'bg-status-selesai' : 'bg-red-500'}`}>
            <i className={`fa-solid ${toast === 'success' ? 'fa-check-circle' : 'fa-xmark-circle'} text-lg`}></i> 
            {toast === 'success' ? 'BERHASIL' : 'GAGAL'}
          </div>
        </div>
      )}

      {/* HEADER SUPER ADMIN */}
      <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-soft">
        <div>
          <h3 className="text-xl font-black text-midnight tracking-tight">Super Admin Panel</h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pusat Kendali Sistem</p>
        </div>
        <button onClick={() => { setIsAdminLogged(false); sessionStorage.removeItem('adminAuth'); }} className="bg-red-50 border border-red-200 text-red-500 font-bold px-3.5 py-1.5 rounded-full shadow-sm text-xs flex items-center gap-1.5 hover:bg-red-100 transition-colors outline-none cursor-pointer">
          <i className="fa-solid fa-power-off"></i> Keluar
        </button>
      </div>

      {/* NAVIGASI SUB-MENU TAB ADMIN DENGAN TAMBAHAN "REKAP" */}
      <div className="flex bg-white rounded-2xl p-1.5 shadow-soft border border-slate-100 gap-1 overflow-x-auto hide-scrollbar">
        <button onClick={() => setActiveSubTab('tugas')} className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap outline-none cursor-pointer ${activeSubTab === 'tugas' ? 'bg-midnight text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
          <i className="fa-solid fa-list-check"></i> Tugas
        </button>
        <button onClick={() => setActiveSubTab('voting')} className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap outline-none cursor-pointer ${activeSubTab === 'voting' ? 'bg-midnight text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
          <i className="fa-solid fa-check-to-slot"></i> Voting
        </button>
        <button onClick={() => setActiveSubTab('absensi')} className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap outline-none cursor-pointer ${activeSubTab === 'absensi' ? 'bg-midnight text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
          <i className="fa-solid fa-clipboard-user"></i> Absensi
        </button>
        <button onClick={() => setActiveSubTab('rekap')} className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap outline-none cursor-pointer ${activeSubTab === 'rekap' ? 'bg-midnight text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
          <i className="fa-solid fa-chart-line text-emerald-400"></i> Rekap Kinerja
        </button>
        <button onClick={() => setActiveSubTab('sistem')} className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap outline-none cursor-pointer ${activeSubTab === 'sistem' ? 'bg-midnight text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
          <i className="fa-solid fa-gears"></i> DB
        </button>
      </div>

      {/* ==================== SUB-MENU BARU: REKAP KINERJA & RANKING ==================== */}
      {activeSubTab === 'rekap' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-3xl shadow-soft p-5 text-white relative overflow-hidden">
             <i className="fa-solid fa-ranking-star absolute -right-4 -bottom-4 text-8xl opacity-10"></i>
             <div className="relative z-10">
                <h4 className="font-black text-lg mb-2 flex items-center gap-2">
                  <i className="fa-solid fa-medal text-yellow-300"></i> Rekapitulasi & Ranking Kinerja
                </h4>
                <p className="text-xs font-bold text-white/80 mb-5">
                  Sistem scoring otomatis: Tugas (Selesai +20, Kurang +10), Absen (Hadir +10, Izin/Sakit +5), Voting (Ikut +5). 
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <select value={rekapPeriod} onChange={e => setRekapPeriod(e.target.value)} className="w-full sm:w-auto bg-white/10 border border-white/20 text-white font-bold text-xs rounded-xl px-4 py-2.5 outline-none cursor-pointer">
                    <option value="all" className="text-midnight">Semua Waktu (All-time)</option>
                    <option value="1m" className="text-midnight">1 Bulan Terakhir</option>
                    <option value="3m" className="text-midnight">3 Bulan Terakhir</option>
                    <option value="6m" className="text-midnight">6 Bulan Terakhir</option>
                    <option value="1y" className="text-midnight">1 Tahun Terakhir</option>
                  </select>
                  
                  <button onClick={handleExportRekapPDF} className="w-full sm:w-auto bg-white text-emerald-700 font-black px-6 py-2.5 rounded-xl shadow-md hover:bg-emerald-50 transition-colors flex justify-center items-center gap-2 text-xs outline-none cursor-pointer">
                    <i className="fa-solid fa-file-pdf text-red-500"></i> Cetak Rekap PDF F4
                  </button>
                </div>
             </div>
          </div>

          <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
             <div className="p-0 overflow-x-auto">
               <table className="w-full text-left text-xs whitespace-nowrap">
                 <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-black">
                   <tr>
                     <th className="px-4 py-4 text-center">Rank</th>
                     <th className="px-4 py-4">Nama SDM PKH</th>
                     <th className="px-4 py-4 text-center">Absensi<br/><span className="text-[9px] text-slate-400">H/I/S/A</span></th>
                     <th className="px-4 py-4 text-center">Tugas Kinerja<br/><span className="text-[9px] text-slate-400">Selesai/Kurang/Tidak</span></th>
                     <th className="px-4 py-4 text-center">Voting<br/><span className="text-[9px] text-slate-400">Ikut/Abstain</span></th>
                     <th className="px-4 py-4 text-center">Skor Akhir</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {getRekapData().map((d, index) => (
                     <tr key={index} className="hover:bg-slate-50 transition-colors">
                       <td className="px-4 py-3 text-center">
                         {index === 0 ? <i className="fa-solid fa-medal text-yellow-400 text-xl drop-shadow-md"></i> :
                          index === 1 ? <i className="fa-solid fa-medal text-slate-300 text-xl drop-shadow-md"></i> :
                          index === 2 ? <i className="fa-solid fa-medal text-amber-600 text-xl drop-shadow-md"></i> :
                          <span className="font-black text-slate-400">{index + 1}</span>}
                       </td>
                       <td className="px-4 py-3 font-bold text-midnight">
                         {d.name} <span className="text-[9px] text-slate-400 ml-1">({d.lpStr || '?'})</span>
                       </td>
                       <td className="px-4 py-3 text-center font-bold">
                         <span className="text-emerald-500">{d.abs.h}</span> / <span className="text-blue-500">{d.abs.i}</span> / <span className="text-orange-400">{d.abs.s}</span> / <span className="text-red-500">{d.abs.a}</span>
                       </td>
                       <td className="px-4 py-3 text-center font-bold">
                         <span className="text-emerald-500">{d.tsk.sel}</span> / <span className="text-orange-400">{d.tsk.kur}</span> / <span className="text-red-500">{d.tsk.tid}</span>
                       </td>
                       <td className="px-4 py-3 text-center font-bold">
                         <span className="text-status-selesai">{d.vts.v}</span> / <span className="text-slate-400">{d.vts.x}</span>
                       </td>
                       <td className="px-4 py-3 text-center">
                         <span className="bg-midnight text-white px-3 py-1 rounded-full font-black drop-shadow-sm">{d.score}</span>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        </div>
      )}

      {/* ==================== SUB-MENU 1: TUGAS ==================== */}
      {activeSubTab === 'tugas' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 p-4 px-5 flex items-center gap-2">
              <i className="fa-solid fa-square-plus text-status-selesai"></i> 
              <span className="font-black text-midnight text-sm uppercase tracking-wider">Tambah Tugas Baru</span>
            </div>
            <div className="p-5 space-y-6">
               <form onSubmit={handleAddManual} className="space-y-4">
                  <h6 className="font-bold text-midnight text-xs uppercase tracking-wider border-b border-slate-100 pb-2">Input Manual & Multi-Target</h6>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Nama Kegiatan</label>
                    <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-midnight outline-none focus:ring-1 focus:ring-midnight shadow-inner" value={newTask.taskName} onChange={e => setNewTask({...newTask, taskName: e.target.value})} placeholder="Contoh: Entry Data PKH" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Tugaskan Ke</label>
                    <input list="emp-list" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-midnight outline-none focus:ring-1 focus:ring-midnight shadow-inner cursor-pointer" value={newTask.picId} onChange={e => setNewTask({...newTask, picId: e.target.value})} placeholder="Ketik nama atau pilih opsi..." />
                    <datalist id="emp-list"><option value="all">🚀 SEMUA PEGAWAI SEKALIGUS</option>{(employees || []).map(emp => <option key={emp.id} value={emp.name} />)}</datalist>
                  </div>
                  
                  {newTask.picId === 'all' ? (
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3">
                      <label className="block text-[10px] font-bold text-blue-800 uppercase">Set Target Beban Masing-Masing</label>
                      {(employees || []).map(emp => (
                        <div key={emp.id} className="flex justify-between items-center gap-3 bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                          <span className="text-xs font-bold text-midnight pl-1 truncate w-24">{emp.name}</span>
                          <input type="number" min="0" placeholder="Target Angka" className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 w-full text-xs font-bold outline-none text-center" value={newTask.multiTargets[emp.id] || ''} onChange={e => setNewTask({...newTask, multiTargets: {...newTask.multiTargets, [emp.id]: e.target.value}})} />
                        </div>
                      ))}
                      <div className="pt-2">
                        <label className="block text-[10px] font-bold text-blue-800 uppercase mb-1">Tenggat Waktu Bersama</label>
                        <input type="date" required className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none cursor-pointer" value={newTask.deadline} onChange={e => setNewTask({...newTask, deadline: e.target.value})} />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Target Angka</label><input type="number" required min="1" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none text-center shadow-inner" value={newTask.target} onChange={e => setNewTask({...newTask, target: e.target.value})} placeholder="0" /></div>
                      <div><label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Tenggat</label><input type="date" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none cursor-pointer" value={newTask.deadline} onChange={e => setNewTask({...newTask, deadline: e.target.value})} /></div>
                    </div>
                  )}
                  <button type="submit" disabled={isSyncing || !db} className="w-full bg-midnight text-white font-bold py-3 rounded-xl shadow-md active:scale-95 transition-all outline-none cursor-pointer flex justify-center items-center gap-2">
                    {isSyncing ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Menyimpan...</> : <><i className="fa-solid fa-plus"></i> Simpan Tugas Baru</>}
                  </button>
               </form>
               <div className="border-t border-slate-100 pt-6">
                 <h6 className="font-bold text-midnight text-xs uppercase tracking-wider border-b border-slate-100 pb-2 mb-3">Upload Massal via Excel</h6>
                 <div className="bg-gradient-to-br from-midnight to-midnight-light rounded-2xl p-5 text-white relative overflow-hidden shadow-glossy">
                   <i className="fa-solid fa-cloud-arrow-up absolute -right-6 -bottom-6 text-7xl opacity-10 text-white"></i>
                   <div className="relative z-10">
                     <p className="text-white/60 text-[10px] font-bold mb-3 uppercase tracking-wide">Format: .xlsx atau .csv (Kolom A-D)</p>
                     <div className="flex gap-2">
                       <button onClick={() => { fileInputRef.current.value = ''; downloadExcelTemplate(); }} className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 backdrop-blur-md outline-none cursor-pointer">
                         <i className="fa-solid fa-download"></i> Template
                       </button>
                       <input type="file" accept=".xlsx, .csv" ref={fileInputRef} onChange={handleExcelUpload} className="hidden" />
                       <button onClick={() => fileInputRef.current.click()} disabled={isSyncing || !db} className="flex-[2] bg-white text-midnight font-black py-2.5 rounded-xl shadow-soft hover:bg-slate-50 transition-colors flex justify-center items-center gap-2 text-xs outline-none cursor-pointer">
                          {isSyncing ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-file-excel text-emerald-500"></i>} Upload File
                       </button>
                     </div>
                   </div>
                 </div>
               </div>
            </div>
          </div>
          <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
             <div className="bg-slate-50 border-b border-slate-100 p-4 px-5 flex items-center gap-2"><i className="fa-solid fa-pen-ruler text-status-proses"></i> <span className="font-black text-midnight text-sm uppercase tracking-wider">Daftar Kelola Data Tugas</span></div>
             <div className="p-5 space-y-4">
                {(groupedTasks?.length || 0) === 0 && <p className="text-center py-6 text-slate-400 font-bold text-sm bg-slate-50 rounded-xl">Database tugas kosong.</p>}
                <div className="space-y-3">
                  {(groupedTasks || []).map(g => (
                    <details key={g.taskName} className="group bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                      <summary className="p-4 font-bold text-midnight flex justify-between items-center cursor-pointer select-none outline-none">
                        <span className="flex items-center gap-3">
                          <i className="fa-solid fa-folder text-status-selesai group-open:text-status-proses transition-colors text-lg"></i> 
                          <span className="truncate max-w-[130px] sm:max-w-xs">{g.taskName}</span>
                          <span className="bg-midnight text-white text-[10px] px-2 py-0.5 rounded-md">{g.assignees?.length || 0}</span>
                        </span>
                        <div className="flex gap-1.5">
                          <button onClick={(e) => { e.preventDefault(); handleResetGroupProgress(g.taskName); }} className="bg-white border border-slate-200 text-orange-500 hover:bg-orange-50 w-8 h-8 rounded-lg flex justify-center items-center transition-colors shadow-sm outline-none cursor-pointer"><i className="fa-solid fa-rotate-left"></i></button>
                          <button onClick={(e) => { e.preventDefault(); setEditModal({ isOpen: true, type: 'group', oldTaskName: g.taskName, data: { taskName: g.taskName, deadline: g.deadline } }); }} className="bg-white border border-slate-200 text-status-selesai hover:bg-blue-50 w-8 h-8 rounded-lg flex justify-center items-center transition-colors shadow-sm outline-none cursor-pointer"><i className="fa-solid fa-pen"></i></button>
                          <button onClick={(e) => { e.preventDefault(); handleDeleteGroup(g.taskName); }} className="bg-white border border-red-200 text-red-500 hover:bg-red-50 w-8 h-8 rounded-lg flex justify-center items-center transition-colors shadow-sm outline-none cursor-pointer"><i className="fa-solid fa-trash"></i></button>
                        </div>
                      </summary>
                      <div className="px-4 pb-4 pt-1 space-y-2 border-t border-slate-200/60 mt-1">
                        {(g.assignees || []).map(a => {
                          const today = new Date().toISOString().split('T')[0];
                          const progresHariIni = (a.daily && a.daily[today]) ? a.daily[today] : 0;
                          return (
                            <div key={a.id} className="flex justify-between items-center bg-white border border-slate-100 p-3 rounded-xl shadow-sm">
                              <div className="flex-1">
                                <div className="text-xs font-bold text-midnight flex items-center gap-2"><i className="fa-solid fa-user-tag text-slate-300"></i> {a.picId}</div>
                                <div className="text-[10px] text-slate-400 font-bold mt-1">Trg: <span className="text-midnight">{a.target}</span> | Capaian: <span className="text-status-selesai">{a.progress}</span>{progresHariIni > 0 && <span className="text-yellow-600 ml-1 bg-yellow-50 px-1 rounded border border-yellow-100">(+{progresHariIni} hari ini)</span>}</div>
                              </div>
                              <div className="flex gap-1.5">
                                <button onClick={(e) => { e.preventDefault(); handleResetIndividualProgress(a.id); }} className="bg-orange-50 text-orange-500 border border-orange-200 w-8 h-8 rounded-full flex items-center justify-center hover:bg-orange-100 transition-colors outline-none cursor-pointer"><i className="fa-solid fa-rotate-left text-[10px]"></i></button>
                                <button onClick={(e) => { e.preventDefault(); setEditModal({ isOpen: true, type: 'individual', data: { id: a.id, taskName: a.taskName, picId: a.picId, target: a.target, progress: a.progress, deadline: a.deadline } })}} className="bg-slate-50 text-status-selesai border border-slate-200 w-8 h-8 rounded-full flex items-center justify-center hover:bg-blue-50 transition-colors outline-none cursor-pointer"><i className="fa-solid fa-pen text-[10px]"></i></button>
                                <button onClick={(e) => { e.preventDefault(); handleDeletePerson(a.id); }} className="bg-red-50 text-red-500 border border-red-100 w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-100 transition-colors outline-none cursor-pointer"><i className="fa-solid fa-xmark text-sm"></i></button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  ))}
                </div>
             </div>
          </div>
        </div>
      )}

      {/* ==================== SUB-MENU 2: VOTING ==================== */}
      {activeSubTab === 'voting' && (
        <div className="space-y-6 animate-fade-in">
           <div className="bg-gradient-to-br from-indigo-600 to-blue-800 rounded-3xl shadow-soft p-5 text-white relative overflow-hidden">
            <i className="fa-solid fa-check-to-slot absolute -right-4 -bottom-4 text-8xl opacity-10"></i>
            <div className="relative z-10">
              <h4 className="font-black text-lg mb-4 flex items-center gap-2"><i className="fa-solid fa-plus-circle text-yellow-400"></i> Buat Voting Baru</h4>
              <form onSubmit={handleCreateVoting} className="space-y-4">
                 <div>
                    <label className="block text-[10px] font-bold text-white/70 mb-1 uppercase">Topik / Nama Voting</label>
                    <input type="text" required className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none placeholder:text-white/30" value={voteTitle} onChange={e => setVoteTitle(e.target.value)} placeholder="Contoh: Menu Makan Siang" />
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold text-yellow-300 mb-1 uppercase"><i className="fa-solid fa-clock mr-1"></i> Batas Waktu Vote (Deadline)</label>
                    <input type="date" className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none cursor-pointer" value={voteDeadline} onChange={e => setVoteDeadline(e.target.value)} />
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold text-white/70 mb-1 uppercase">Opsi Pilihan</label>
                    {(voteOptions || []).map((opt, idx) => (
                      <div key={idx} className="flex gap-2 mb-2">
                        <input type="text" required className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm font-bold text-white outline-none placeholder:text-white/30" value={opt} onChange={e => { const newArr = [...voteOptions]; newArr[idx] = e.target.value; setVoteOptions(newArr); }} placeholder={`Opsi ${idx+1}`} />
                        {(voteOptions?.length || 0) > 1 && (
                          <button type="button" onClick={() => setVoteOptions(voteOptions.filter((_, i) => i !== idx))} className="bg-red-500/20 text-red-200 border border-red-500/30 w-10 rounded-xl flex items-center justify-center outline-none cursor-pointer"><i className="fa-solid fa-trash text-xs"></i></button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={() => setVoteOptions([...(voteOptions || []), ''])} className="text-xs font-bold text-yellow-300 mt-1 outline-none cursor-pointer"><i className="fa-solid fa-plus mr-1"></i> Tambah Opsi</button>
                 </div>
                 <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 mt-2">
                    <input type="checkbox" id="multiVote" checked={isMulti} onChange={e => setIsMulti(e.target.checked)} className="w-4 h-4 accent-blue-500 rounded outline-none cursor-pointer" />
                    <label htmlFor="multiVote" className="text-xs font-bold text-white cursor-pointer select-none">Boleh pilih lebih dari satu opsi (Multi Vote)</label>
                 </div>
                 <button type="submit" disabled={isSyncing} className="w-full bg-white text-blue-900 font-black py-3 rounded-xl shadow-md active:scale-95 transition-all text-sm outline-none mt-2 cursor-pointer">{isSyncing ? 'Membuat...' : 'Terbitkan Voting'}</button>
              </form>
            </div>
          </div>
          <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
             <div className="bg-slate-50 border-b border-slate-100 p-4 px-5 flex items-center gap-2"><i className="fa-solid fa-check-to-slot text-status-proses"></i> <span className="font-black text-midnight text-sm uppercase tracking-wider">Daftar Kelola Kotak Suara</span></div>
             <div className="p-5 space-y-4">
               {(!votings || votings.length === 0) && <p className="text-center py-6 text-slate-400 font-bold text-sm bg-slate-50 rounded-xl">Belum ada voting terdaftar.</p>}
               <div className="space-y-3">
                 {votings && (votings || []).map(v => (
                   <div key={v.id} className="flex justify-between items-center bg-slate-50 border border-slate-200 p-4 rounded-2xl shadow-sm">
                     <div>
                       <h5 className="font-bold text-midnight text-sm">{v.title}</h5>
                       <div className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-wider">{v.isMulti ? 'Multi Vote' : 'Single Vote'} • {v.votes ? Object.keys(v.votes).length : 0} Suara</div>
                     </div>
                     <div className="flex gap-1.5 shrink-0">
                       <button onClick={(e) => { e.preventDefault(); handleResetVoting(v.id); }} className="bg-white border border-slate-200 text-orange-500 hover:bg-orange-50 w-8 h-8 rounded-lg flex justify-center items-center transition-colors shadow-sm outline-none cursor-pointer"><i className="fa-solid fa-rotate-left"></i></button>
                       <button onClick={(e) => { e.preventDefault(); setEditVoteModal({ isOpen: true, id: v.id, title: v.title, deadline: v.deadline || '', options: v.options, isMulti: v.isMulti }); }} className="bg-white border border-slate-200 text-status-selesai hover:bg-blue-50 w-8 h-8 rounded-lg flex justify-center items-center transition-colors shadow-sm outline-none cursor-pointer"><i className="fa-solid fa-pen"></i></button>
                       <button onClick={(e) => { e.preventDefault(); handleDeleteVoting(v.id); }} className="bg-white border border-red-200 text-red-500 hover:bg-red-50 w-8 h-8 rounded-lg flex justify-center items-center transition-colors shadow-sm outline-none cursor-pointer"><i className="fa-solid fa-trash"></i></button>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
          </div>
        </div>
      )}

      {/* ==================== SUB-MENU 3: ABSENSI (FULL CRUD & PDF F4) ==================== */}
      {activeSubTab === 'absensi' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* ----- 1. CRUD PEJABAT PENANDATANGAN PDF ----- */}
          <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 p-4 px-5 flex items-center gap-2">
              <i className="fa-solid fa-signature text-status-selesai"></i> 
              <span className="font-black text-midnight text-sm uppercase tracking-wider">Kelola Pejabat TTD PDF</span>
            </div>
            <div className="p-5">
              <form onSubmit={handleAddSignature} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                 <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Jabatan</label>
                    <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-midnight outline-none focus:ring-1 focus:ring-midnight shadow-inner" value={newSig.jabatan} onChange={e => setNewSig({...newSig, jabatan: e.target.value})} placeholder="Cth: Kabid Linjamsos" />
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Nama Pejabat</label>
                    <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-midnight outline-none focus:ring-1 focus:ring-midnight shadow-inner" value={newSig.nama} onChange={e => setNewSig({...newSig, nama: e.target.value})} placeholder="Nama & Gelar" />
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">NIP</label>
                    <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-midnight outline-none focus:ring-1 focus:ring-midnight shadow-inner" value={newSig.nip} onChange={e => setNewSig({...newSig, nip: e.target.value})} placeholder="Nomor Induk Pegawai" />
                 </div>
                 <div className="md:col-span-3 mt-1">
                   <button type="submit" disabled={isSyncing} className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 font-black py-3 rounded-xl active:scale-95 transition-all outline-none cursor-pointer flex justify-center items-center gap-2 shadow-sm">
                      {isSyncing ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Menyimpan...</> : <><i className="fa-solid fa-plus"></i> Tambah Pejabat Baru</>}
                   </button>
                 </div>
              </form>

              <h6 className="font-bold text-slate-500 text-[10px] uppercase tracking-wider mb-2 border-b border-slate-100 pb-2">Daftar Pejabat Penandatangan</h6>
              <div className="space-y-3">
                {(signatures?.length || 0) === 0 && <p className="text-center text-xs font-bold text-slate-400 py-4">Belum ada pengaturan pejabat TTD.</p>}
                {(signatures || []).map(s => (
                  <div key={s.id} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-2xl border transition-all ${activeSigId === s.id ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="mb-3 sm:mb-0">
                      <h5 className={`font-black text-sm mb-0.5 ${activeSigId === s.id ? 'text-emerald-700' : 'text-midnight'}`}>{s.nama}</h5>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">{s.jabatan} • NIP. {s.nip}</p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      {activeSigId === s.id ? (
                        <span className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-emerald-500 text-white font-bold py-1.5 px-4 rounded-xl text-xs"><i className="fa-solid fa-check-circle"></i> Digunakan</span>
                      ) : (
                        <button onClick={() => handleActivateSignature(s.id)} className="flex-1 sm:flex-none bg-white text-emerald-600 border border-emerald-200 font-bold py-1.5 px-4 rounded-xl text-xs hover:bg-emerald-50 transition-colors outline-none cursor-pointer">Set Aktif</button>
                      )}
                      <button onClick={() => setEditSigModal({ isOpen: true, id: s.id, jabatan: s.jabatan, nama: s.nama, nip: s.nip })} className="bg-white text-status-selesai border border-slate-200 w-8 h-8 rounded-xl flex justify-center items-center hover:bg-blue-50 outline-none cursor-pointer shrink-0"><i className="fa-solid fa-pen text-[10px]"></i></button>
                      <button onClick={() => handleDeleteSignature(s.id)} className="bg-white text-red-500 border border-red-200 w-8 h-8 rounded-xl flex justify-center items-center hover:bg-red-50 outline-none cursor-pointer shrink-0"><i className="fa-solid fa-trash text-[10px]"></i></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ----- 2. CRUD EVENT ABSENSI ----- */}
          <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 p-4 px-5 flex items-center gap-2">
              <i className="fa-solid fa-calendar-plus text-status-selesai"></i> 
              <span className="font-black text-midnight text-sm uppercase tracking-wider">Buat Kegiatan Absensi</span>
            </div>
            <div className="p-5">
              <form onSubmit={handleCreateAttendanceEvent} className="space-y-4">
                 <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Topik Kegiatan (cth: Rapat Koordinasi)</label>
                    <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-midnight outline-none focus:ring-1 focus:ring-midnight shadow-inner" value={absEventTitle} onChange={e => setAbsEventTitle(e.target.value)} />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-3">
                   <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Tanggal Pelaksanaan</label>
                      <input type="date" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-midnight outline-none cursor-pointer" value={absEventDate} onChange={e => setAbsEventDate(e.target.value)} />
                   </div>
                   <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Batas Waktu Absen (Jam)</label>
                      <input type="time" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-midnight outline-none cursor-pointer" value={absEventTimeLimit} onChange={e => setAbsEventTimeLimit(e.target.value)} />
                   </div>
                 </div>

                 <div className="grid grid-cols-3 gap-3">
                   <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Tempat / Lokasi</label>
                      <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-midnight outline-none" value={absEventLocation} onChange={e => setAbsEventLocation(e.target.value)} />
                   </div>
                   <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase" title="Tambahan baris kosong jika peserta kurang dari target">Target Min. Baris</label>
                      <input type="number" min="1" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-midnight outline-none text-center shadow-inner" value={absEventMinRows} onChange={e => setAbsEventMinRows(e.target.value)} />
                   </div>
                 </div>
                 
                 <button type="submit" disabled={isSyncing} className="w-full bg-midnight text-white font-bold py-3 rounded-xl shadow-md active:scale-95 transition-all outline-none cursor-pointer flex justify-center items-center gap-2 mt-2">
                    {isSyncing ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Memproses...</> : <><i className="fa-solid fa-plus"></i> Buka Form Absensi Pegawai</>}
                 </button>
              </form>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-midnight to-midnight-light p-4 px-5 flex justify-between items-center text-white">
              <span className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
                <i className="fa-solid fa-clipboard-list text-status-selesai"></i> Rekapitulasi Daftar Hadir
              </span>
            </div>
            <div className="p-5 space-y-4">
              {(attendanceEvents?.length || 0) === 0 && <p className="text-center py-6 text-slate-400 font-bold text-sm bg-slate-50 rounded-xl">Belum ada kegiatan absensi dibuat.</p>}
              
              <div className="space-y-3">
                {(attendanceEvents || []).map(ev => {
                  const evIsExpired = new Date() > new Date(`${ev.date}T${ev.timeLimit || '23:59'}`);

                  return (
                  <div key={ev.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 border border-slate-200 p-4 rounded-2xl shadow-sm gap-3 relative overflow-hidden">
                    {evIsExpired && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-400"></div>}
                    <div className="flex-1 pl-1">
                      <h5 className="font-bold text-midnight text-sm mb-1">{ev.title}</h5>
                      <div className="text-[10px] text-slate-500 font-bold flex flex-wrap items-center gap-3">
                        <span><i className="fa-regular fa-calendar text-slate-400"></i> {formatDateId(ev.date)}</span>
                        <span><i className="fa-regular fa-clock text-slate-400"></i> {ev.timeLimit || '23:59'} {evIsExpired && <span className="text-red-500 ml-1">(Ditutup)</span>}</span>
                        <span><i className="fa-solid fa-location-dot text-slate-400"></i> {ev.location}</span>
                        <span><i className="fa-solid fa-table-list text-slate-400"></i> Min. {ev.minRows || 29} Baris</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-1.5 w-full sm:w-auto">
                      <button onClick={() => handleExportPDF(ev)} className="flex-1 sm:flex-none bg-blue-50 text-blue-600 border border-blue-200 font-bold py-2 px-3 rounded-xl text-xs hover:bg-blue-100 transition-colors flex justify-center items-center gap-1.5 outline-none cursor-pointer">
                        <i className="fa-solid fa-file-pdf text-red-500"></i> Download PDF
                      </button>
                      <button onClick={() => setEditAbsEventModal({ isOpen: true, id: ev.id, title: ev.title, date: ev.date, timeLimit: ev.timeLimit, location: ev.location, minRows: ev.minRows || 29 })} className="bg-white text-status-selesai border border-slate-200 w-9 h-9 rounded-xl flex justify-center items-center hover:bg-blue-50 outline-none cursor-pointer shrink-0" title="Edit Kegiatan">
                        <i className="fa-solid fa-pen text-xs"></i>
                      </button>
                      <button onClick={() => handleDeleteAttendanceEvent(ev.id)} className="bg-red-50 text-red-500 border border-red-200 w-9 h-9 rounded-xl flex justify-center items-center hover:bg-red-100 outline-none cursor-pointer shrink-0" title="Hapus Rekaman Kegiatan">
                        <i className="fa-solid fa-trash text-xs"></i>
                      </button>
                    </div>
                  </div>
                )})}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SUB-MENU 4: SISTEM ==================== */}
      {activeSubTab === 'sistem' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 p-4 px-5 flex items-center gap-2">
              <i className="fa-solid fa-gears text-midnight"></i> 
              <span className="font-black text-midnight text-sm uppercase tracking-wider">Pemeliharaan & Reset Database</span>
            </div>
            <div className="p-5 space-y-4">
               <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 space-y-2">
                 <div className="flex justify-between"><span>Status Koneksi:</span><span className="text-emerald-600 font-black flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Connected (Realtime)</span></div>
                 <div className="flex justify-between"><span>Total Kegiatan Tugas:</span><span className="text-midnight font-black">{groupedTasks?.length || 0} Group</span></div>
                 <div className="flex justify-between"><span>Total Event Voting:</span><span className="text-midnight font-black">{votings ? votings.length : 0} Topik</span></div>
                 <div className="flex justify-between"><span>Total Event Absensi:</span><span className="text-midnight font-black">{attendanceEvents?.length || 0} Event</span></div>
                 <div className="flex justify-between"><span>Total Pejabat TTD:</span><span className="text-midnight font-black">{signatures?.length || 0} Pejabat</span></div>
               </div>
               <div className="border-t border-slate-100 pt-4">
                 <p className="text-[11px] font-bold text-red-500 mb-3"><i className="fa-solid fa-triangle-exclamation mr-1"></i> Perhatian: Tindakan ini akan menghapus seluruh data tugas, voting, dan absensi secara permanen.</p>
                 <button onClick={handleResetAll} disabled={isSyncing || !db} className="w-full bg-red-50 text-red-600 border border-red-200 font-black py-3.5 rounded-xl shadow-sm hover:bg-red-100 transition-colors flex justify-center items-center gap-2 outline-none cursor-pointer">
                   <i className="fa-solid fa-skull-crossbones"></i> FORMAT KOSONGKAN SELURUH DATABASE
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL EDIT TUGAS ==================== */}
      {editModal.isOpen && (
        <div className="fixed inset-0 z-[9999] bg-midnight/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
             <div className="bg-gradient-to-r from-midnight to-midnight-light p-4 px-5 flex justify-between items-center text-white">
                <h3 className="font-black text-sm uppercase tracking-wider"><i className="fa-solid fa-pen-to-square mr-2 text-status-selesai"></i> {editModal.type === 'group' ? 'Edit Grup Kegiatan' : 'Bypass Edit Data'}</h3>
                <button type="button" onClick={() => setEditModal({isOpen: false, type:'', data:{}, oldTaskName:''})} className="opacity-70 hover:opacity-100 outline-none cursor-pointer"><i className="fa-solid fa-xmark text-xl"></i></button>
             </div>
             <div className="p-6">
                <form onSubmit={handleSaveEdit} className="space-y-4">
                   <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Nama Kegiatan</label>
                      <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-midnight outline-none" value={editModal.data.taskName} onChange={e => setEditModal({...editModal, data: {...editModal.data, taskName: e.target.value}})} />
                   </div>
                   {editModal.type === 'individual' && (
                     <>
                       <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Nama Pegawai / PIC</label>
                          <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-midnight outline-none" value={editModal.data.picId} onChange={e => setEditModal({...editModal, data: {...editModal.data, picId: e.target.value}})} />
                       </div>
                       <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Target Angka</label>
                            <input type="number" required min="1" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none text-center" value={editModal.data.target} onChange={e => setEditModal({...editModal, data: {...editModal.data, target: e.target.value}})} />
                         </div>
                         <div>
                            <label className="flex justify-between items-center text-[10px] font-bold text-slate-500 mb-1 uppercase"><span>Capaian</span><button type="button" onClick={() => setEditModal({...editModal, data: {...editModal.data, progress: 0}})} className="text-orange-500 hover:text-orange-600 outline-none cursor-pointer">Reset 0</button></label>
                            <input type="number" required min="0" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black text-status-selesai outline-none text-center shadow-inner" value={editModal.data.progress} onChange={e => setEditModal({...editModal, data: {...editModal.data, progress: e.target.value}})} />
                         </div>
                       </div>
                     </>
                   )}
                   <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Tenggat Waktu</label>
                      <input type="date" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none cursor-pointer" value={editModal.data.deadline} onChange={e => setEditModal({...editModal, data: {...editModal.data, deadline: e.target.value}})} />
                   </div>
                   <div className="pt-2"><button type="submit" disabled={isSyncing} className="w-full bg-status-selesai text-white font-bold py-3 rounded-xl shadow-md active:scale-95 transition-all text-sm outline-none flex justify-center items-center gap-2 cursor-pointer">{isSyncing ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Menyimpan...</> : <><i className="fa-solid fa-floppy-disk"></i> Simpan Perubahan</>}</button></div>
                </form>
             </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL EDIT VOTING ==================== */}
      {editVoteModal.isOpen && (
        <div className="fixed inset-0 z-[9999] bg-midnight/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
             <div className="bg-gradient-to-r from-midnight to-midnight-light p-4 px-5 flex justify-between items-center text-white">
                <h3 className="font-black text-sm uppercase tracking-wider"><i className="fa-solid fa-pen-to-square mr-2 text-status-selesai"></i> Edit Kotak Suara</h3>
                <button type="button" onClick={() => setEditVoteModal({isOpen: false, id:null, title:'', deadline:'', options:[''], isMulti:false})} className="opacity-70 hover:opacity-100 outline-none cursor-pointer"><i className="fa-solid fa-xmark text-xl"></i></button>
             </div>
             <div className="p-6">
                <form onSubmit={handleSaveEditVote} className="space-y-4">
                   <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Topik / Nama Voting</label>
                      <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-midnight outline-none" value={editVoteModal.title} onChange={e => setEditVoteModal({...editVoteModal, title: e.target.value})} />
                   </div>
                   <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Batas Waktu Vote (Deadline)</label>
                      <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-midnight outline-none cursor-pointer" value={editVoteModal.deadline} onChange={e => setEditVoteModal({...editVoteModal, deadline: e.target.value})} />
                   </div>
                   <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Opsi Pilihan</label>
                      {(editVoteModal.options || []).map((opt, idx) => (
                        <div key={idx} className="flex gap-2 mb-2">
                          <input required type="text" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-midnight outline-none" value={opt} onChange={e => { const newArr = [...editVoteModal.options]; newArr[idx] = e.target.value; setEditVoteModal({...editVoteModal, options: newArr}); }} />
                          {(editVoteModal.options?.length || 0) > 1 && (<button type="button" onClick={() => setEditVoteModal({...editVoteModal, options: editVoteModal.options.filter((_, i) => i !== idx)})} className="bg-red-50 text-red-500 border border-red-200 w-10 rounded-xl flex items-center justify-center outline-none cursor-pointer"><i className="fa-solid fa-trash text-xs"></i></button>)}
                        </div>
                      ))}
                      <button type="button" onClick={() => setEditVoteModal({...editVoteModal, options: [...(editVoteModal.options || []), '']})} className="text-xs font-bold text-status-selesai mt-1 outline-none cursor-pointer"><i className="fa-solid fa-plus mr-1"></i> Tambah Opsi</button>
                   </div>
                   <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 mt-2">
                      <input type="checkbox" id="editMultiVote" checked={editVoteModal.isMulti} onChange={e => setEditVoteModal({...editVoteModal, isMulti: e.target.checked})} className="w-4 h-4 accent-blue-500 rounded outline-none cursor-pointer" />
                      <label htmlFor="editMultiVote" className="text-xs font-bold text-midnight cursor-pointer select-none">Multi Vote (Bisa Pilih &gt; 1)</label>
                   </div>
                   <div className="pt-2"><button type="submit" disabled={isSyncing} className="w-full bg-status-selesai text-white font-bold py-3 rounded-xl shadow-md active:scale-95 transition-all text-sm outline-none flex justify-center items-center gap-2 cursor-pointer">{isSyncing ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Menyimpan...</> : <><i className="fa-solid fa-floppy-disk"></i> Simpan Perubahan</>}</button></div>
                </form>
             </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL EDIT PEJABAT TTD ==================== */}
      {editSigModal.isOpen && (
        <div className="fixed inset-0 z-[9999] bg-midnight/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
             <div className="bg-gradient-to-r from-midnight to-midnight-light p-4 px-5 flex justify-between items-center text-white">
                <h3 className="font-black text-sm uppercase tracking-wider"><i className="fa-solid fa-pen-to-square mr-2 text-status-selesai"></i> Edit Pejabat</h3>
                <button type="button" onClick={() => setEditSigModal({isOpen: false, id:null, jabatan:'', nama:'', nip:''})} className="opacity-70 hover:opacity-100 outline-none cursor-pointer"><i className="fa-solid fa-xmark text-xl"></i></button>
             </div>
             <div className="p-6">
                <form onSubmit={handleEditSignature} className="space-y-4">
                   <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Jabatan</label>
                      <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-midnight outline-none" value={editSigModal.jabatan} onChange={e => setEditSigModal({...editSigModal, jabatan: e.target.value})} />
                   </div>
                   <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Nama Pejabat</label>
                      <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-midnight outline-none" value={editSigModal.nama} onChange={e => setEditSigModal({...editSigModal, nama: e.target.value})} />
                   </div>
                   <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">NIP</label>
                      <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-midnight outline-none" value={editSigModal.nip} onChange={e => setEditSigModal({...editSigModal, nip: e.target.value})} />
                   </div>
                   <div className="pt-2"><button type="submit" disabled={isSyncing} className="w-full bg-status-selesai text-white font-bold py-3 rounded-xl shadow-md active:scale-95 transition-all text-sm outline-none flex justify-center items-center gap-2 cursor-pointer">{isSyncing ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Menyimpan...</> : <><i className="fa-solid fa-floppy-disk"></i> Simpan Perubahan</>}</button></div>
                </form>
             </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL EDIT EVENT ABSENSI ==================== */}
      {editAbsEventModal.isOpen && (
        <div className="fixed inset-0 z-[9999] bg-midnight/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
             <div className="bg-gradient-to-r from-midnight to-midnight-light p-4 px-5 flex justify-between items-center text-white">
                <h3 className="font-black text-sm uppercase tracking-wider"><i className="fa-solid fa-pen-to-square mr-2 text-status-selesai"></i> Edit Kegiatan Absen</h3>
                <button type="button" onClick={() => setEditAbsEventModal({isOpen: false, id:null, title:'', date:'', timeLimit:'', location:'', minRows:29})} className="opacity-70 hover:opacity-100 outline-none cursor-pointer"><i className="fa-solid fa-xmark text-xl"></i></button>
             </div>
             <div className="p-6">
                <form onSubmit={handleEditAttendanceEvent} className="space-y-4">
                   <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Topik Kegiatan</label>
                      <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-midnight outline-none" value={editAbsEventModal.title} onChange={e => setEditAbsEventModal({...editAbsEventModal, title: e.target.value})} />
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                     <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Tanggal Pelaksanaan</label>
                        <input required type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-midnight outline-none cursor-pointer" value={editAbsEventModal.date} onChange={e => setEditAbsEventModal({...editAbsEventModal, date: e.target.value})} />
                     </div>
                     <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Batas Waktu</label>
                        <input required type="time" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-midnight outline-none cursor-pointer" value={editAbsEventModal.timeLimit} onChange={e => setEditAbsEventModal({...editAbsEventModal, timeLimit: e.target.value})} />
                     </div>
                   </div>
                   <div className="grid grid-cols-3 gap-3">
                     <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Tempat / Lokasi</label>
                        <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-midnight outline-none" value={editAbsEventModal.location} onChange={e => setEditAbsEventModal({...editAbsEventModal, location: e.target.value})} />
                     </div>
                     <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Target Baris</label>
                        <input required type="number" min="1" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-midnight outline-none text-center shadow-inner" value={editAbsEventModal.minRows} onChange={e => setEditAbsEventModal({...editAbsEventModal, minRows: e.target.value})} />
                     </div>
                   </div>
                   <div className="pt-2"><button type="submit" disabled={isSyncing} className="w-full bg-status-selesai text-white font-bold py-3 rounded-xl shadow-md active:scale-95 transition-all text-sm outline-none flex justify-center items-center gap-2 cursor-pointer">{isSyncing ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Menyimpan...</> : <><i className="fa-solid fa-floppy-disk"></i> Simpan Perubahan</>}</button></div>
                </form>
             </div>
          </div>
        </div>
      )}

      <div className="text-center text-[10px] text-slate-400 mt-8 font-bold uppercase tracking-widest opacity-60">
        Developed by M. Zaen Syachrullah
      </div>
    </div>
  );
};

export default AdminMenu;