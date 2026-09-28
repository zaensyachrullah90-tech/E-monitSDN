// ============================================================================
// NAMA FILE: VotingMenu (3).jsx
// DESKRIPSI: Modul Rekapan dan Pendataan Suara (Voting) dengan Sistem Akumulasi
// FITUR: 
// - Multi-opsi (Checkbox) vs Single-opsi (Radio)
// - Mode Input Berulang (Akumulasi Data seperti "Raihan 2x")
// - Mode Perbarui Data (Bisa ganti pilihan)
// - Mode Kunci Mati (Hanya 1x, dilarang ganti)
// - Admin Override (Admin tetap bisa input meski deadline habis, dengan riwayat)
// - Export PDF Dinamis dengan rekapan kuantitas spesifik per nama
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { formatDateId, encodeSafeKey } from '../../../utils/formatters';
import { APP_ID } from '../../../config/firebase';
import LiveCountdown from '../../common/LiveCountdown';

/**
 * Komponen Utama VotingMenu
 * Menangani tampilan kotak suara, statistik, log data, dan form pengisian.
 * 
 * @param {Array} votings - Daftar semua data voting yang aktif
 * @param {Object} db - Instance database Firebase
 * @param {Array} employees - Daftar karyawan/SDM
 * @param {string} selectedVoteId - ID voting yang sedang dipilih/aktif
 * @param {function} setSelectedVoteId - Fungsi setter untuk ID voting
 */
