export function daysBetween(a, b) {
  const d1 = new Date(a + 'T00:00:00'), d2 = new Date(b + 'T00:00:00');
  return Math.max(1, Math.round((d2 - d1) / 86400000) + 1);
}

export function buildCitiesPlan(destination, numDays, extraCities) {
  const extra = (extraCities || []).filter(c => c && c.name);
  for (const c of extra) {
    if (!c.nights || c.nights < 1) return { error: `Set at least 1 night for ${c.name}.` };
  }
  const extraTotal = extra.reduce((s, c) => s + c.nights, 0);
  if (extraTotal > numDays - 1) {
    return { error: `Your extra cities need ${extraTotal} night${extraTotal === 1 ? '' : 's'}, but the trip is only ${numDays} days — shorten them or extend your dates.` };
  }
  const primaryNights = numDays - extraTotal;
  return { cities: [{ name: destination, nights: primaryNights }, ...extra] };
}

// Computes each city's date sub-range and a day-index -> city name map,
// mirroring the cursor walk in the original prototype.
export function computeCitiesWithDates(cities, startDate) {
  const dayCityMap = [];
  const cursor = new Date(startDate + 'T00:00:00');
  const citiesWithDates = cities.map(c => {
    const from = new Date(cursor);
    for (let i = 0; i < c.nights; i++) {
      dayCityMap.push(c.name);
      cursor.setDate(cursor.getDate() + 1);
    }
    const to = new Date(cursor);
    to.setDate(to.getDate() - 1);
    return { name: c.name, nights: c.nights, from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  });
  return { citiesWithDates, dayCityMap };
}
