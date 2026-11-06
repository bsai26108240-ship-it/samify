export const formatTime = (secs) => {
  if (isNaN(secs) || secs === null || secs === undefined) return '0:00';
  const totalSecs = secs > 1000 ? Math.floor(secs / 1000) : Math.floor(secs);
  const m = Math.floor(totalSecs / 60);
  const s = Math.floor(totalSecs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};
