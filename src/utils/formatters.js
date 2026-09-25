export const formatDateId = (dateString) => {
  if (!dateString) return "-";
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const parts = dateString.split("-");
  if (parts.length !== 3) return dateString;
  return `${parts[2]} ${months[parseInt(parts[1]) - 1]} ${parts[0]}`;
};

export const encodeSafeKey = (str) => {
  return btoa(unescape(encodeURIComponent(str))).replace(/[.#$/\[\]]/g, '_');
};