const VotingMenu = ({ 
  votings = [], 
  db, 
  employees = [], 
  selectedVoteId, 
  setSelectedVoteId 
}) => {
  // --------------------------------------------------------------------------
  // STATE MANAGEMENT
  // --------------------------------------------------------------------------
  const [activeTab, setActiveTab] = useState('beri_suara'); 
  const [voteEmp, setVoteEmp] = useState('');
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState(null);
  
  const toastTimeoutRef = useRef(null);

  // Mencari data voting yang sedang aktif berdasarkan ID
  const activeVote = (votings || []).find(v => String(v.id) === String(selectedVoteId));
  
  // Memeriksa apakah user saat ini login sebagai Admin
  const isAdminLogged = sessionStorage.getItem('adminAuth') === 'true'; 

  // --------------------------------------------------------------------------
  // FUNGSI NOTIFIKASI (TOAST)
  // --------------------------------------------------------------------------
  /**
   * Menampilkan notifikasi popup (toast) di layar
   * @param {string} type - Tipe notifikasi ('success' atau 'error')
   */
  const showToast = (type) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast(type);
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // --------------------------------------------------------------------------
  // SISTEM PEMBACA LINK OTOMATIS VIA URL QUERY
  // --------------------------------------------------------------------------
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const voteParam = urlParams.get('vote');
    
    if (voteParam && !selectedVoteId && votings.length > 0) {
      const targetVote = votings.find(v => v.title === voteParam);
      if (targetVote) {
        setSelectedVoteId(targetVote.id);
        setActiveTab('beri_suara');
      }
    }
  }, [votings, selectedVoteId, setSelectedVoteId]);

  // --------------------------------------------------------------------------
  // SISTEM PEMBERSIH URL SAAT MENEKAN TOMBOL KEMBALI
  // --------------------------------------------------------------------------
  /**
   * Menangani aksi kembali ke menu daftar voting utama
   * Membersihkan semua state yang aktif dan menghapus URL query
   */
  const handleBack = () => {
    setSelectedVoteId(null);
    setVoteEmp('');
    setSelectedOptions([]);
    
    const url = new URL(window.location);
    if (url.searchParams.has('vote')) {
      url.searchParams.delete('vote');
      window.history.pushState({}, '', url);
    }
  };

  // --------------------------------------------------------------------------
  // FUNGSI SHARE LINK
  // --------------------------------------------------------------------------
  /**
   * Menangani proses penyalinan link akses unik untuk voting tertentu
   * @param {Event} e - Event klik
   * @param {Object} v - Data voting yang akan di-share
   */
  const handleShareVote = (e, v) => {
    if (e) {
      e.stopPropagation();
    }
    
    const url = `${window.location.origin}${window.location.pathname}?vote=${encodeURIComponent(v.title)}`;
    
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(() => {
        showToast('success');
        alert(`Berhasil! Link Akses telah disalin.\n\nSilakan Paste di Grup WhatsApp:\n${url}`);
      }).catch(() => {
        window.prompt("Salin link akses berikut manual:", url);
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
        alert(`Berhasil! Link Akses telah disalin.\n\nSilakan Paste di Grup WhatsApp:\n${url}`);
      } catch (err) {
        window.prompt("Salin link akses berikut manual:", url);
      }
      document.body.removeChild(textArea);
    }
  };

  // --------------------------------------------------------------------------
  // FUNGSI ADMIN: LIVE TOGGLE PENGATURAN (FIREBASE REALTIME)
  // --------------------------------------------------------------------------
  
  /**
   * Mengubah aturan apakah bisa memilih banyak opsi atau hanya 1
   */
  const toggleIsMulti = async () => {
    if (!db || !activeVote) return;
    try {
      await db.ref(`artifacts/${APP_ID}/public/data/votings/${activeVote.id}/isMulti`).set(!activeVote.isMulti);
      showToast('success');
    } catch (err) { 
      showToast('error'); 
      console.error("Gagal mengubah mode Multi Opsi:", err);
    }
  };

  /**
   * Mengubah aturan apakah 1 SDM bisa submit berulang-ulang (Data terakumulasi)
   */
  const toggleAllowMultiple = async () => {
    if (!db || !activeVote) return;
    const currentVal = activeVote.allowMultipleSubmissions || activeVote.allowMultiple;
    try {
      await db.ref(`artifacts/${APP_ID}/public/data/votings/${activeVote.id}/allowMultipleSubmissions`).set(!currentVal);
      showToast('success');
    } catch (err) { 
      showToast('error'); 
      console.error("Gagal mengubah mode Multiple Submission:", err);
    }
  };

  /**
   * Mengubah aturan apakah 1 SDM bisa memperbarui/mengganti pilihannya (Over-write)
   */
  const toggleAllowUpdate = async () => {
    if (!db || !activeVote) return;
    const currentVal = activeVote.allowUpdate;
    try {
      await db.ref(`artifacts/${APP_ID}/public/data/votings/${activeVote.id}/allowUpdate`).set(!currentVal);
      showToast('success');
    } catch (err) { 
      showToast('error'); 
      console.error("Gagal mengubah mode Allow Update:", err);
    }
  };

  // --------------------------------------------------------------------------
  // FITUR KHUSUS ADMIN: EKSPOR REPORT / REKAPAN BERBENTUK PDF
  // --------------------------------------------------------------------------
  /**
   * Menghasilkan laporan PDF dari data yang masuk
   * Mendukung perhitungan akumulasi kuantitas (misal: Raihan (2x))
   * Menampilkan riwayat aksi Admin Overide
   */
  const handleExportPDF = () => {
    if (!activeVote) return;

    // Persiapan data
    const votesObj = activeVote.votes || {};
    const votesArray = Object.values(votesObj);
    
    // Gunakan Set agar nama yang submit >1x tidak terhitung ganda di daftar sudah merespon
    const uniqueVoterNamesSet = new Set(votesArray.map(v => v.name));
    const sudahVoteNames = [...uniqueVoterNamesSet].sort((a,b) => a.localeCompare(b));
    
    const voters = activeVote.voters || [];
    const belumVoteNames = voters.filter(v => !sudahVoteNames.includes(v)).sort((a,b) => a.localeCompare(b));

    const optionsList = activeVote.options || [];
    const optionData = {};
    
    // Inisialisasi map untuk melacak jumlah setiap opsi
    optionsList.forEach(o => {
      // votersMap untuk melacak "Nama": kuantitas (misal "Raihan": 2)
      optionData[o] = { count: 0, votersMap: {} };
    });

    let totalSuaraMasuk = 0;
    
    // Perhitungan akumulatif
    votesArray.forEach(vote => {
       if (vote.options && Array.isArray(vote.options)) {
         vote.options.forEach(p => { 
           if (optionData[p]) {
             optionData[p].count++; 
             
             // Tambahkan label jika ini adalah Override dari Admin
             let displayName = vote.name;
             if (vote.isAdminOverride) {
               displayName = `${vote.name} 🛡️(Diinput Admin)`;
             }

             if (!optionData[p].votersMap[displayName]) {
               optionData[p].votersMap[displayName] = 0;
             }
             optionData[p].votersMap[displayName]++;
             
             totalSuaraMasuk++; 
           }
         });
       }
    });

    // Sorting opsi berdasarkan jumlah suara terbanyak
    const sortedOptions = [...optionsList].sort((a, b) => optionData[b].count - optionData[a].count);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Mohon izinkan pop-up browser untuk mengekspor Laporan PDF.");
      return;
    }

    // Mendapatkan status pengaturan saat ini
    const isAllowMultiple = activeVote.allowMultipleSubmissions || activeVote.allowMultiple;
    const isAllowUpdate = activeVote.allowUpdate;
    
    let aturanText = "Kunci Mati (1 Suara/SDM, tidak bisa diubah)";
    if (isAllowMultiple) aturanText = "Mode Rekapan Terakumulasi (SDM bisa input berulang)";
    else if (isAllowUpdate) aturanText = "Mode Update (SDM bisa mengganti/menimpa pilihan)";

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>Laporan Rekapitulasi Data - ${activeVote.title}</title>
        <style>
          /* CSS Styling Khusus Ekspor PDF - Dibuat panjang dan terperinci untuk kualitas tinggi */
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            padding: 30px; 
            color: #1e293b; 
            background: #fff; 
            line-height: 1.5;
          }
          .header { 
            text-align: center; 
            border-bottom: 3px double #0f172a; 
            padding-bottom: 15px; 
            margin-bottom: 20px; 
          }
          .title { 
            font-size: 20px; 
            font-weight: 900; 
            color: #0f172a; 
            text-transform: uppercase; 
            letter-spacing: 0.5px; 
          }
          .subtitle { 
            font-size: 14px; 
            font-weight: 700; 
            color: #2563eb; 
            margin-top: 5px; 
          }
          .meta-container { 
            background: #f8fafc; 
            border: 1px solid #e2e8f0; 
            border-radius: 12px; 
            padding: 15px; 
            margin-bottom: 25px; 
            font-size: 12px; 
            display: flex; 
            justify-content: space-between; 
          }
          .meta-item { 
            line-height: 1.8; 
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 25px; 
            font-size: 12px; 
          }
          th { 
            background-color: #0f172a; 
            color: #ffffff; 
            font-weight: 700; 
            padding: 10px 12px; 
            text-align: left; 
            text-transform: uppercase; 
            font-size: 11px; 
          }
          td { 
            border-bottom: 1px solid #e2e8f0; 
            padding: 10px 12px; 
            vertical-align: top;
          }
          tr:nth-child(even) { 
            background-color: #f8fafc; 
          }
          .badge-winner { 
            background-color: #dbeafe; 
            color: #1d4ed8; 
            font-weight: bold; 
            padding: 2px 8px; 
            border-radius: 4px; 
            font-size: 10px; 
            display: inline-block; 
            margin-left: 6px; 
          }
          .section-title { 
            font-size: 13px; 
            font-weight: 800; 
            color: #0f172a; 
            margin-bottom: 12px; 
            border-left: 4px solid #2563eb; 
            padding-left: 8px; 
            text-transform: uppercase; 
          }
          .voter-tag { 
            display: inline-block; 
            background: #f1f5f9; 
            border: 1px solid #cbd5e1; 
            color: #334155; 
            font-size: 10px; 
            font-weight: 600; 
            padding: 2px 6px; 
            border-radius: 4px; 
            margin: 2px; 
          }
          .voter-tag.multi {
            background: #dbeafe;
            border-color: #93c5fd;
            color: #1e3a8a;
          }
          .voter-tag.admin-override {
            background: #fef3c7;
            border-color: #fcd34d;
            color: #92400e;
          }
          .footer { 
            margin-top: 40px; 
            font-size: 11px; 
            text-align: right; 
            color: #64748b; 
            border-top: 1px solid #e2e8f0; 
            padding-top: 15px; 
          }
          .btn-print {
            padding: 10px 20px; 
            background: #2563eb; 
            color: white; 
            border: none; 
            border-radius: 8px; 
            font-weight: bold; 
            cursor: pointer; 
            font-size: 13px; 
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
          }
          @media print {
            .no-print { display: none !important; }
            body { padding: 0; background: white; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: right;">
          <button onclick="window.print()" class="btn-print">
            🖨️ Cetak / Simpan PDF
          </button>
        </div>

        <div class="header">
          <div class="title">LAPORAN REKAPITULASI HASIL DATA</div>
          <div class="subtitle">${activeVote.title}</div>
        </div>

        <div class="meta-container">
          <div class="meta-item">
            <strong>Tanggal Pembuatan:</strong> ${formatDateId(activeVote.createdAt)}<br/>
            <strong>Tipe Pemilihan:</strong> ${activeVote.isMulti ? 'Multi Pilihan (Bisa pilih beberapa opsi)' : 'Tunggal (Hanya satu pilihan)'}<br/>
            <strong>Aturan Sistem:</strong> ${aturanText}
          </div>
          <div class="meta-item" style="text-align: right;">
            <strong>Total Target Partisipan:</strong> ${voters.length} SDM<br/>
            <strong>Total Respon Masuk (Data):</strong> ${votesArray.length} Data (Dari ${sudahVoteNames.length} SDM)<br/>
            <strong>Belum Merespon:</strong> ${belumVoteNames.length} SDM
          </div>
        </div>

        <div class="section-title">1. HASIL REKAPITULASI OPSI</div>
        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">NO</th>
              <th>OPSI PILIHAN</th>
              <th style="width: 110px; text-align: center;">JUMLAH INPUT</th>
              <th style="width: 100px; text-align: center;">PERSENTASE</th>
              <th>DAFTAR NAMA PENGISI (KUANTITAS)</th>
            </tr>
          </thead>
          <tbody>
            ${sortedOptions.map((opt, i) => {
              const count = optionData[opt].count;
              const votersMap = optionData[opt].votersMap;
              const pct = totalSuaraMasuk === 0 ? 0 : Math.round((count / totalSuaraMasuk) * 100);
              const isWinner = i === 0 && count > 0;
              
              // Memformat daftar nama dengan akumulasi kuantitas
              const votersListHtml = Object.entries(votersMap).map(([name, qty]) => {
                const isAdmin = name.includes('Diinput Admin');
                const isMulti = qty > 1;
                let classes = 'voter-tag';
                if (isAdmin) classes += ' admin-override';
                else if (isMulti) classes += ' multi';
                
                return `<span class="${classes}">${name}${qty > 1 ? ` (${qty}x)` : ''}</span>`;
              }).join('');

              return `
                <tr>
                  <td style="text-align: center; font-weight: bold;">${i + 1}</td>
                  <td>
                    <strong>${opt}</strong>${isWinner ? '<span class="badge-winner">👑 Terbanyak</span>' : ''}
                  </td>
                  <td style="text-align: center; font-weight: bold; color: #2563eb;">${count}</td>
                  <td style="text-align: center; font-weight: bold;">${pct}%</td>
                  <td>
                    ${Object.keys(votersMap).length > 0 
                      ? votersListHtml 
                      : '<em style="color: #94a3b8;">Belum ada data masuk pada opsi ini</em>'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="section-title">2. DAFTAR SDM BELUM MERESPON (${belumVoteNames.length} SDM)</div>
        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">NO</th>
              <th>NAMA SDM</th>
              <th style="width: 150px; text-align: center;">STATUS</th>
            </tr>
          </thead>
          <tbody>
            ${belumVoteNames.length === 0 
              ? '<tr><td colspan="3" style="text-align: center; color: #16a34a; font-weight: bold;">Seluruh SDM telah merespon!</td></tr>'
              : belumVoteNames.map((name, idx) => `
                <tr>
                  <td style="text-align: center;">${idx + 1}</td>
                  <td><strong>${name}</strong></td>
                  <td style="text-align: center; color: #dc2626; font-weight: bold;">Belum Memilih</td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>

        <div class="footer">
          Laporan Resmi - Dicetak Otomatis pada ${new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 600);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // --------------------------------------------------------------------------
  // FUNGSI UTAMA: PENANGANAN SUBMIT DATA KE FIREBASE
  // --------------------------------------------------------------------------
  /**
   * Menangani pengiriman data form suara
   * Melakukan validasi deadline, status terkunci, mode perbarui, mode berulang,
   * dan mencatat flag "Admin Override" jika form disubmit oleh Admin setelah deadline.
   */
  const handleCastVote = async (e) => {
    e.preventDefault();
    if (!db || !voteEmp || selectedOptions.length === 0) { 
      showToast('error'); 
      return; 
    }

    let isAdminOverrideFlag = false;

    // VALIDASI WAKTU / DEADLINE
    if (activeVote.deadline) {
      const targetTime = new Date(`${activeVote.deadline}T23:59:59`).getTime();
      const currentTime = new Date().getTime();
      
      if (currentTime > targetTime) {
        if (!isAdminLogged) {
          alert("Maaf, waktu untuk pengisian ini sudah habis! Sistem telah ditutup secara otomatis.");
          return;
        } else {
          // Jika Admin yang login, izinkan dan berikan flag Override
          isAdminOverrideFlag = true;
        }
      }
    }

    setIsSyncing(true);
    
    try {
      // MENDAPATKAN ATURAN SYSTEM
      const isAllowMultiple = activeVote.allowMultipleSubmissions || activeVote.allowMultiple;
      const isAllowUpdate = activeVote.allowUpdate;
      
      // LOGIKA PEMBENTUKAN KUNCI (KEY) FIREBASE UNTUK PENYIMPANAN
      let safeKey = '';
      
      if (isAllowMultiple) {
        // Mode 1: Rekapan Berulang. Setiap submit adalah data baru.
        // Contoh Output: Raihan 2 Baju L
        safeKey = `${encodeSafeKey(voteEmp)}_${Date.now()}`;
      } else if (isAllowUpdate) {
        // Mode 2: Perbarui Data. 1 Orang = 1 Data. Menimpa yang lama.
        safeKey = encodeSafeKey(voteEmp);
      } else {
        // Mode 3: Kunci Mati. 1 Orang = 1 Data. Dilarang Perbarui.
        // Pengecekan dilakukan di UI, tapi ini sebagai fallback.
        safeKey = encodeSafeKey(voteEmp);
      }

      // PAYLOAD DATA UNTUK DISIMPAN
      const payload = {
        name: voteEmp,
        options: selectedOptions,
        votedAt: new Date().toISOString(),
        isAdminOverride: isAdminOverrideFlag
      };

      // PROSES SIMPAN KE DATABASE
      await db.ref(`artifacts/${APP_ID}/public/data/votings/${activeVote.id}/votes/${safeKey}`).set(payload);
      
      showToast('success');
      setVoteEmp(''); 
      setSelectedOptions([]); 
      setActiveTab('statistik'); // Otomatis pindah ke tab statistik setelah sukses
      
    } catch (err) { 
      showToast('error'); 
      console.error("Error submitting vote:", err);
    }
    
    setIsSyncing(false);
  };

  /**
   * Menangani pemilihan opsi (Toggle checked/unchecked)
   * Beradaptasi dengan mode isMulti (Multiple / Single)
   */
  const toggleOption = (opt) => {
    if (!activeVote.isMulti) { 
      // Jika mode single, timpa array dengan 1 opsi saja
      setSelectedOptions([opt]); 
      return; 
    }
    
    // Jika mode multi, tambahkan atau hapus dari array
    if (selectedOptions.includes(opt)) {
      setSelectedOptions(selectedOptions.filter(o => o !== opt));
    } else {
      setSelectedOptions([...selectedOptions, opt]);
    }
  };

  // --------------------------------------------------------------------------
  // RENDER: LIST UTAMA VOTING (JIKA BELUM ADA YANG DIPILIH)
  // --------------------------------------------------------------------------
  if (!selectedVoteId) {
    return (
      <div className="animate-slide-up space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-black text-midnight tracking-tight">Kotak Rekapan & Suara</h3>
            <p className="text-slate-500 text-sm font-bold mt-0.5">Pemilihan & Pendataan Bersama</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {(votings || []).length === 0 && (
            <div className="bg-white rounded-3xl shadow-soft border border-slate-100 text-center py-12">
              <i className="fa-solid fa-check-to-slot text-5xl mb-4 text-slate-300 block"></i>
              <p className="font-black text-slate-500">Belum ada data aktif yang tersedia untuk direkap.</p>
            </div>
          )}
          
          {(votings || []).map((v) => {
            const totalVoters = v.voters ? v.voters.length : 0;
            const totalVotes = v.votes ? Object.keys(v.votes).length : 0;
            const isExpired = v.deadline && new Date().getTime() > new Date(`${v.deadline}T23:59:59`).getTime();
            
            const allowMult = v.allowMultipleSubmissions || v.allowMultiple;
            const allowUpd = v.allowUpdate;

            return (
              <div 
                key={v.id} 
                className="bg-white rounded-3xl shadow-soft border border-slate-100 relative overflow-hidden transition-all duration-300 hover:shadow-md hover:border-blue-300 group"
              >
                <button 
                  type="button" 
                  onClick={() => { 
                    setSelectedVoteId(v.id); 
                    setActiveTab('beri_suara'); 
                  }} 
                  className="w-full p-5 text-left outline-none cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <h5 className="font-black text-midnight text-lg w-3/4 group-hover:text-status-selesai transition-colors">
                      {v.title}
                    </h5>
                    
                    <div className="flex flex-col items-end gap-1">
                      <span className="bg-blue-50 text-status-selesai text-[10px] font-black px-2 py-0.5 rounded border border-blue-100 uppercase">
                        {v.isMulti ? 'Multi Opsi' : 'Single Opsi'}
                      </span>
                      
                      {allowMult ? (
                        <span className="bg-emerald-50 text-emerald-600 text-[9px] font-black px-2 py-0.5 rounded border border-emerald-100 uppercase">Input Berulang</span>
                      ) : allowUpd ? (
                        <span className="bg-amber-50 text-amber-600 text-[9px] font-black px-2 py-0.5 rounded border border-amber-100 uppercase">Bisa Perbarui</span>
                      ) : (
                        <span className="bg-slate-100 text-slate-600 text-[9px] font-black px-2 py-0.5 rounded border border-slate-200 uppercase">Kunci Mati</span>
                      )}
                      
                      {isExpired && (
                        <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase shadow-sm">Ditutup</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1 rounded-md">
                      <i className="fa-solid fa-calendar-day mr-1 text-slate-400"></i> {formatDateId(v.createdAt)}
                    </div>
                    {v.deadline && <LiveCountdown deadline={v.deadline} />}
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1.5 overflow-hidden">
                    <div 
                      className="bg-status-selesai h-1.5 rounded-full transition-all duration-1000 ease-out" 
                      style={{ width: `${totalVoters === 0 ? 0 : Math.min(100, (totalVotes / totalVoters) * 100)}%` }}
                    ></div>
                  </div>
                  
                  <div className="text-[10px] font-black text-slate-400 flex justify-between">
                    <span>DATA INPUT MASUK</span> 
                    <span className="text-midnight">{totalVotes} Input dari {totalVoters} SDM</span>
                  </div>
                </button>

                {isAdminLogged && (
                  <div className="px-5 pb-5 pt-0">
                    <button 
                      type="button"
                      onClick={(e) => handleShareVote(e, v)}
                      className="w-full bg-blue-50 text-status-selesai border border-blue-200 font-black py-2.5 rounded-xl text-[10px] sm:text-xs hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 outline-none cursor-pointer shadow-sm"
                    >
                      <i className="fa-solid fa-share-nodes"></i> Salin Link Akses Langsung
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

  // --------------------------------------------------------------------------
  // PERSIAPAN DATA UNTUK TAMPILAN DETAIL (SAAT ADA VOTING YANG DIPILIH)
  // --------------------------------------------------------------------------
  const votesObj = activeVote.votes || {};
  const votesArray = Object.values(votesObj);
  
  // Menggunakan Set agar yang input berkali-kali tidak dihitung ganda pada list "Sudah Vote"
  const uniqueVoterNames = new Set(votesArray.map(v => v.name));
  const sudahVoteNames = [...uniqueVoterNames].sort((a,b) => a.localeCompare(b));
  
  const voters = activeVote.voters || [];
  const belumVoteNames = voters.filter(v => !sudahVoteNames.includes(v)).sort((a,b) => a.localeCompare(b));

  const optionsList = activeVote.options || [];
  const optionData = {};
  
  // Inisialisasi tempat penyimpanan sementara untuk perhitungan UI Statistik
  optionsList.forEach(o => {
    optionData[o] = { count: 0, votersMap: {} };
  });

  let totalSuaraMasuk = 0;
  
  // Perhitungan Data Akumulasi (Misal: Raihan milih baju L sebanyak 2x)
  votesArray.forEach(vote => {
     if (vote.options && Array.isArray(vote.options)) {
       vote.options.forEach(p => { 
         if (optionData[p]) {
           optionData[p].count++; 
           
           let displayName = vote.name;
           if (vote.isAdminOverride) displayName += " 🛡️(Admin)";
           
           if (!optionData[p].votersMap[displayName]) {
             optionData[p].votersMap[displayName] = 0;
           }
           optionData[p].votersMap[displayName]++;
           
           totalSuaraMasuk++; 
         }
       });
     }
  });

  const sortedOptions = [...optionsList].sort((a, b) => optionData[b].count - optionData[a].count);
  
  // Status dan Aturan
  const isExpired = activeVote.deadline && new Date().getTime() > new Date(`${activeVote.deadline}T23:59:59`).getTime();
  const isAllowMultiple = activeVote.allowMultipleSubmissions || activeVote.allowMultiple;
  const isAllowUpdate = activeVote.allowUpdate;

  // --------------------------------------------------------------------------
  // RENDER: TAMPILAN DETAIL VOTING (TABS, STATISTIK, LOG, FORM)
  // --------------------------------------------------------------------------
  return (
    <div className="animate-slide-up space-y-4 relative pb-10">
      
      {/* KOTAK NOTIFIKASI */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] animate-slide-up">
          <div className={`px-5 py-2 rounded-full shadow-lg font-black text-xs flex items-center gap-2 text-white ${toast === 'success' ? 'bg-status-selesai' : 'bg-red-500'}`}>
            <i className={`fa-solid ${toast === 'success' ? 'fa-check-circle' : 'fa-xmark-circle'} text-lg`}></i> 
            {toast === 'success' ? 'BERHASIL MEMPROSES DATA' : 'GAGAL MEMPROSES DATA'}
          </div>
        </div>
      )}

      {/* HEADER NAVIGASI & KONTROL EKSKLUSIF ADMIN */}
      <div className="flex flex-wrap gap-2 justify-between items-center mb-2">
        <button 
          type="button" 
          onClick={handleBack} 
          className="bg-white text-midnight border border-slate-200 shadow-sm rounded-full font-bold px-4 py-2 text-xs flex items-center gap-2 hover:bg-slate-50 transition-colors outline-none cursor-pointer"
        >
          <i className="fa-solid fa-arrow-left-long text-status-selesai"></i> Kembali
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          {isAdminLogged && (
            <>
              <button 
                type="button"
                onClick={handleExportPDF}
                className="bg-red-600 text-white shadow-md rounded-full font-black px-3.5 py-2 text-[10px] sm:text-xs flex items-center gap-1.5 hover:bg-red-700 transition-all outline-none cursor-pointer"
              >
                <i className="fa-solid fa-file-pdf"></i> Ekspor PDF & Cetak
              </button>
              
              <button 
                type="button"
                onClick={(e) => handleShareVote(e, activeVote)} 
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md rounded-full font-black px-3.5 py-2 text-[10px] sm:text-xs flex items-center gap-1.5 hover:scale-95 transition-transform outline-none cursor-pointer"
              >
                <i className="fa-solid fa-share-nodes"></i> Share Link
              </button>
            </>
          )}
        </div>
      </div>

      {/* PANEL PENGATURAN PENGUBAH ATURAN SECARA LIVE (KHUSUS ADMIN) */}
      {isAdminLogged && (
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-md border border-slate-700 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-[11px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-2">
              <i className="fa-solid fa-sliders text-amber-400"></i> Pengaturan Aturan Sistem (Admin Live Control)
            </span>
            <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-500/30">
              Realtime Update via Firebase
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mt-3">
            
            {/* TOGGLE 1: MULTI OPSI (BISA PILIH LEBIH DARI SATU) */}
            <button 
              type="button"
              onClick={toggleIsMulti}
              className={`p-3 rounded-xl border font-bold flex flex-col items-center text-center justify-center transition-all cursor-pointer ${activeVote.isMulti ? 'bg-blue-600/30 border-blue-500 text-blue-200' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
            >
              <i className={`fa-solid ${activeVote.isMulti ? 'fa-check-double text-blue-400' : 'fa-check text-slate-500'} text-xl mb-1.5`}></i>
              <div className="font-black text-[10px] uppercase">Multi Opsi Pilihan</div>
              <div className="text-[9px] opacity-80 mt-1 leading-tight">
                {activeVote.isMulti ? 'Aktif (Checkboxes)' : 'Mati (Radio Button)'}
              </div>
            </button>

            {/* TOGGLE 2: SUBMIT BERULANG (AKUMULASI) */}
            <button 
              type="button"
              onClick={toggleAllowMultiple}
              className={`p-3 rounded-xl border font-bold flex flex-col items-center text-center justify-center transition-all cursor-pointer ${isAllowMultiple ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
            >
              <i className={`fa-solid ${isAllowMultiple ? 'fa-layer-group text-emerald-400' : 'fa-ban text-slate-500'} text-xl mb-1.5`}></i>
              <div className="font-black text-[10px] uppercase">Input Akumulasi</div>
              <div className="text-[9px] opacity-80 mt-1 leading-tight">
                {isAllowMultiple ? 'Aktif (Data Bertambah/Menumpuk)' : 'Mati (Hanya 1 Data per SDM)'}
              </div>
            </button>

            {/* TOGGLE 3: PERBARUI DATA (MENIMPA DATA LAMA) */}
            <button 
              type="button"
              onClick={toggleAllowUpdate}
              disabled={isAllowMultiple} // Jika Input Berulang aktif, Update otomatis tak relevan
              className={`p-3 rounded-xl border font-bold flex flex-col items-center text-center justify-center transition-all cursor-pointer ${isAllowMultiple ? 'opacity-40 cursor-not-allowed bg-slate-800 border-slate-700' : isAllowUpdate ? 'bg-amber-600/30 border-amber-500 text-amber-200' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
            >
              <i className={`fa-solid ${isAllowUpdate ? 'fa-rotate-right text-amber-400' : 'fa-lock text-slate-500'} text-xl mb-1.5`}></i>
              <div className="font-black text-[10px] uppercase">Bisa Perbarui Data</div>
              <div className="text-[9px] opacity-80 mt-1 leading-tight">
                {isAllowMultiple ? 'Nonaktif jika Input Akumulasi Aktif' : isAllowUpdate ? 'Aktif (Bisa Mengganti Pilihan)' : 'Mati (KUNCI MATI)'}
              </div>
            </button>

          </div>
        </div>
      )}

      {/* BANNER DETAIL REKAPAN UTAMA */}
      <div className="bg-gradient-to-br from-midnight to-midnight-light rounded-3xl p-6 text-white relative shadow-glossy overflow-hidden">
        <i className="fa-solid fa-list-check absolute -right-4 -bottom-4 text-7xl opacity-10"></i>
        <div className="flex justify-between items-start mb-2 relative z-10 gap-2">
          <h3 className="text-2xl font-black leading-tight flex-1">{activeVote.title}</h3>
          {activeVote.deadline && <LiveCountdown deadline={activeVote.deadline} />}
        </div>
        
        <div className="flex flex-wrap gap-2 mt-3 relative z-10">
          <span className="text-white/90 font-extrabold text-[10px] uppercase tracking-wider bg-white/10 px-3 py-1 rounded-full border border-white/20">
            <i className="fa-solid fa-circle-info text-sky-400 mr-1.5"></i> 
            {activeVote.isMulti ? 'Bisa Pilih Banyak Opsi' : 'Hanya Boleh Pilih Satu Opsi'}
          </span>
          <span className="text-white/90 font-extrabold text-[10px] uppercase tracking-wider bg-white/10 px-3 py-1 rounded-full border border-white/20">
            <i className="fa-solid fa-gear text-emerald-400 mr-1.5"></i> 
            {isAllowMultiple ? 'Mode Terakumulasi (Bisa Berulang)' : isAllowUpdate ? 'Boleh Memperbarui Pilihan' : 'Kunci Mati (Hanya 1x)'}
          </span>
        </div>
      </div>

      {/* TABS MENU (NAVIGASI 4 TOMBOL) */}
      <div className="flex bg-white rounded-xl shadow-sm border border-slate-100 p-1.5 sticky top-20 z-20 overflow-x-auto hide-scrollbar">
         <button 
           type="button" 
           onClick={()=>setActiveTab('statistik')} 
           className={`flex-1 min-w-[80px] py-2.5 px-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all duration-300 outline-none cursor-pointer ${activeTab==='statistik' ? 'bg-midnight text-white shadow-md transform scale-[1.02]' : 'text-slate-500 hover:bg-slate-50'}`}
         >
           Statistik
         </button>
         
         <button 
           type="button" 
           onClick={()=>setActiveTab('sudah')} 
           className={`flex-1 min-w-[80px] py-2.5 px-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all duration-300 outline-none cursor-pointer ${activeTab==='sudah' ? 'bg-midnight text-white shadow-md transform scale-[1.02]' : 'text-slate-500 hover:bg-slate-50'}`}
         >
           Log Masuk ({votesArray.length})
         </button>
         
         <button 
           type="button" 
           onClick={()=>setActiveTab('belum')} 
           className={`flex-1 min-w-[80px] py-2.5 px-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all duration-300 outline-none cursor-pointer ${activeTab==='belum' ? 'bg-midnight text-white shadow-md transform scale-[1.02]' : 'text-slate-500 hover:bg-slate-50'}`}
         >
           Belum ({belumVoteNames.length})
         </button>
         
         <button 
           type="button" 
           onClick={()=>setActiveTab('beri_suara')} 
           className={`flex-[1.2] min-w-[100px] py-2.5 px-2 text-[10px] sm:text-xs font-black rounded-lg transition-all duration-300 outline-none cursor-pointer flex justify-center items-center gap-1.5 ${activeTab==='beri_suara' ? 'bg-status-selesai text-white shadow-md transform scale-[1.02]' : 'text-status-selesai border border-blue-100 bg-blue-50 hover:bg-blue-100'}`}
         >
           <i className="fa-solid fa-paper-plane"></i> FORM INPUT
         </button>
      </div>

      {/* ----------------------------------------------------------------------
          TAB: STATISTIK (DENGAN AKUMULASI)
          ---------------------------------------------------------------------- */}
      {activeTab === 'statistik' && (
        <div className="bg-white rounded-3xl shadow-soft border border-slate-100 p-5 sm:p-6 space-y-6 animate-fade-in">
           <div className="flex justify-between items-center border-b border-slate-100 pb-3">
             <h4 className="font-black text-midnight text-sm uppercase tracking-wider flex items-center gap-2">
               <i className="fa-solid fa-chart-bar text-status-selesai"></i> Rekapitulasi Kuantitas Opsi
             </h4>
             {isAdminLogged && (
               <button 
                 type="button" 
                 onClick={handleExportPDF}
                 className="bg-red-50 text-red-600 border border-red-200 text-[10px] font-black px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1 cursor-pointer"
               >
                 <i className="fa-solid fa-file-pdf"></i> Unduh PDF Laporan
               </button>
             )}
           </div>
           
           <div className="space-y-5">
             {sortedOptions.map((opt, i) => {
                const count = optionData[opt].count;
                const votersMap = optionData[opt].votersMap;
                const pct = totalSuaraMasuk === 0 ? 0 : Math.round((count / totalSuaraMasuk) * 100);
                const isWinner = i === 0 && count > 0;

                return (
                  <div key={i} className={`relative p-4 rounded-2xl border transition-all duration-300 hover:shadow-md ${isWinner ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                     
                     <div className="flex justify-between items-end mb-3 gap-4">
                        <div className="flex-1">
                          <h5 className={`font-black text-base sm:text-lg leading-tight mb-1 ${isWinner ? 'text-status-selesai' : 'text-midnight'}`}>
                            {isWinner && <i className="fa-solid fa-crown text-yellow-500 mr-2 drop-shadow-sm"></i>}
                            {opt}
                          </h5>
                          <div className="text-[10px] sm:text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded inline-block shadow-sm">
                            <span className="text-midnight font-black">{count}</span> Total Terkumpul
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-2xl sm:text-3xl font-black ${isWinner ? 'text-status-selesai' : 'text-slate-300'}`}>
                            {pct}%
                          </span>
                        </div>
                     </div>

                     <div className="w-full bg-slate-200 rounded-full h-2.5 mb-4 overflow-hidden shadow-inner">
                        <div 
                          className={`${isWinner ? 'bg-gradient-to-r from-blue-500 to-status-selesai' : 'bg-slate-400'} h-2.5 rounded-full transition-all duration-1000 ease-out`} 
                          style={{ width: `${pct}%` }}
                        ></div>
                     </div>

                     {Object.keys(votersMap).length > 0 && (
                       <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                         <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                           <i className="fa-solid fa-users text-slate-300"></i> Daftar Nama Pengisi (Kuantitas):
                         </div>
                         <div className="flex flex-wrap gap-1.5">
                           {Object.entries(votersMap).map(([voterName, qty], vIdx) => {
                             // Penandaan khusus untuk UI jika Admin Override atau Multiple Input
                             const isAdmin = voterName.includes('🛡️');
                             const isMulti = qty > 1;
                             let bgClass = "bg-slate-50 border-slate-200 text-midnight";
                             
                             if (isAdmin) bgClass = "bg-amber-50 border-amber-200 text-amber-800";
                             else if (isMulti) bgClass = "bg-blue-50 border-blue-200 text-status-selesai";

                             return (
                               <span key={vIdx} className={`${bgClass} border text-[10px] font-bold px-2.5 py-1 rounded-md shadow-sm`}>
                                 {voterName} {qty > 1 && <span className="font-black bg-white/50 px-1 rounded ml-1">({qty}x)</span>}
                               </span>
                             )
                           })}
                         </div>
                       </div>
                     )}
                  </div>
                )
             })}
           </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------
          TAB: LOG DATA MASUK
          ---------------------------------------------------------------------- */}
      {activeTab === 'sudah' && (
        <div className="bg-white rounded-3xl shadow-soft border border-slate-100 p-5 sm:p-6 space-y-4 animate-fade-in">
           <h4 className="font-black text-midnight text-sm uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
             <i className="fa-solid fa-inbox text-status-selesai"></i> Log Semua Data Masuk ({votesArray.length} Respon)
           </h4>

           {votesArray.length === 0 && (
             <div className="text-center text-xs font-bold text-slate-400 py-10 bg-slate-50 rounded-2xl border border-slate-100">
               <i className="fa-solid fa-envelope-open text-4xl mb-3 text-slate-300 block"></i>
               Belum ada rekapan data yang diinput oleh sistem.
             </div>
           )}

           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
             {votesArray.map((voteData, index) => (
               <div key={index} className={`flex flex-col bg-slate-50 p-4 rounded-2xl border shadow-sm transition-all hover:shadow-md ${voteData.isAdminOverride ? 'border-amber-200 hover:border-amber-400' : 'border-slate-200 hover:border-blue-200'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-black text-midnight text-sm flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] shadow-sm ${voteData.isAdminOverride ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-status-selesai'}`}>
                        <i className={`fa-solid ${voteData.isAdminOverride ? 'fa-user-shield' : 'fa-check'}`}></i>
                      </div>
                      {voteData.name}
                      {voteData.isAdminOverride && <span className="text-[8px] bg-amber-500 text-white px-1.5 py-0.5 rounded ml-1">Admin Input</span>}
                    </span>
                    {voteData.votedAt && (
                      <span className="text-[9px] font-bold text-slate-400">
                        {new Date(voteData.votedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
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

      {/* ----------------------------------------------------------------------
          TAB: BELUM MENGISI
          ---------------------------------------------------------------------- */}
      {activeTab === 'belum' && (
        <div className="bg-white rounded-3xl shadow-soft border border-slate-100 p-5 sm:p-6 space-y-4 animate-fade-in">
           <h4 className="font-black text-midnight text-sm uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
             <i className="fa-solid fa-hourglass-half text-orange-500"></i> SDM Belum Memberikan Respon ({belumVoteNames.length})
           </h4>
           
           {belumVoteNames.length === 0 && (
             <div className="text-center text-xs font-bold text-slate-400 py-10 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600 shadow-sm">
               <i className="fa-solid fa-check-double text-4xl mb-3 block"></i>
               Luar biasa! Seluruh target SDM telah merespon / diinput datanya.
             </div>
           )}
           
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
             {belumVoteNames.map(name => (
               <div key={name} className="bg-orange-50/50 p-3.5 rounded-2xl border border-orange-100 font-bold text-orange-800 text-xs flex items-center justify-between gap-2 shadow-sm transition-transform hover:scale-[1.02]">
                  <span className="flex items-center gap-2">
                    <i className="fa-solid fa-circle-exclamation text-orange-500 animate-pulse text-lg"></i> {name}
                  </span>
                  
                  {isAdminLogged && (
                    <button 
                      type="button"
                      onClick={() => { 
                        setVoteEmp(name); 
                        setActiveTab('beri_suara'); 
                      }}
                      className="bg-orange-500 text-white font-black text-[9px] px-2 py-1 rounded hover:bg-orange-600 transition-colors cursor-pointer shadow-sm"
                    >
                      Bantu Input
                    </button>
                  )}
               </div>
             ))}
           </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------
          TAB: FORM INPUT
          ---------------------------------------------------------------------- */}
      {activeTab === 'beri_suara' && (
        <form onSubmit={handleCastVote} className="bg-white rounded-3xl shadow-soft border border-slate-100 p-5 sm:p-6 space-y-6 animate-fade-in">
           <div className="text-center mb-6">
             <h4 className="font-black text-midnight text-lg tracking-tight">Formulir Rekapan & Pendataan Otomatis</h4>
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
               {isAllowMultiple ? 'Mode Akumulasi Aktif (Bisa Berulang)' : isAllowUpdate ? 'Mode Perbarui Aktif' : 'Sistem Otomatis Terkunci Saat Deadline & Hanya 1x Pilihan'}
             </p>
           </div>

           {/* HANDLING KONDISI WAKTU HABIS */}
           {isExpired && !isAdminLogged ? (
             <div className="p-6 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-center font-black text-sm shadow-sm flex flex-col items-center justify-center gap-3">
               <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-500 text-3xl shadow-inner"><i className="fa-solid fa-lock"></i></div>
               MAAF, WAKTU PENGISIAN TELAH HABIS!
               <div className="text-xs font-normal opacity-80 mt-1">Sistem otomatis menutup form penerimaan data.</div>
             </div>
           ) : (
             <>
               {isExpired && isAdminLogged && (
                 <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm animate-pulse">
                   <i className="fa-solid fa-user-shield text-amber-600 text-base"></i>
                   <span><strong>Mode Admin Override:</strong> Waktu pengisian telah habis, namun karena Anda memiliki hak akses Admin, Anda dapat terus memasukkan data (dengan log penanda khusus).</span>
                 </div>
               )}

               {/* PEMILIHAN IDENTITAS */}
               <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm transition-all hover:border-blue-200">
                  <label className="block text-[10px] font-black text-midnight mb-2 uppercase tracking-wider flex items-center gap-2">
                    <i className="fa-solid fa-user-tag text-status-selesai"></i> Pilih Identitas SDM / Karyawan
                  </label>
                  <select 
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-midnight outline-none cursor-pointer shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" 
                    value={voteEmp} 
                    onChange={(e) => setVoteEmp(e.target.value)}
                  >
                    <option value="">-- Ketuk Untuk Memilih Nama SDM --</option>
                    {voters.map(v => {
                      const isAlreadyVoted = sudahVoteNames.includes(v);
                      
                      // LOGIKA PENGUNCIAN PILIHAN IDENTITAS
                      // Terkunci HANYA JIKA: SDM sudah vote + TIDAK BOLEH berulang + TIDAK BOLEH update + BUKAN Admin
                      const isDisabled = isAlreadyVoted && !isAllowMultiple && !isAllowUpdate && !isAdminLogged;

                      // LABEL TAMBAHAN PADA SELECT OPTION
                      let labelExtra = '';
                      if (isAlreadyVoted) {
                        if (isAllowMultiple) {
                          labelExtra = '(Bisa Akumulasi Data)';
                        } else if (isAllowUpdate) {
                          labelExtra = '(Bisa Update Pilihan)';
                        } else if (isAdminLogged) {
                          labelExtra = '(Akses Override Admin)';
                        } else {
                          labelExtra = '(Sudah Mengisi - Terkunci)';
                        }
                      }

                      return (
                        <option key={v} value={v} disabled={isDisabled}>
                          {v} {labelExtra}
                        </option>
                      );
                    })}
                  </select>
               </div>
               
               {/* PEMILIHAN OPSI (HANYA MUNCUL JIKA NAMA SUDAH DIPILIH) */}
               {voteEmp && (
                 <div className="animate-slide-up bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm transition-all hover:border-blue-200">
                    <label className="block text-[10px] font-black text-midnight mb-3 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <i className="fa-solid fa-list-check text-status-selesai"></i> Tentukan Pilihan Data
                      </span>
                      <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        {activeVote.isMulti ? 'Bisa Pilih Beberapa' : 'Pilih Salah Satu'}
                      </span>
                    </label>

                    <div className="space-y-3">
                       {(activeVote.options || []).map(opt => {
                         const isSelected = selectedOptions.includes(opt);
                         return (
                           <button 
                             type="button" 
                             key={opt} 
                             onClick={() => toggleOption(opt)} 
                             className={`w-full flex items-center justify-between p-4 rounded-xl border-2 text-sm font-black transition-all duration-300 outline-none cursor-pointer ${isSelected ? 'bg-blue-50 border-status-selesai text-status-selesai shadow-md scale-[1.01]' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                           >
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
               
               {/* TOMBOL SUBMIT */}
               <button 
                 type="submit" 
                 disabled={isSyncing || !voteEmp || selectedOptions.length === 0} 
                 className={`w-full text-white font-black py-4.5 rounded-xl shadow-glossy transition-all text-sm outline-none mt-4 cursor-pointer flex justify-center items-center gap-2 ${(!voteEmp || selectedOptions.length === 0 || isSyncing) ? 'bg-slate-400 opacity-70 cursor-not-allowed' : 'bg-gradient-to-r from-midnight to-midnight-light hover:opacity-90 active:scale-95'}`}
               >
                  {isSyncing ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin"></i> Menyimpan Data...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane text-status-selesai"></i> 
                      {isAllowMultiple && sudahVoteNames.includes(voteEmp) 
                        ? 'Tambah Data Akumulasi (Lagi)' 
                        : isAllowUpdate && sudahVoteNames.includes(voteEmp) 
                          ? 'Perbarui Data Tersimpan' 
                          : 'Kirim Rekapan Data Baru'}
                    </>
                  )}
               </button>
             </>
           )}
        </form>
      )}
    </div>
  );
};

export default VotingMenu;
