export const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></svg>
);
export const IconClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const IconArrowRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const IconArrowLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
);
export const IconChevronLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 18l-6-6 6-6" /></svg>
);
export const IconChevronRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M9 18l6-6-6-6" /></svg>
);
export const IconChevronUp = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M6 15l6-6 6 6" /></svg>
);
export const IconChevronDown = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M6 9l6 6 6-6" /></svg>
);
export const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1.5-4 4.5-6 7-6s5.5 2 7 6" /></svg>
);
export const IconBookmark = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M6 3h12v18l-6-4-6 4z" /></svg>
);
export const IconClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>
);
export const IconCost = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M16.5 6H10a3 3 0 000 6h4a3 3 0 010 6H7" /></svg>
);
export const IconRefresh = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M21 12a9 9 0 11-3-6.7M21 3v6h-6" /></svg>
);
export const IconEdit = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>
);
export const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0-1 13a1 1 0 01-1 1H8a1 1 0 01-1-1L6 7" /></svg>
);
export const IconExternalLink = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M7 17L17 7M7 7h10v10" /></svg>
);
export const IconExport = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>
);
export const IconPacking = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M6 7h12l-1 13H7L6 7zM9 7V5a3 3 0 016 0v2" /></svg>
);
export const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
);
export const IconSparkle = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" /></svg>
);
export const IconShare = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 10.6l6.8-3.7M8.6 13.4l6.8 3.7" /></svg>
);
export const BrandMark = () => (
  <svg viewBox="0 0 24 24" fill="#fff"><circle cx="12" cy="12" r="9.5" fill="none" stroke="#fff" strokeWidth="1.8" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></svg>
);

export function WeatherIcon({ condition }) {
  const c = (condition || '').toLowerCase();
  if (c.includes('thunder') || c.includes('storm')) return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17a4 4 0 01-1-7.9A5 5 0 0116 7a4.5 4.5 0 011 8.9" /><path d="M13 12l-3 5h3l-2 4" /></svg>;
  if (c.includes('snow')) return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17a4 4 0 01-1-7.9A5 5 0 0116 7a4.5 4.5 0 011 8.9" /><path d="M9 19v2M9 19l-1.3.9M9 19l1.3.9M15 19v2M15 19l-1.3.9M15 19l1.3.9" /></svg>;
  if (c.includes('shower') || c.includes('drizzle') || c.includes('rain')) return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17a4 4 0 01-1-7.9A5 5 0 0116 7a4.5 4.5 0 011 8.9" /><path d="M9 19l-1 2M13 19l-1 2M17 19l-1 2" /></svg>;
  if (c.includes('fog') || c.includes('mist') || c.includes('haze')) return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 9h16M4 13h16M6 17h12" /></svg>;
  if (c.includes('overcast') || c.includes('cloud')) return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17a4 4 0 01-1-7.9A5 5 0 0116 7a4.5 4.5 0 011 8.9H7z" /></svg>;
  if (c.includes('partly') || c.includes('partial')) return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="7" r="3" /><path d="M8 1.5v1.2M8 12v1.2M1.8 7H3M13 7h1.2M3.6 3.6l.8.8M12 3.6l-.8.8" /><path d="M11.2 18.5a3.3 3.3 0 000-6.6 4.1 4.1 0 00-7.8 1.3A2.9 2.9 0 006 18.5h5.2z" /></svg>;
  if (c.includes('clear') || c.includes('sun')) return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4.5" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" /></svg>;
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 3a2 2 0 00-2 2v9.3a3.5 3.5 0 102 0V5a2 2 0 00-2-2z" /><circle cx="9" cy="17.5" r="1" fill="currentColor" stroke="none" /></svg>;
}
