import * as XLSX from 'xlsx';

export const exportGroupToExcel = (activeGroup) => {
  const exportData = activeGroup.assignees.map((a, i) => ({
    "No": i + 1,
    "Nama Kegiatan": a.taskName,
    "Nama Pegawai": a.picId,
    "Mulai Mengerjakan": a.startDate ? a.startDate : "-",
    "Jumlah Target": a.target,
    "Capaian Progres": a.progress,
    "Belum Selesai (Sisa)": Math.max(0, a.target - a.progress),
    "Status": a.status,
    "Tanggal Selesai": a.status === 'Selesai' && a.completedAt ? a.completedAt : "Belum Selesai"
  }));
  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Evaluasi Data");
  XLSX.writeFile(wb, `Evaluasi_${activeGroup.taskName.replace(/\s+/g, '_')}.xlsx`);
};

export const downloadExcelTemplate = () => {
  const templateData = [
    ["Nama Kegiatan", "ID PIC / NAMA", "Target", "Deadline"],
    ["Review Laporan", "BUDI SANTOSO", 10, "2026-12-31"]
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
  XLSX.writeFile(workbook, "Template_MonitorSDMPKHTapin.xlsx");
};