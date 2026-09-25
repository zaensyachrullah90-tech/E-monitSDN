import React, { useState, useEffect, memo } from 'react';

const LiveCountdown = memo(({ deadline }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!deadline) {
      setTimeLeft('NO TENGGAT');
      return;
    }
    const targetDate = new Date(`${deadline}T23:59:59`).getTime();
    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = targetDate - now;
      if (isNaN(distance)) { setTimeLeft("--:--"); setIsExpired(true); return; }
      if (distance < 0) { setTimeLeft("HABIS"); setIsExpired(true); return; }

      const d = Math.floor(distance / (1000 * 60 * 60 * 24));
      const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((distance % (1000 * 60)) / 1000);
      
      setTimeLeft(`${d > 0 ? d + 'H ' : ''}${h < 10 ? '0'+h : h}:${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`);
      setIsExpired(d <= 2);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  return (
    <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 shadow-sm border ${isExpired ? 'bg-red-600 border-red-500' : 'bg-midnight text-white border-midnight-accent'}`}>
      <i className={`fa-solid ${isExpired ? 'fa-triangle-exclamation fa-beat text-white' : 'fa-clock text-yellow-400'} text-[10px]`}></i>
      <div className="flex flex-col text-left">
        <span className="text-[8px] uppercase tracking-widest text-white/70 leading-none">Tenggat</span>
        <span className="font-mono font-bold text-[11px] text-white leading-none mt-1">{timeLeft}</span>
      </div>
    </div>
  );
});

export default LiveCountdown;