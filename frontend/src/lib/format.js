export const currencySymbols = {
  USD: '$', EUR: '€', GBP: '£', JPY: '¥', CAD: 'C$', AUD: 'A$', CHF: 'CHF ',
  CNY: '¥', INR: '₹', MXN: '$', BRL: 'R$', KRW: '₩',
};

export function formatCost(n, currency) {
  const sym = currencySymbols[currency] || (currency + ' ');
  return sym + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function getCostRange(act) {
  if (typeof act.estCostLow === 'number' && typeof act.estCostHigh === 'number') {
    return { low: Math.min(act.estCostLow, act.estCostHigh), high: Math.max(act.estCostLow, act.estCostHigh) };
  }
  if (typeof act.estCost === 'number') return { low: act.estCost, high: act.estCost };
  return null;
}

export function formatCostRange(low, high, currency) {
  if (low === 0 && high === 0) return 'Free';
  if (low === high) return '~' + formatCost(low, currency);
  return '~' + formatCost(low, currency) + '–' + formatCost(high, currency);
}

export function calcDayCostRange(day) {
  return (day.activities || []).reduce((sum, a) => {
    const r = getCostRange(a);
    if (!r) return sum;
    return { low: sum.low + r.low, high: sum.high + r.high };
  }, { low: 0, high: 0 });
}

export function calcTripCostRange(trip) {
  return (trip.days || []).reduce((sum, d) => {
    const r = calcDayCostRange(d);
    return { low: sum.low + r.low, high: sum.high + r.high };
  }, { low: 0, high: 0 });
}

export function dayCostKnown(day) {
  return (day.activities || []).some(a => getCostRange(a) !== null);
}

export const catLabels = {
  food: 'Food & drink', history: 'History & culture', nature: 'Nature', art: 'Art',
  nightlife: 'Nightlife', shopping: 'Shopping', relaxation: 'Relaxation', adventure: 'Adventure', logistics: 'Logistics',
};
