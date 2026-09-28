// ============================================================================
// NAMA FILE: VotingMenu.jsx
// DESKRIPSI: Modul Rekapan, Pendataan, dan Voting Terintegrasi Realtime
// ARSITEKTUR: Enterprise React Component dengan Realtime Database & Audit Log
// SPESIFIKASI DUKUNGAN:
// - Multi-opsi (Checkbox) vs Single-opsi (Radio Button)
// - Mode Input Akumulasi Berulang (Terhitung Kuantitas)
// - Mode Perbarui Data (Overwrite Suara Lama)
// - Mode Kunci Mati (Strict Single Submission)
// - Admin Live Control Panel & Override System (Dengan Flag Audit Trail)
// - Ekspor Laporan PDF Kustom & Ekspor CSV Data Mentah
// - Matriks Silang Opsi vs SDM (Cross-Tabulation Matrix)
// - Generator Pesan Pengingat WhatsApp untuk SDM Belum Mengisi
// - Sistem Modal Konfirmasi, Pencarian, & Filter Realtime
// ============================================================================

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { formatDateId, encodeSafeKey } from '../../../utils/formatters';
import { APP_ID } from '../../../config/firebase';
import LiveCountdown from '../../common/LiveCountdown';

// ============================================================================
// CONSTANTS & KONFIGURASI PRESET
// ============================================================================
const TABS = {
  STATISTIK: 'statistik',
  LOG_MASUK: 'sudah',
  BELUM_MENGISI: 'belum',
  FORM_INPUT: 'beri_suara',
  MATRIKS: 'matriks',
  AUDIT_TRAIL: 'audit'
};

const MODE_TYPES = {
  ACCUMULATION: 'ACCUMULATION',
  UPDATE: 'UPDATE',
  LOCKED: 'LOCKED'
};

const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  INFO: 'info',
  WARNING: 'warning'
};

// ============================================================================
// HELPER UTILITIES & UTILITY FUNCTIONS
// ============================================================================

/**
 * Menghitung persentase suara secara presisi dengan pembulatan
 * @param {number} count - Jumlah suara opsi
 * @param {number} total - Total seluruh suara masuk
 * @returns {number} Persentase integer
 */
const calculatePercentage = (count, total) => {
  if (!total || total === 0) return 0;
  return Math.round((count / total) * 100);
};

/**
 * Memformat string timestamp ISO menjadi format tanggal & waktu Indonesia
 * @param {string|number} isoString - String ISO atau timestamp millisecond
 * @returns {string} String waktu terformat
 */
const formatIndonesianDateTime = (isoString) => {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    return date.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (err) {
    return String(isoString);
  }
};

/**
 * Membuat konten CSV mentah untuk diunduh sebagai berkas laporan
 * @param {Object} activeVote - Data voting aktif
 * @param {Array} votesArray - Array dari respon yang masuk
 * @returns {string} Text CSV terformat
 */
const generateCSVContent = (activeVote, votesArray) => {
  let csv = 'No,Nama SDM,Pilihan Opsi,Waktu Pengisian,Status Override Admin\n';
  votesArray.forEach((vote, idx) => {
    const optionsStr = vote.options ? `"${vote.options.join('; ')}"` : '""';
    const timeStr = vote.votedAt ? `"${formatIndonesianDateTime(vote.votedAt)}"` : '""';
    const overrideStr = vote.isAdminOverride ? 'Ya (Admin)' : 'Tidak (Mandiri)';
    csv += `${idx + 1},"${vote.name}",${optionsStr},${timeStr},"${overrideStr}"\n`;
  });
  return csv;
};

/**
 * Membuat draf teks pengingat WhatsApp untuk SDM yang belum mengisi
 * @param {string} voteTitle - Judul voting/pendataan
 * @param {Array} unvotedList - Daftar nama SDM yang belum mengisi
 * @returns {string} Text draf WA
 */
const generateWhatsAppReminder = (voteTitle, unvotedList) => {
  const names = unvotedList.map((n, i) => `${i + 1}. ${n}`).join('\n');
  return `*PENGINGAT PENDATAAN / VOTING*\n\n` +
    `Halo Rekan-rekan, mohon kesediaannya untuk segera mengisi pendataan:\n` +
    `📌 *${voteTitle}*\n\n` +
    `Daftar SDM yang belum memberikan respon (${unvotedList.length} Orang):\n` +
    `${names}\n\n` +
    `Silakan klik link akses yang telah dibagikan. Terima kasih atas kerja samanya!`;
};

// ============================================================================
// KOMPONEN SUB-UI: TOAST NOTIFICATION
// ============================================================================

/**
 * Komponen Toast untuk menampilkan notifikasi mengambang dengan tipe dinamis
 */
const ToastNotification = ({ toast, onClose }) => {
  if (!toast) return null;

  const bgColors = {
    [TOAST_TYPES.SUCCESS]: 'bg-emerald-600 border-emerald-500 text-white',
    [TOAST_TYPES.ERROR]: 'bg-red-600 border-red-500 text-white',
    [TOAST_TYPES.INFO]: 'bg-blue-600 border-blue-500 text-white',
    [TOAST_TYPES.WARNING]: 'bg-amber-500 border-amber-400 text-white'
  };

  const icons = {
    [TOAST_TYPES.SUCCESS]: 'fa-circle-check',
    [TOAST_TYPES.ERROR]: 'fa-circle-xmark',
    [TOAST_TYPES.INFO]: 'fa-circle-info',
    [TOAST_TYPES.WARNING]: 'fa-triangle-exclamation'
  };

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] animate-slide-up max-w-md w-full px-4">
      <div className={`p-4 rounded-2xl shadow-2xl border flex items-center justify-between gap-3 ${bgColors[toast.type || TOAST_TYPES.SUCCESS]}`}>
        <div className="flex items-center gap-3">
          <i className={`fa-solid ${icons[toast.type || TOAST_TYPES.SUCCESS]} text-xl`}></i>
          <div>
            <div className="font-black text-xs uppercase tracking-wider">{toast.title || 'Notifikasi System'}</div>
            <div className="text-xs opacity-90">{toast.message}</div>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          <i className="fa-solid fa-xmark text-sm"></i>
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// KOMPONEN SUB-UI: BANNER HEADER & COUNTDOWN
// ============================================================================

/**
 * Kartu Header Banner Voting Utama
 */
