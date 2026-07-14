export function buildCitiesPlan(destination, numDays, extraCities) {
  const extra = (extraCities || []).filter(c => c && c.name);
  for (const c of extra) {
    if (!c.nights || c.nights < 1) return { error: `Set at least 1 night for ${c.name}.` };
  }
  const extraTotal = extra.reduce((s, c) => s + c.nights, 0);
  if (extraTotal > numDays - 1) {
    return { error: `Your extra cities need ${extraTotal} night${extraTotal === 1 ? '' : 's'}, but the trip is only ${numDays} days — shorten them or extend your dates.` };
  }
  return { cities: [{ name: destination, nights: numDays - extraTotal }, ...extra] };
}