const VotingHeaderBanner = ({ activeVote, totalVoters, totalVotesCount, isExpired }) => {
  const isAllowMultiple = activeVote.allowMultipleSubmissions || activeVote.allowMultiple;
  const isAllowUpdate = activeVote.allowUpdate;

  return (
    <div className="bg-gradient-to-br from-midnight via-slate-900 to-midnight-light rounded-3xl p-6 text-white relative shadow-glossy overflow-hidden border border-slate-800">
      <i className="fa-solid fa-square-poll-vertical absolute -right-6 -bottom-6 text-8xl opacity-10 text-blue-400 pointer-events-none"></i>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 relative z-10 gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-blue-500/20 text-blue-300 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-blue-400/30 uppercase tracking-widest">
              {activeVote.isMulti ? 'Multi Options (Banyak Pilihan)' : 'Single Option (Satu Pilihan)'}
            </span>
            {isExpired ? (
              <span className="bg-red-500/20 text-red-300 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-red-400/30 uppercase tracking-widest">
                Pengisian Ditutup
              </span>
            ) : (
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-400/30 uppercase tracking-widest">
                Aktif & Terbuka
              </span>
            )}
          </div>
          <h3 className="text-2xl sm:text-3xl font-black leading-tight tracking-tight text-white">{activeVote.title}</h3>
          {activeVote.description && (
            <p className="text-xs text-slate-300 font-medium mt-1 max-w-2xl">{activeVote.description}</p>
          )}
        </div>
        
        {activeVote.deadline && (
          <div className="shrink-0 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
            <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Batas Waktu:</div>
            <LiveCountdown deadline={activeVote.deadline} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10 relative z-10 text-xs">
        <div>
          <div className="text-slate-400 text-[10px] font-bold uppercase">Tanggal Dibuat</div>
          <div className="font-black text-white">{formatDateId(activeVote.createdAt)}</div>
        </div>
        <div>
          <div className="text-slate-400 text-[10px] font-bold uppercase">Target SDM</div>
          <div className="font-black text-white">{totalVoters} Karyawan</div>
        </div>
        <div>
          <div className="text-slate-400 text-[10px] font-bold uppercase">Total Respon Masuk</div>
          <div className="font-black text-blue-400">{totalVotesCount} Data Input</div>
        </div>
        <div>
          <div className="text-slate-400 text-[10px] font-bold uppercase">Aturan Sistem</div>
          <div className="font-black text-amber-300">
            {isAllowMultiple ? 'Input Akumulasi' : isAllowUpdate ? 'Bisa Perbarui' : 'Kunci Mati'}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// KOMPONEN SUB-UI: PANEL ADMIN CONTROLLER (LIVE FIREBASE SYNC)
// ============================================================================

/**
 * Panel Kontrol Live Admin untuk Mengatur Aturan Voting Realtime
 */
const AdminLivePanel = ({ 
  activeVote, 
  db, 
  toggleIsMulti, 
  toggleAllowMultiple, 
  toggleAllowUpdate, 
  onOpenDeadlineModal,
  onResetVotes
}) => {
  const isAllowMultiple = activeVote.allowMultipleSubmissions || activeVote.allowMultiple;
  const isAllowUpdate = activeVote.allowUpdate;

  return (
    <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-xl border border-slate-800 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black border border-amber-500/30">
            <i className="fa-solid fa-sliders"></i>
          </div>
          <div>
            <h4 className="font-black text-sm uppercase tracking-wider text-amber-400">Admin Control Center</h4>
            <p className="text-[10px] text-slate-400">Ubah aturan sistem dan batasan pengisian secara langsung (Realtime Sync)</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenDeadlineModal}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-black px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <i className="fa-solid fa-clock text-blue-400"></i> Set Deadline
          </button>
          
          <button
            type="button"
            onClick={onResetVotes}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-[10px] font-black px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <i className="fa-solid fa-trash-arrow-up"></i> Reset Data
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* TOGGLE 1: MULTI OPSI */}
        <button 
          type="button"
          onClick={toggleIsMulti}
          className={`p-3.5 rounded-2xl border transition-all text-left flex items-start gap-3 cursor-pointer ${
            activeVote.isMulti 
              ? 'bg-blue-600/20 border-blue-500/50 text-blue-200' 
              : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
          }`}
        >
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-black text-sm ${
            activeVote.isMulti ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'
          }`}>
            <i className={`fa-solid ${activeVote.isMulti ? 'fa-check-double' : 'fa-check'}`}></i>
          </div>
          <div>
            <div className="font-black text-xs uppercase text-white">Multi Selection</div>
            <div className="text-[10px] opacity-75 mt-0.5">
              {activeVote.isMulti ? 'Aktif (Kotak centang/Checkbox)' : 'Mati (Pilihan tunggal/Radio)'}
            </div>
          </div>
        </button>

        {/* TOGGLE 2: INPUT AKUMULASI */}
        <button 
          type="button"
          onClick={toggleAllowMultiple}
          className={`p-3.5 rounded-2xl border transition-all text-left flex items-start gap-3 cursor-pointer ${
            isAllowMultiple 
              ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-200' 
              : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
          }`}
        >
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-black text-sm ${
            isAllowMultiple ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'
          }`}>
            <i className={`fa-solid ${isAllowMultiple ? 'fa-layer-group' : 'fa-ban'}`}></i>
          </div>
          <div>
            <div className="font-black text-xs uppercase text-white">Mode Akumulasi</div>
            <div className="text-[10px] opacity-75 mt-0.5">
              {isAllowMultiple ? 'Aktif (SDM bisa input berulang)' : 'Mati (Hanya 1 entri per SDM)'}
            </div>
          </div>
        </button>

        {/* TOGGLE 3: PERBARUI DATA */}
        <button 
          type="button"
          onClick={toggleAllowUpdate}
          disabled={isAllowMultiple}
          className={`p-3.5 rounded-2xl border transition-all text-left flex items-start gap-3 cursor-pointer ${
            isAllowMultiple 
              ? 'opacity-40 cursor-not-allowed bg-slate-800/30 border-slate-800' 
              : isAllowUpdate 
                ? 'bg-amber-600/20 border-amber-500/50 text-amber-200' 
                : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
          }`}
        >
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-black text-sm ${
            isAllowUpdate && !isAllowMultiple ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-400'
          }`}>
            <i className={`fa-solid ${isAllowUpdate ? 'fa-rotate' : 'fa-lock'}`}></i>
          </div>
          <div>
            <div className="font-black text-xs uppercase text-white">Bisa Edit Pilihan</div>
            <div className="text-[10px] opacity-75 mt-0.5">
              {isAllowMultiple 
                ? 'Nonaktif (Modus Akumulasi)' 
                : isAllowUpdate 
                  ? 'Aktif (Pilihan lama ditimpa)' 
                  : 'Mati (Terkunci Permanen)'}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// KOMPONEN SUB-UI: TAB 1 - STATISTIK REKAPITULASI OPSI
// ============================================================================

/**
 * Tab Statistik Rekapitulasi Hasil Voting
 */
const StatAnalyticsTab = ({ 
  sortedOptions, 
  optionData, 
  totalSuaraMasuk, 
  isAdminLogged, 
  handleExportPDF,
  handleExportCSV 
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = sortedOptions.filter(opt => 
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-3xl shadow-soft border border-slate-100 p-5 sm:p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
        <div>
          <h4 className="font-black text-midnight text-base uppercase tracking-wider flex items-center gap-2">
            <i className="fa-solid fa-chart-pie text-status-selesai"></i> Rekapitulasi Data & Perolehan Suara
          </h4>
          <p className="text-xs text-slate-400 font-medium">Persentase dan rincian kuantitas nama pengisi per opsi</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            type="button" 
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black px-3.5 py-2 rounded-xl hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            <i className="fa-solid fa-file-excel"></i> Export CSV
          </button>
          
          {isAdminLogged && (
            <button 
              type="button" 
              onClick={handleExportPDF}
              className="flex-1 sm:flex-none bg-red-50 text-red-600 border border-red-200 text-xs font-black px-3.5 py-2 rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <i className="fa-solid fa-file-pdf"></i> Cetak PDF
            </button>
          )}
        </div>
      </div>

      {/* FILTER SEARCH OPSI */}
      {sortedOptions.length > 5 && (
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
          <input
            type="text"
            placeholder="Cari nama opsi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-midnight outline-none focus:border-blue-400 focus:bg-white transition-all"
          />
        </div>
      )}

      {/* LIST KARTU STATISTIK OPSI */}
      <div className="space-y-4">
        {filteredOptions.length === 0 && (
          <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-100">
            <i className="fa-solid fa-box-open text-3xl text-slate-300 mb-2 block"></i>
            <span className="text-xs font-bold text-slate-400">Tidak ada opsi pilihan yang cocok.</span>
          </div>
        )}

        {filteredOptions.map((opt, i) => {
          const count = optionData[opt]?.count || 0;
          const votersMap = optionData[opt]?.votersMap || {};
          const pct = calculatePercentage(count, totalSuaraMasuk);
          const isWinner = i === 0 && count > 0;

          return (
            <div 
              key={opt} 
              className={`p-5 rounded-2xl border transition-all duration-300 hover:shadow-md ${
                isWinner 
                  ? 'bg-gradient-to-r from-blue-50/80 via-indigo-50/30 to-white border-blue-200 shadow-sm' 
                  : 'bg-slate-50/60 border-slate-200/80'
              }`}
            >
              <div className="flex justify-between items-start mb-3 gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className={`font-black text-base sm:text-lg leading-tight ${isWinner ? 'text-blue-700' : 'text-midnight'}`}>
                      {opt}
                    </h5>
                    {isWinner && (
                      <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1 shadow-xs">
                        <i className="fa-solid fa-crown text-amber-500"></i> Peringkat 1
                      </span>
                    )}
                  </div>
                  
                  <div className="text-[10px] font-extrabold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 shadow-xs">
                    <i className="fa-solid fa-check-to-slot text-blue-500"></i>
                    <span>Terkumpul: <strong className="text-midnight font-black text-xs">{count}</strong> Input Suara</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className={`text-2xl sm:text-3xl font-black ${isWinner ? 'text-status-selesai' : 'text-slate-400'}`}>
                    {pct}%
                  </div>
                </div>
              </div>

              {/* PROGRESS BAR */}
              <div className="w-full bg-slate-200/80 rounded-full h-3 mb-4 overflow-hidden shadow-inner p-0.5 border border-slate-200">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${
                    isWinner 
                      ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-status-selesai shadow-md' 
                      : 'bg-slate-400'
                  }`}
                  style={{ width: `${pct}%` }}
                ></div>
              </div>

              {/* RINCIAN NAMA PENGISI */}
              {Object.keys(votersMap).length > 0 ? (
                <div className="bg-white/90 rounded-xl border border-slate-200/80 p-3 shadow-xs space-y-2">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <i className="fa-solid fa-users text-slate-400"></i> Daftar Pengisi Opsi Ini ({Object.keys(votersMap).length} SDM):
                    </span>
                    <span className="text-slate-300">Format: Nama (Kuantitas)</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(votersMap).map(([voterName, qty], vIdx) => {
                      const isAdmin = voterName.includes('🛡️');
                      const isMulti = qty > 1;

                      let badgeStyle = "bg-slate-50 border-slate-200 text-slate-700";
                      if (isAdmin) badgeStyle = "bg-amber-50 border-amber-300 text-amber-900";
                      else if (isMulti) badgeStyle = "bg-blue-50 border-blue-300 text-blue-900";

                      return (
                        <span 
                          key={vIdx} 
                          className={`${badgeStyle} border text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs transition-transform hover:scale-105`}
                        >
                          {voterName}
                          {qty > 1 && (
                            <span className="bg-blue-600 text-white font-black px-1.5 py-0.2 rounded text-[9px] shadow-2xs">
                              {qty}x
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-[10px] italic text-slate-400 bg-white/50 p-2 rounded-lg border border-dashed border-slate-200 text-center">
                  Belum ada SDM yang memilih opsi ini.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// KOMPONEN SUB-UI: TAB 2 - LOG SEMUA DATA MASUK (AUDIT RESPONDEN)
// ============================================================================

/**
 * Tab Log Data Masuk dengan Fitur Hapus Entri (Khusus Admin)
 */
const AuditLogTab = ({ votesArray, isAdminLogged, onDeleteVote }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOptionFilter, setSelectedOptionFilter] = useState('ALL');

  // Mengumpulkan opsi unik untuk filter
  const allOptionsSet = new Set();
  votesArray.forEach(v => {
    if (v.options) v.options.forEach(o => allOptionsSet.add(o));
  });
  const allOptionsList = Array.from(allOptionsSet);

  // Filter Log
  const filteredVotes = votesArray.filter(v => {
    const matchName = v.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchOption = selectedOptionFilter === 'ALL' || (v.options && v.options.includes(selectedOptionFilter));
    return matchName && matchOption;
  });

  return (
    <div className="bg-white rounded-3xl shadow-soft border border-slate-100 p-5 sm:p-6 space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
        <div>
          <h4 className="font-black text-midnight text-base uppercase tracking-wider flex items-center gap-2">
            <i className="fa-solid fa-receipt text-status-selesai"></i> Log Riwayat Data Masuk ({votesArray.length})
          </h4>
          <p className="text-xs text-slate-400 font-medium">Daftar riwayat kronologis seluruh form yang disubmit ke database</p>
        </div>
      </div>

      {/* FILTER SEARCH & OPTION */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
          <input
            type="text"
            placeholder="Cari berdasarkan nama SDM..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-midnight outline-none focus:border-blue-400"
          />
        </div>

        <select
          value={selectedOptionFilter}
          onChange={(e) => setSelectedOptionFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-midnight outline-none focus:border-blue-400 cursor-pointer"
        >
          <option value="ALL">-- Semua Opsi Pilihan --</option>
          {allOptionsList.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      {filteredVotes.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100">
          <i className="fa-solid fa-inbox text-4xl text-slate-300 mb-2 block"></i>
          <p className="text-xs font-bold text-slate-400">Tidak ada log data masuk yang sesuai dengan filter.</p>
        </div>
      )}

      {/* GRID KARTU LOG */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredVotes.map((voteData, index) => (
          <div 
            key={index} 
            className={`p-4 rounded-2xl border transition-all hover:shadow-md relative group ${
              voteData.isAdminOverride 
                ? 'bg-amber-50/40 border-amber-200' 
                : 'bg-slate-50/70 border-slate-200'
            }`}
          >
            <div className="flex justify-between items-start mb-2.5">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shadow-xs ${
                  voteData.isAdminOverride ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'
                }`}>
                  <i className={`fa-solid ${voteData.isAdminOverride ? 'fa-user-shield' : 'fa-user-check'}`}></i>
                </div>
                <div>
                  <div className="font-black text-midnight text-sm flex items-center gap-1.5">
                    {voteData.name}
                    {voteData.isAdminOverride && (
                      <span className="bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.2 rounded uppercase">
                        Override
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] font-extrabold text-slate-400">
                    <i className="fa-regular fa-clock mr-1"></i>
                    {formatIndonesianDateTime(voteData.votedAt)}
                  </div>
                </div>
              </div>

              {isAdminLogged && (
                <button
                  type="button"
                  onClick={() => onDeleteVote(voteData)}
                  title="Hapus Entri Data Ini"
                  className="text-slate-300 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                >
                  <i className="fa-solid fa-trash-can text-xs"></i>
                </button>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-2.5 shadow-2xs flex flex-wrap gap-1.5">
              {voteData.options && voteData.options.map((opt, oIdx) => (
                <span 
                  key={oIdx} 
                  className="bg-blue-50 border border-blue-200 text-status-selesai text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xs"
                >
                  {opt}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// KOMPONEN SUB-UI: TAB 3 - DAFTAR SDM BELUM MENGISI & REMINDER WA
// ============================================================================

/**
 * Tab SDM Belum Mengisi dengan Fitur Salin Pesan Pengingat WA
 */
const UnvotedListTab = ({ 
  belumVoteNames, 
  activeVoteTitle, 
  isAdminLogged, 
  onSelectEmpForVote 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedWA, setCopiedWA] = useState(false);

  const filteredBelum = belumVoteNames.filter(name => 
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /**
   * Menyalin draf pengingat WhatsApp ke Clipboard
   */
  const handleCopyWAReminder = () => {
    const text = generateWhatsAppReminder(activeVoteTitle, belumVoteNames);
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedWA(true);
        setTimeout(() => setCopiedWA(false), 3000);
      });
    } else {
      window.prompt("Salin draf pengingat WhatsApp berikut:", text);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-soft border border-slate-100 p-5 sm:p-6 space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
        <div>
          <h4 className="font-black text-midnight text-base uppercase tracking-wider flex items-center gap-2">
            <i className="fa-solid fa-hourglass-half text-amber-500"></i> SDM Belum Memberikan Respon ({belumVoteNames.length})
          </h4>
          <p className="text-xs text-slate-400 font-medium">Daftar anggota SDM yang belum tercatat mengisi data form</p>
        </div>

        {belumVoteNames.length > 0 && (
          <button
            type="button"
            onClick={handleCopyWAReminder}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <i className={`fa-solid ${copiedWA ? 'fa-check' : 'fa-whatsapp'} text-sm`}></i>
            {copiedWA ? 'Teks WA Tersalin!' : 'Salin Pengingat WA'}
          </button>
        )}
      </div>

      {belumVoteNames.length > 5 && (
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
          <input
            type="text"
            placeholder="Cari nama SDM yang belum mengisi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-midnight outline-none focus:border-blue-400"
          />
        </div>
      )}

      {belumVoteNames.length === 0 ? (
        <div className="text-center py-12 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 text-emerald-800">
          <i className="fa-solid fa-circle-check text-5xl text-emerald-500 mb-3 block"></i>
          <h5 className="font-black text-sm uppercase">Luar Biasa! Partisipasi 100%</h5>
          <p className="text-xs opacity-80 mt-1">Seluruh anggota SDM dalam daftar target telah memasukkan datanya.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredBelum.map(name => (
            <div 
              key={name} 
              className="bg-amber-50/50 p-3.5 rounded-2xl border border-amber-200/80 font-bold text-amber-900 text-xs flex items-center justify-between gap-2 shadow-2xs hover:bg-amber-100/50 transition-all"
            >
              <span className="flex items-center gap-2 truncate">
                <i className="fa-solid fa-user-clock text-amber-500"></i>
                <span className="truncate">{name}</span>
              </span>

              {isAdminLogged && (
                <button
                  type="button"
                  onClick={() => onSelectEmpForVote(name)}
                  className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white font-black text-[9px] px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs"
                >
                  Bantu Input
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// KOMPONEN SUB-UI: TAB 4 - MATRIKS SILANG (OPSI VS SDM)
// ============================================================================

/**
 * Tab Matriks Silang Opsi vs SDM (Cross-Tabulation Analysis)
 */
const CrossTabMatrixTab = ({ optionsList, votesArray, voters }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Membangun peta data { "NamaSDM": { "Option1": count, "Option2": count } }
  const matrixMap = useMemo(() => {
    const map = {};
    voters.forEach(v => {
      map[v] = {};
      optionsList.forEach(o => { map[v][o] = 0; });
    });

    votesArray.forEach(vote => {
      if (vote.options && Array.isArray(vote.options)) {
        if (!map[vote.name]) {
          map[vote.name] = {};
          optionsList.forEach(o => { map[vote.name][o] = 0; });
        }
        vote.options.forEach(opt => {
          if (map[vote.name][opt] !== undefined) {
            map[vote.name][opt]++;
          }
        });
      }
    });

    return map;
  }, [optionsList, votesArray, voters]);

  const filteredVoters = voters.filter(v => 
    v.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-3xl shadow-soft border border-slate-100 p-5 sm:p-6 space-y-4 animate-fade-in overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
        <div>
          <h4 className="font-black text-midnight text-base uppercase tracking-wider flex items-center gap-2">
            <i className="fa-solid fa-table-cells text-status-selesai"></i> Matriks Sebaran Pilihan SDM
          </h4>
          <p className="text-xs text-slate-400 font-medium">Tabel analisis silang keterkaitan antara Nama SDM dan Opsi Pilihan</p>
        </div>

        <input
          type="text"
          placeholder="Cari SDM dalam tabel..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-midnight outline-none focus:border-blue-400 w-full sm:w-48"
        />
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-black">
              <th className="p-3 border-b border-slate-800 sticky left-0 bg-slate-900 z-10 w-48">NAMA SDM</th>
              {optionsList.map((opt, i) => (
                <th key={i} className="p-3 border-b border-slate-800 text-center min-w-[100px]">{opt}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filteredVoters.map((voter, idx) => {
              const voterData = matrixMap[voter] || {};
              const hasVoted = Object.values(voterData).some(val => val > 0);

              return (
                <tr key={voter} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="p-3 font-bold text-midnight sticky left-0 bg-inherit border-r border-slate-200 shadow-2xs">
                    <div className="flex items-center gap-1.5">
                      <i className={`fa-solid fa-circle text-[8px] ${hasVoted ? 'text-emerald-500' : 'text-slate-300'}`}></i>
                      <span className="truncate">{voter}</span>
                    </div>
                  </td>
                  {optionsList.map((opt, oIdx) => {
                    const count = voterData[opt] || 0;
                    return (
                      <td key={oIdx} className="p-3 text-center">
                        {count > 0 ? (
                          <span className="bg-blue-100 text-blue-800 font-black px-2 py-1 rounded-md text-[10px]">
                            {count > 1 ? `${count}x` : '✓'}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono text-[10px]">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================================
// KOMPONEN SUB-UI: FORM INPUT SUARA (CHECKBOX / RADIO)
// ============================================================================

/**
 * Komponen Formulir Pengisian Suara / Pendataan Suara
 */
const FormInputSection = ({ 
  activeVote, 
  voteEmp, 
  setVoteEmp, 
  selectedOptions, 
  toggleOption, 
  handleCastVote, 
  isSyncing, 
  voters, 
  sudahVoteNames, 
  isAdminLogged, 
  isExpired 
}) => {
  const isAllowMultiple = activeVote.allowMultipleSubmissions || activeVote.allowMultiple;
  const isAllowUpdate = activeVote.allowUpdate;

  return (
    <form onSubmit={handleCastVote} className="bg-white rounded-3xl shadow-soft border border-slate-100 p-5 sm:p-6 space-y-6 animate-fade-in">
      <div className="text-center max-w-xl mx-auto space-y-1">
        <h4 className="font-black text-midnight text-lg tracking-tight">Formulir Rekapan & Pendataan Otomatis</h4>
        <p className="text-xs text-slate-500 font-medium">
          {isAllowMultiple 
            ? 'Sistem Akumulasi Aktif: Data yang dimasukkan akan menambahkan kuantitas sebelumnya.' 
            : isAllowUpdate 
              ? 'Sistem Perbarui Aktif: Pilihan baru akan menggantikan pilihan lama Anda.' 
              : 'Sistem Terbuka: Semua user dapat mengedit/memperbarui pilihannya kembali.'}
        </p>
      </div>

      {/* JIKA DEADLINE HABIS DAN BUKAN ADMIN */}
      {isExpired && !isAdminLogged ? (
        <div className="p-8 bg-red-50/80 border border-red-200 text-red-700 rounded-3xl text-center font-black text-sm shadow-sm flex flex-col items-center justify-center gap-3">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-3xl shadow-inner">
            <i className="fa-solid fa-lock"></i>
          </div>
          <div>
            <div className="text-base uppercase tracking-tight">Pengisian Ditutup!</div>
            <p className="text-xs font-normal opacity-80 mt-1 max-w-md">
              Batas waktu (deadline) untuk pendataan ini telah berakhir. Sistem telah menutup akses pengisian secara otomatis.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* NOTICE JIKA ADMIN OVERRIDE AKTIM */}
          {isExpired && isAdminLogged && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl font-medium text-xs flex items-center gap-3 shadow-2xs">
              <i className="fa-solid fa-user-shield text-amber-600 text-lg shrink-0"></i>
              <div>
                <strong>Akses Admin Override:</strong> Deadline pengisian telah lewat. Namun karena Anda terotorisasi sebagai Admin, Anda dapat terus memasukkan data atas nama SDM.
              </div>
            </div>
          )}

          {/* SELECT NAMA SDM */}
          <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-200 space-y-2">
            <label className="block text-xs font-black text-midnight uppercase tracking-wider flex items-center gap-2">
              <i className="fa-solid fa-user-check text-status-selesai"></i> 1. Pilih Identitas SDM / Karyawan
            </label>
            <select 
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-midnight outline-none cursor-pointer shadow-2xs focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" 
              value={voteEmp} 
              onChange={(e) => setVoteEmp(e.target.value)}
            >
              <option value="">-- Ketuk Untuk Memilih Nama SDM --</option>
              {voters.map(v => {
                const isAlreadyVoted = sudahVoteNames.includes(v);
                
                // Murni instruksi: User bebas edit/perbaharui sehingga tidak akan pernah disabled
                const isDisabled = false;

                let labelExtra = '';
                if (isAlreadyVoted) {
                  if (isAllowMultiple) labelExtra = ' (Bisa Tambah Data Akumulasi)';
                  else if (isAdminLogged) labelExtra = ' (Akses Admin Override)';
                  else labelExtra = ' (Telah Mengisi - Bisa Edit/Perbarui Pilihan)';
                }

                return (
                  <option key={v} value={v} disabled={isDisabled}>
                    {v} {labelExtra}
                  </option>
                );
              })}
            </select>
          </div>

          {/* PILIHAN OPSI (HANYA JIKA SDM DIPILIH) */}
          {voteEmp && (
            <div className="animate-slide-up bg-slate-50 p-4.5 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-midnight uppercase tracking-wider flex items-center gap-2">
                  <i className="fa-solid fa-list-check text-status-selesai"></i> 2. Tentukan Pilihan Opsi
                </label>
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 uppercase">
                  {activeVote.isMulti ? 'Multi Opsi (Bisa Centang Banyak)' : 'Single Opsi (Pilih Satu)'}
                </span>
              </div>

              <div className="space-y-2.5">
                {(activeVote.options || []).map(opt => {
                  const isSelected = selectedOptions.includes(opt);
                  return (
                    <button 
                      type="button" 
                      key={opt} 
                      onClick={() => toggleOption(opt)} 
                      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 text-sm font-black transition-all duration-200 outline-none cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-50/80 border-status-selesai text-status-selesai shadow-md scale-[1.01]' 
                          : 'bg-white border-slate-200/80 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span>{opt}</span>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                        isSelected ? 'bg-status-selesai border-status-selesai text-white' : 'border-slate-300 text-transparent'
                      }`}>
                        <i className="fa-solid fa-check text-[10px]"></i>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TOMBOL SUBMIT */}
          <button 
            type="submit" 
            disabled={isSyncing || !voteEmp || selectedOptions.length === 0} 
            className={`w-full text-white font-black py-4 rounded-2xl shadow-glossy transition-all text-sm outline-none cursor-pointer flex justify-center items-center gap-2 ${
              (!voteEmp || selectedOptions.length === 0 || isSyncing) 
                ? 'bg-slate-400 opacity-60 cursor-not-allowed' 
                : 'bg-gradient-to-r from-midnight to-midnight-light hover:opacity-95 active:scale-98'
            }`}
          >
            {isSyncing ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin text-base"></i>
                <span>Menyimpan ke Database Realtime...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-paper-plane text-status-selesai text-base"></i> 
                <span>
                  {isAllowMultiple && sudahVoteNames.includes(voteEmp) 
                    ? 'Tambah Entri Akumulasi Baru' 
                    : sudahVoteNames.includes(voteEmp) 
                      ? 'Simpan Perubahan (Edit Pilihan)' 
                      : 'Kirimkan Data Respon'}
                </span>
              </>
            )}
          </button>
        </>
      )}
    </form>
  );
};

// ============================================================================
// KOMPONEN MODAL: EDIT DEADLINE
// ============================================================================

const DeadlineEditModal = ({ isOpen, onClose, currentDeadline, onSave }) => {
  const [newDeadline, currentDeadlineState] = useState(currentDeadline || '');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h4 className="font-black text-midnight text-base uppercase flex items-center gap-2">
            <i className="fa-solid fa-clock text-blue-600"></i> Pengaturan Batas Waktu
          </h4>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-600">Pilih Tanggal Batas Pengisian:</label>
          <input
            type="date"
            value={newDeadline}
            onChange={(e) => currentDeadlineState(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-midnight outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            onClick={() => onSave(newDeadline)}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-black text-xs hover:bg-blue-700 shadow-md"
          >
            Simpan Deadline
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// KOMPONEN UTAMA: VotingMenu
// ============================================================================

const VotingMenu = ({ 
  votings = [], 
  db, 
  employees = [], 
  selectedVoteId, 
  setSelectedVoteId 
}) => {
  // STATE MANAGEMENT
  const [activeTab, setActiveTab] = useState(TABS.FORM_INPUT);
  const [voteEmp, setVoteEmp] = useState('');
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState(null);
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false);

  const toastTimeoutRef = useRef(null);

  // Mencari voting aktif
  const activeVote = useMemo(() => {
    return (votings || []).find(v => String(v.id) === String(selectedVoteId));
  }, [votings, selectedVoteId]);

  // Cek Admin Auth State
  const isAdminLogged = sessionStorage.getItem('adminAuth') === 'true';

  // FUNGSI NOTIFIKASI TOAST
  const showToast = useCallback((type, message, title) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ type, message, title });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // SISTEM PEMBACA URL QUERY PARAMETER (?vote=Title)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const voteParam = urlParams.get('vote');
    
    if (voteParam && !selectedVoteId && votings.length > 0) {
      const targetVote = votings.find(v => v.title === voteParam);
      if (targetVote) {
        setSelectedVoteId(targetVote.id);
        setActiveTab(TABS.FORM_INPUT);
      }
    }
  }, [votings, selectedVoteId, setSelectedVoteId]);

  // ==========================================================================
  // [PENYEMPURNAAN] SISTEM AUTO-FILL UNTUK EDIT DATA
  // Berfungsi menarik history saat nama diklik agar form tidak kosong lagi
  // ==========================================================================
  useEffect(() => {
    if (voteEmp && activeVote && activeVote.votes) {
      const isAllowMultiple = activeVote.allowMultipleSubmissions || activeVote.allowMultiple;
      if (!isAllowMultiple) {
        const safeKey = encodeSafeKey(voteEmp);
        const existing = activeVote.votes[safeKey];
        if (existing && existing.options) {
           setSelectedOptions(existing.options);
        } else {
           setSelectedOptions([]);
        }
      } else {
        setSelectedOptions([]);
      }
    } else {
      setSelectedOptions([]);
    }
  }, [voteEmp, activeVote]);

  // AKSI KEMBALI KE DAFTAR
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

  // BAGIKAN LINK VOTING
  const handleShareVote = (e, v) => {
    if (e) e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}?vote=${encodeURIComponent(v.title)}`;
    
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(() => {
        showToast(TOAST_TYPES.SUCCESS, 'Link akses berhasil disalin ke clipboard!', 'Share Success');
      }).catch(() => {
        window.prompt("Salin link akses berikut secara manual:", url);
      });
    } else {
      window.prompt("Salin link akses berikut secara manual:", url);
    }
  };

  // LIVE TOGGLE TOGGLES (FIREBASE REALTIME)
  const toggleIsMulti = async () => {
    if (!db || !activeVote) return;
    try {
      await db.ref(`artifacts/${APP_ID}/public/data/votings/${activeVote.id}/isMulti`).set(!activeVote.isMulti);
      showToast(TOAST_TYPES.SUCCESS, 'Pengaturan Multi Selection diperbarui.');
    } catch (err) { 
      showToast(TOAST_TYPES.ERROR, 'Gagal mengubah mode Multi Selection.');
    }
  };

  const toggleAllowMultiple = async () => {
    if (!db || !activeVote) return;
    const currentVal = activeVote.allowMultipleSubmissions || activeVote.allowMultiple;
    try {
      await db.ref(`artifacts/${APP_ID}/public/data/votings/${activeVote.id}/allowMultipleSubmissions`).set(!currentVal);
      showToast(TOAST_TYPES.SUCCESS, 'Pengaturan Mode Akumulasi diperbarui.');
    } catch (err) { 
      showToast(TOAST_TYPES.ERROR, 'Gagal mengubah Mode Akumulasi.');
    }
  };

  const toggleAllowUpdate = async () => {
    if (!db || !activeVote) return;
    const currentVal = activeVote.allowUpdate;
    try {
      await db.ref(`artifacts/${APP_ID}/public/data/votings/${activeVote.id}/allowUpdate`).set(!currentVal);
      showToast(TOAST_TYPES.SUCCESS, 'Pengaturan Edit Pilihan diperbarui.');
    } catch (err) { 
      showToast(TOAST_TYPES.ERROR, 'Gagal mengubah Mode Edit Pilihan.');
    }
  };

  // UBAH DEADLINE VIA MODAL
  const handleSaveDeadline = async (newDeadline) => {
    if (!db || !activeVote) return;
    try {
      await db.ref(`artifacts/${APP_ID}/public/data/votings/${activeVote.id}/deadline`).set(newDeadline);
      setIsDeadlineModalOpen(false);
      showToast(TOAST_TYPES.SUCCESS, 'Batas waktu pengisian berhasil diperbarui.');
    } catch (err) {
      showToast(TOAST_TYPES.ERROR, 'Gagal memperbarui deadline.');
    }
  };

  // RESET SELURUH DATA RESPONDEN (ADMIN ONLY)
  const handleResetVotes = async () => {
    if (!db || !activeVote) return;
    if (window.confirm(`APAKAH ANDA YAKIN?\n\nSeluruh data suara/respon yang masuk untuk "${activeVote.title}" akan dihapus permanen.`)) {
      try {
        await db.ref(`artifacts/${APP_ID}/public/data/votings/${activeVote.id}/votes`).remove();
        showToast(TOAST_TYPES.SUCCESS, 'Seluruh data respon berhasil direset.');
      } catch (err) {
        showToast(TOAST_TYPES.ERROR, 'Gagal mereset data respon.');
      }
    }
  };

  // HAPUS SATU ENTRI DATA RESPONDEN
  const handleDeleteSingleVote = async (voteData) => {
    if (!db || !activeVote) return;
    if (window.confirm(`Hapus entri data respon milik "${voteData.name}"?`)) {
      try {
        const votesObj = activeVote.votes || {};
        const targetKey = Object.keys(votesObj).find(k => votesObj[k] === voteData);
        if (targetKey) {
          await db.ref(`artifacts/${APP_ID}/public/data/votings/${activeVote.id}/votes/${targetKey}`).remove();
          showToast(TOAST_TYPES.SUCCESS, `Data milik ${voteData.name} dihapus.`);
        }
      } catch (err) {
        showToast(TOAST_TYPES.ERROR, 'Gagal menghapus entri.');
      }
    }
  };

  // SUBMIT FORM VOTING
  const handleCastVote = async (e) => {
    e.preventDefault();
    if (!db || !voteEmp || selectedOptions.length === 0) { 
      showToast(TOAST_TYPES.WARNING, 'Pilih identitas nama SDM dan sekurang-kurangnya 1 opsi pilihan!');
      return; 
    }

    let isAdminOverrideFlag = false;

    // VALIDASI DEADLINE
    if (activeVote.deadline) {
      const targetTime = new Date(`${activeVote.deadline}T23:59:59`).getTime();
      const currentTime = new Date().getTime();
      
      if (currentTime > targetTime) {
        if (!isAdminLogged) {
          alert("Maaf, waktu untuk pengisian ini telah habis!");
          return;
        } else {
          isAdminOverrideFlag = true;
        }
      }
    }

    setIsSyncing(true);
    
    try {
      const isAllowMultiple = activeVote.allowMultipleSubmissions || activeVote.allowMultiple;
      
      let safeKey = '';
      if (isAllowMultiple) {
        safeKey = `${encodeSafeKey(voteEmp)}_${Date.now()}`;
      } else {
        // Menggunakan identitas user sebagai Primary Key, maka akan selalu overwrite (mengedit data lama)
        safeKey = encodeSafeKey(voteEmp);
      }

      const payload = {
        name: voteEmp,
        options: selectedOptions,
        votedAt: new Date().toISOString(),
        isAdminOverride: isAdminOverrideFlag
      };

      await db.ref(`artifacts/${APP_ID}/public/data/votings/${activeVote.id}/votes/${safeKey}`).set(payload);
      
      showToast(TOAST_TYPES.SUCCESS, 'Data respon Anda telah berhasil tersimpan!', 'Berhasil Submit');
      setVoteEmp(''); 
      setSelectedOptions([]); 
      setActiveTab(TABS.STATISTIK);
      
    } catch (err) { 
      showToast(TOAST_TYPES.ERROR, 'Terjadi kesalahan sistem saat menyimpan data.');
    }
    
    setIsSyncing(false);
  };

  // TOGGLE OPSI CHECKBOX / RADIO
  const toggleOption = (opt) => {
    if (!activeVote.isMulti) { 
      setSelectedOptions([opt]); 
      return; 
    }
    
    if (selectedOptions.includes(opt)) {
      setSelectedOptions(selectedOptions.filter(o => o !== opt));
    } else {
      setSelectedOptions([...selectedOptions, opt]);
    }
  };

  // ==========================================================================
  // [PENYEMPURNAAN] LAPORAN PDF RESMI SESUAI BLUEPRINT REFERENSI
  // ==========================================================================
  const handleExportPDF = () => {
    if (!activeVote) return;

    const votesObj = activeVote.votes || {};
    const votesArray = Object.values(votesObj);
    const uniqueVoterNamesSet = new Set(votesArray.map(v => v.name));
    const sudahVoteNames = [...uniqueVoterNamesSet].sort((a,b) => a.localeCompare(b));
    const voters = activeVote.voters || [];
    const belumVoteNames = voters.filter(v => !sudahVoteNames.includes(v)).sort((a,b) => a.localeCompare(b));
    const optionsList = activeVote.options || [];

    const optionData = {};
    optionsList.forEach(o => { optionData[o] = { count: 0, votersMap: {} }; });
    let totalSuaraMasuk = 0;

    votesArray.forEach(vote => {
      if (vote.options && Array.isArray(vote.options)) {
        vote.options.forEach(p => { 
          if (optionData[p]) {
            optionData[p].count++; 
            let displayName = vote.name;
            if (vote.isAdminOverride) displayName += ' (Admin)';
            if (!optionData[p].votersMap[displayName]) optionData[p].votersMap[displayName] = 0;
            optionData[p].votersMap[displayName]++;
            totalSuaraMasuk++; 
          }
        });
      }
    });

    const sortedOptions = [...optionsList].sort((a, b) => optionData[b].count - optionData[a].count);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Mohon izinkan pop-up browser untuk mengekspor Laporan PDF.");
      return;
    }

    const isAllowMultiple = activeVote.allowMultipleSubmissions || activeVote.allowMultiple;
    const isAllowUpdate = activeVote.allowUpdate;
    
    const aturanSistem = isAllowMultiple 
        ? 'Mode Rekapan Terakumulasi (SDM bisa input berulang)' 
        : isAllowUpdate 
          ? 'Bisa Perbarui (Pilihan baru menimpa lama)' 
          : 'Kunci Mati (Satu kali pengisian)';

    // Generate baris untuk Tabel 1
    const table1Rows = sortedOptions.map((opt, i) => {
      const count = optionData[opt].count;
      const pct = calculatePercentage(count, totalSuaraMasuk);
      const vMap = optionData[opt].votersMap;
      
      const vList = Object.keys(vMap).length > 0 
         ? Object.entries(vMap).map(([n, q]) => `${n}${q > 1 ? ` (${q}x)` : ''}`).join('<br/>') 
         : '-';
      
      const isWinner = i === 0 && count > 0;
      
      return `
        <tr>
          <td class="text-center">${i + 1}</td>
          <td>${opt} ${isWinner ? '<br/><span class="rank">Terbanyak</span>' : ''}</td>
          <td class="text-center">${count}</td>
          <td class="text-center">${pct}%</td>
          <td>${vList}</td>
        </tr>
      `;
    }).join('');

    // Generate baris untuk Tabel 2
    const table2Rows = belumVoteNames.map((name, i) => `
      <tr>
        <td class="text-center">${i + 1}</td>
        <td>${name}</td>
        <td class="text-center">Belum Memilih</td>
      </tr>
    `).join('');

    const tglBikin = formatDateId(new Date().toISOString());
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const footerStr = `Laporan Resmi Dicetak Otomatis pada ${tglBikin} pukul ${timeStr}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>Laporan Rekapitulasi Data - ${activeVote.title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 30px; color: #000; line-height: 1.4; font-size: 12px; }
          .header { text-align: center; margin-bottom: 20px; }
          .title { font-size: 16px; font-weight: bold; }
          .subtitle { font-size: 18px; font-weight: bold; margin-top: 5px; text-transform: uppercase; }
          .info-box { margin-bottom: 20px; }
          .info-box div { margin-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; }
          th { font-weight: bold; text-align: center; background-color: #f8f9fa; }
          .section-title { font-weight: bold; font-size: 14px; margin-bottom: 10px; margin-top: 20px; text-transform: uppercase; }
          .text-center { text-align: center; }
          .rank { font-weight: bold; font-style: italic; font-size: 10px; color: #555; }
          .signature { float: right; width: 250px; text-align: center; margin-top: 40px; page-break-inside: avoid; }
          .footer { margin-top: 50px; font-style: italic; font-size: 10px; text-align: left; clear: both; }
          @media print {
            @page { size: A4; margin: 15mm; }
            body { padding: 0; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">LAPORAN REKAPITULASI HASIL DATA</div>
          <div class="subtitle">${activeVote.title}</div>
        </div>
        
        <div class="info-box">
          <div><strong>Tanggal Pembuatan:</strong> ${tglBikin}</div>
          <div><strong>Tipe Pemilihan:</strong> ${activeVote.isMulti ? 'Multi Pilihan (Bisa pilih beberapa opsi)' : 'Single Pilihan (Pilih satu opsi)'}</div>
          <div><strong>Aturan Sistem:</strong> ${aturanSistem}</div>
          <div><strong>Total Target Partisipan:</strong> ${voters.length} SDM</div>
          <div><strong>Total Respon Masuk (Data):</strong> ${votesArray.length} Data (Dari ${sudahVoteNames.length} SDM)</div>
          <div><strong>Belum Merespon:</strong> ${belumVoteNames.length} SDM</div>
        </div>

        <div class="section-title">1. HASIL REKAPITULASI OPSI</div>
        <table>
          <thead>
            <tr>
              <th style="width: 40px;">NO</th>
              <th style="width: 150px;">OPSI PILIHAN</th>
              <th style="width: 100px;">JUMLAH INPUT</th>
              <th style="width: 100px;">PERSENTASE</th>
              <th>DAFTAR NAMA PENGISI (KUANTITAS)</th>
            </tr>
          </thead>
          <tbody>
            ${table1Rows}
          </tbody>
        </table>

        <div class="section-title" style="page-break-before: auto;">2. DAFTAR SDM BELUM MERESPON (${belumVoteNames.length} SDM)</div>
        <table>
          <thead>
            <tr>
              <th style="width: 40px;">NO</th>
              <th>NAMA SDM</th>
              <th style="width: 150px;">STATUS</th>
            </tr>
          </thead>
          <tbody>
            ${table2Rows.length > 0 ? table2Rows : '<tr><td colspan="3" class="text-center">- Semua SDM Telah Merespon -</td></tr>'}
          </tbody>
        </table>

        <div class="signature">
          <p>Tapin, ${tglBikin}</p>
          <p style="margin-bottom: 70px;"><strong>Ketua Tim PKH Tapin</strong></p>
          <p style="text-decoration: underline; font-weight: bold;">M. ZAEN SYACHRULLAH</p>
        </div>

        <div class="footer">
          ${footerStr}
        </div>

        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // EKSPOR CSV DATA MENTAH
  const handleExportCSV = () => {
    if (!activeVote) return;
    const votesObj = activeVote.votes || {};
    const votesArray = Object.values(votesObj);
    const csvData = generateCSVContent(activeVote, votesArray);
    
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Rekap_Voting_${activeVote.title.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // RENDER DUA KONDISI: LIST ALL VOTING VS DETAIL VOTING ACTIVE
  if (!selectedVoteId) {
    return (
      <div className="animate-slide-up space-y-6">
        <ToastNotification toast={toast} onClose={() => setToast(null)} />

        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-black text-midnight tracking-tight">Kotak Rekapan & Suara</h3>
            <p className="text-slate-500 text-xs font-bold mt-0.5">Pemilihan, Rekapitulasi & Pendataan Bersama</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {(votings || []).length === 0 && (
            <div className="bg-white rounded-3xl shadow-soft border border-slate-100 text-center py-16">
              <i className="fa-solid fa-box-archive text-5xl mb-3 text-slate-300 block"></i>
              <p className="font-black text-slate-500 text-sm">Belum ada agenda voting yang aktif saat ini.</p>
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
                    setActiveTab(TABS.FORM_INPUT); 
                  }} 
                  className="w-full p-6 text-left outline-none cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <h5 className="font-black text-midnight text-lg w-3/4 group-hover:text-status-selesai transition-colors leading-snug">
                      {v.title}
                    </h5>
                    
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="bg-blue-50 text-status-selesai text-[10px] font-black px-2.5 py-0.5 rounded-full border border-blue-100 uppercase">
                        {v.isMulti ? 'Multi Options' : 'Single Option'}
                      </span>
                      
                      {allowMult ? (
                        <span className="bg-emerald-50 text-emerald-600 text-[9px] font-black px-2 py-0.5 rounded-full border border-emerald-100 uppercase">Input Akumulasi</span>
                      ) : allowUpd ? (
                        <span className="bg-amber-50 text-amber-600 text-[9px] font-black px-2 py-0.5 rounded-full border border-amber-100 uppercase">Bisa Edit</span>
                      ) : (
                        <span className="bg-slate-100 text-slate-600 text-[9px] font-black px-2 py-0.5 rounded-full border border-slate-200 uppercase">Kunci Mati</span>
                      )}
                      
                      {isExpired && (
                        <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase shadow-2xs">Ditutup</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <div className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
                      <i className="fa-solid fa-calendar-day mr-1 text-slate-400"></i> {formatDateId(v.createdAt)}
                    </div>
                    {v.deadline && <LiveCountdown deadline={v.deadline} />}
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden">
                    <div 
                      className="bg-status-selesai h-2 rounded-full transition-all duration-1000 ease-out" 
                      style={{ width: `${totalVoters === 0 ? 0 : Math.min(100, (totalVotes / totalVoters) * 100)}%` }}
                    ></div>
                  </div>
                  
                  <div className="text-[10px] font-black text-slate-400 flex justify-between">
                    <span>PROGRESS RESPON SDM</span> 
                    <span className="text-midnight font-black">{totalVotes} Input dari {totalVoters} SDM Target</span>
                  </div>
                </button>

                {isAdminLogged && (
                  <div className="px-6 pb-6 pt-0">
                    <button 
                      type="button"
                      onClick={(e) => handleShareVote(e, v)}
                      className="w-full bg-blue-50 text-status-selesai border border-blue-200 font-black py-2.5 rounded-xl text-xs hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 outline-none cursor-pointer shadow-2xs"
                    >
                      <i className="fa-solid fa-share-nodes"></i> Salin Link Tautan Akses
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

  // JIKA TAMPILAN DETAIL VOTING DIPILIH
  const votesObj = activeVote.votes || {};
  const votesArray = Object.values(votesObj);
  const uniqueVoterNames = new Set(votesArray.map(v => v.name));
  const sudahVoteNames = [...uniqueVoterNames].sort((a,b) => a.localeCompare(b));
  const voters = activeVote.voters || [];
  const belumVoteNames = voters.filter(v => !sudahVoteNames.includes(v)).sort((a,b) => a.localeCompare(b));

  const optionsList = activeVote.options || [];
  const optionData = {};
  optionsList.forEach(o => { optionData[o] = { count: 0, votersMap: {} }; });
  let totalSuaraMasuk = 0;

  votesArray.forEach(vote => {
    if (vote.options && Array.isArray(vote.options)) {
      vote.options.forEach(p => { 
        if (optionData[p]) {
          optionData[p].count++; 
          let displayName = vote.name;
          if (vote.isAdminOverride) displayName += " 🛡️(Admin)";
          if (!optionData[p].votersMap[displayName]) optionData[p].votersMap[displayName] = 0;
          optionData[p].votersMap[displayName]++;
          totalSuaraMasuk++; 
        }
      });
    }
  });

  const sortedOptions = [...optionsList].sort((a, b) => optionData[b].count - optionData[a].count);
  const isExpired = activeVote.deadline && new Date().getTime() > new Date(`${activeVote.deadline}T23:59:59`).getTime();

  return (
    <div className="animate-slide-up space-y-5 relative pb-12">
      <ToastNotification toast={toast} onClose={() => setToast(null)} />

      <DeadlineEditModal 
        isOpen={isDeadlineModalOpen}
        onClose={() => setIsDeadlineModalOpen(false)}
        currentDeadline={activeVote.deadline}
        onSave={handleSaveDeadline}
      />

      {/* NAVIGASI ATAS */}
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <button 
          type="button" 
          onClick={handleBack} 
          className="bg-white text-midnight border border-slate-200 shadow-2xs rounded-full font-bold px-4 py-2 text-xs flex items-center gap-2 hover:bg-slate-50 transition-colors outline-none cursor-pointer"
        >
          <i className="fa-solid fa-arrow-left text-status-selesai"></i> Kembali ke Daftar
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          {isAdminLogged && (
            <>
              <button 
                type="button"
                onClick={handleExportPDF}
                className="bg-red-600 text-white shadow-md rounded-full font-black px-4 py-2 text-xs flex items-center gap-1.5 hover:bg-red-700 transition-all outline-none cursor-pointer"
              >
                <i className="fa-solid fa-file-pdf"></i> Cetak Laporan PDF
              </button>
              
              <button 
                type="button"
                onClick={(e) => handleShareVote(e, activeVote)} 
                className="bg-emerald-600 text-white shadow-md rounded-full font-black px-4 py-2 text-xs flex items-center gap-1.5 hover:bg-emerald-700 transition-all outline-none cursor-pointer"
              >
                <i className="fa-solid fa-share-nodes"></i> Share Link
              </button>
            </>
          )}
        </div>
      </div>

      {/* CONTROLLER ADMIN */}
      {isAdminLogged && (
        <AdminLivePanel 
          activeVote={activeVote}
          db={db}
          toggleIsMulti={toggleIsMulti}
          toggleAllowMultiple={toggleAllowMultiple}
          toggleAllowUpdate={toggleAllowUpdate}
          onOpenDeadlineModal={() => setIsDeadlineModalOpen(true)}
          onResetVotes={handleResetVotes}
        />
      )}

      {/* BANNER HEADER */}
      <VotingHeaderBanner 
        activeVote={activeVote}
        totalVoters={voters.length}
        totalVotesCount={votesArray.length}
        isExpired={isExpired}
      />

      {/* NAVIGASI TAB MODULAR */}
      <div className="flex bg-white rounded-2xl shadow-2xs border border-slate-200 p-1.5 sticky top-20 z-20 overflow-x-auto hide-scrollbar gap-1">
        <button 
          type="button" 
          onClick={() => setActiveTab(TABS.FORM_INPUT)} 
          className={`flex-1 min-w-[110px] py-2.5 px-3 text-xs font-black rounded-xl transition-all outline-none cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === TABS.FORM_INPUT 
              ? 'bg-status-selesai text-white shadow-md' 
              : 'text-status-selesai bg-blue-50/60 hover:bg-blue-100/60'
          }`}
        >
          <i className="fa-solid fa-pen-to-square"></i> FORM INPUT
        </button>

        <button 
          type="button" 
          onClick={() => setActiveTab(TABS.STATISTIK)} 
          className={`flex-1 min-w-[90px] py-2.5 px-3 text-xs font-extrabold rounded-xl transition-all outline-none cursor-pointer ${
            activeTab === TABS.STATISTIK 
              ? 'bg-midnight text-white shadow-md' 
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          Statistik Opsi
        </button>
        
        <button 
          type="button" 
          onClick={() => setActiveTab(TABS.LOG_MASUK)} 
          className={`flex-1 min-w-[90px] py-2.5 px-3 text-xs font-extrabold rounded-xl transition-all outline-none cursor-pointer ${
            activeTab === TABS.LOG_MASUK 
              ? 'bg-midnight text-white shadow-md' 
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          Log Masuk ({votesArray.length})
        </button>
        
        <button 
          type="button" 
          onClick={() => setActiveTab(TABS.BELUM_MENGISI)} 
          className={`flex-1 min-w-[90px] py-2.5 px-3 text-xs font-extrabold rounded-xl transition-all outline-none cursor-pointer ${
            activeTab === TABS.BELUM_MENGISI 
              ? 'bg-midnight text-white shadow-md' 
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          Belum ({belumVoteNames.length})
        </button>

        <button 
          type="button" 
          onClick={() => setActiveTab(TABS.MATRIKS)} 
          className={`flex-1 min-w-[90px] py-2.5 px-3 text-xs font-extrabold rounded-xl transition-all outline-none cursor-pointer ${
            activeTab === TABS.MATRIKS 
              ? 'bg-midnight text-white shadow-md' 
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          Matriks Silang
        </button>
      </div>

      {/* RENDER KONTEN TAB SANGAT LENGKAP */}
      {activeTab === TABS.FORM_INPUT && (
        <FormInputSection 
          activeVote={activeVote}
          voteEmp={voteEmp}
          setVoteEmp={setVoteEmp}
          selectedOptions={selectedOptions}
          toggleOption={toggleOption}
          handleCastVote={handleCastVote}
          isSyncing={isSyncing}
          voters={voters}
          sudahVoteNames={sudahVoteNames}
          isAdminLogged={isAdminLogged}
          isExpired={isExpired}
        />
      )}

      {activeTab === TABS.STATISTIK && (
        <StatAnalyticsTab 
          sortedOptions={sortedOptions}
          optionData={optionData}
          totalSuaraMasuk={totalSuaraMasuk}
          isAdminLogged={isAdminLogged}
          handleExportPDF={handleExportPDF}
          handleExportCSV={handleExportCSV}
        />
      )}

      {activeTab === TABS.LOG_MASUK && (
        <AuditLogTab 
          votesArray={votesArray}
          isAdminLogged={isAdminLogged}
          onDeleteVote={handleDeleteSingleVote}
        />
      )}

      {activeTab === TABS.BELUM_MENGISI && (
        <UnvotedListTab 
          belumVoteNames={belumVoteNames}
          activeVoteTitle={activeVote.title}
          isAdminLogged={isAdminLogged}
          onSelectEmpForVote={(name) => {
            setVoteEmp(name);
            setActiveTab(TABS.FORM_INPUT);
          }}
        />
      )}

      {activeTab === TABS.MATRIKS && (
        <CrossTabMatrixTab 
          optionsList={optionsList}
          votesArray={votesArray}
          voters={voters}
        />
      )}
    </div>
  );
};

export default VotingMenu;
