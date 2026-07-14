import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Model alias used by the original artifact prototype. Real API keys may need a
// different model id — override with ANTHROPIC_MODEL if this one isn't available
// on your account.
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

// Robustly extract the first complete top-level JSON object from a text blob,
// by counting brace depth (and respecting string literals) rather than a greedy
// regex — a greedy match can swallow trailing commentary or fail on nested content.
function extractJsonObject(text) {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0, inString = false, escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  return null;
}

function textOf(message) {
  return (message.content || []).map(b => b.text || '').join('');
}

async function callClaude({ prompt, maxTokens, webSearch }) {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
    ...(webSearch ? { tools: [{ type: 'web_search_20250305', name: 'web_search' }] } : {}),
  });
  return textOf(message);
}

function parseJsonResponse(text) {
  const jsonStr = extractJsonObject(text) || (text.match(/\{[\s\S]*\}/) || [])[0];
  return JSON.parse(jsonStr || text.trim());
}

export async function generateItinerary({
  destination, startDate, endDate, staying, interests, pace, budget,
  travelers, arrival, transport, notes, numDays, isMultiCity,
  citiesWithDates, userProfile,
}) {
  const today = new Date().toISOString().slice(0, 10);
  const prompt = `You are a meticulous trip planner. Create a day-by-day itinerary as pure JSON (no markdown fences, no preamble, no commentary — JSON only).

You do NOT have live web access in this request — do not claim to have searched anything.

Today's date: ${today}

Trip details:
- Destination: ${destination}
- Dates: ${startDate} to ${endDate} (${numDays} day${numDays > 1 ? 's' : ''})
${isMultiCity ? `- This trip visits multiple cities, in order:\n${citiesWithDates.map((c, i) => `  ${i + 1}. ${c.name} — ${c.nights} day${c.nights > 1 ? 's' : ''} (${c.from} to ${c.to})`).join('\n')}\n  Assign each day's "city" field to match one of these city names exactly. On the first day in a new city (every city after the first), keep the morning light and include a logistics-category activity for the trip between cities (flight/train/drive), then ease into lighter local activities.\n` : `- City: ${destination} (assign "city": "${destination}" for every day)\n`}${staying ? `- Staying at/near: ${staying} (for the first city on the trip if multiple) — use this as the anchor point each day starts and ends near, and favor activities that are a reasonable distance from it given the "Getting around" mode below\n` : ''}- Interests: ${interests.length ? interests.join(', ') : 'general sightseeing'}
- Pace: ${pace} (relaxed = 2-3 activities/day, balanced = 3-4, packed = 5-6)
- Budget level: ${budget}
- Traveling as: ${travelers} (solo = flexible/spontaneous options fine; couple = romantic-friendly pacing; family = kid-friendly venues, shorter walks, earlier evenings, avoid anything inappropriate for children; friends = group-friendly activities and dining)
- Arriving by: ${arrival} (flying = assume they land mid-morning to early afternoon on day 1, so keep day 1 lighter and closer to where they're likely staying, and keep the last day light too with time to get to the airport; driving = day 1 can start whenever, and it's fine to suggest scenic stops or parking notes; local = they already live in or near ${destination}, so skip generic "welcome to the city" basics, favor lesser-known spots locals would still enjoy, and don't assume they need arrival-day buffer time)
- Getting around: ${transport} (walk_transit = keep each day's activities geographically clustered and transit/walk-accessible; rental_car = fine to include activities further from the center; mixed = a reasonable balance)
- Extra notes: ${notes || 'none'}
${userProfile.homeLocation ? `- Traveler's home base: ${userProfile.homeLocation}\n` : ''}${userProfile.notes ? `- Traveler's personal notes (dietary/accessibility/style — take these seriously): ${userProfile.notes}\n` : ''}
For each of these optional fields, only fill them in when you're genuinely confident from what you know — leave them null rather than guessing, since a wrong link or price is worse than none:
1. "heroImageUrl" / "imageUrl": a direct, hotlinkable photo URL you're confident is real and stable (prefer Wikimedia Commons upload.wikimedia.org URLs ending in .jpg/.jpeg/.png). If unsure, use null.
2. "website": the official site (or well-known Google Maps/TripAdvisor listing) for a named venue, only if you're confident the URL is correct. If unsure, use null.
3. "hours" / "price": only include these for well-known venues whose general hours/pricing are stable and unlikely to have changed. If unsure, use null.

Unlike those, "estCostLow" and "estCostHigh" should almost always be filled in — give a realistic ballpark RANGE in whole ${userProfile.currency} (traveler's currency) per person for each activity (use the budget level as a guide), using 0 and 0 for free activities. A single point estimate reads as falsely precise, so give an honest range (e.g. a meal might be 15–30, not a single "22"). Only use null for both if an activity is truly impossible to estimate.

Return JSON matching exactly this shape:
{
  "destination": "string",
  "heroImageUrl": "direct image URL or null",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "city": "which city this day belongs to",
      "theme": "short 2-5 word theme for the day",
      "imageUrl": "direct image URL or null",
      "activities": [
        { "time": "9:00 AM", "title": "short activity name", "description": "1-2 sentence description", "category": "food|history|nature|art|nightlife|shopping|relaxation|adventure|logistics", "hours": "e.g. 9am-5pm or null", "price": "e.g. 15, Free, or null", "website": "URL or null", "estCostLow": 15, "estCostHigh": 25 }
      ]
    }
  ]
}

Make activities specific to real, well-known places in each relevant city. Order activities chronologically within each day and keep timing realistic including meals and travel time.`;

  const text = await callClaude({ prompt, maxTokens: 6000 });
  const parsed = parseJsonResponse(text);
  if (!parsed || !Array.isArray(parsed.days) || parsed.days.length === 0) {
    throw new Error('The planner returned an empty itinerary — please try again.');
  }
  return parsed;
}

export async function regenerateDay({ trip, dayIdx, userProfile }) {
  const day = trip.days[dayIdx];
  const otherTitles = trip.days.filter((d, i) => i !== dayIdx).flatMap(d => (d.activities || []).map(a => a.title)).filter(Boolean);
  const isMultiCity = trip.cities && trip.cities.length > 1;
  const prompt = `You are a meticulous trip planner. Regenerate the plan for ONE day of an existing trip. Respond with JSON only (no markdown fences, no commentary).

Trip context:
- Overall trip: ${trip.destination}
- This day's city: ${day.city || trip.destination}
- This day's date: ${day.date} (day ${dayIdx + 1} of ${trip.days.length})
${isMultiCity ? `- This is part of a multi-city trip — keep activities local to ${day.city} only, don't reference other cities on the trip.\n` : ''}${trip.staying ? `- Staying at/near: ${trip.staying}\n` : ''}- Interests: ${trip.interests && trip.interests.length ? trip.interests.join(', ') : 'general sightseeing'}
- Pace: ${trip.pace}
- Budget level: ${trip.budget}
- Traveling as: ${trip.travelers}
- Getting around: ${trip.transport}
- Extra notes: ${trip.notes || 'none'}
${userProfile.notes ? `- Traveler's personal notes (dietary/accessibility/style — take these seriously): ${userProfile.notes}\n` : ''}- Activities already planned on OTHER days (avoid repeating these): ${otherTitles.length ? otherTitles.join('; ') : 'none'}

Give this day a fresh plan — different from its current theme ("${day.theme || ''}"). Follow the same optional-field rules as before: only fill "heroImageUrl"-style image URLs, "website", "hours", "price" when genuinely confident, else null. Always give a best-effort "estCostLow"/"estCostHigh" range in whole ${userProfile.currency} per activity (0 and 0 if free) — a realistic range, not a single falsely-precise number.

Return JSON matching exactly this shape:
{
  "theme": "short 2-5 word theme for the day",
  "imageUrl": "direct image URL or null",
  "activities": [
    { "time": "9:00 AM", "title": "short activity name", "description": "1-2 sentence description", "category": "food|history|nature|art|nightlife|shopping|relaxation|adventure|logistics", "hours": "or null", "price": "or null", "website": "or null", "estCostLow": 15, "estCostHigh": 25 }
  ]
}`;

  const text = await callClaude({ prompt, maxTokens: 3000 });
  return parseJsonResponse(text);
}

export async function generatePackingList({ trip, userProfile }) {
  const categoriesUsed = [...new Set(trip.days.flatMap(d => (d.activities || []).map(a => a.category)).filter(Boolean))];
  const prompt = `You are a helpful trip-packing assistant. Based on the trip details below, generate a practical packing list. Respond with JSON only (no markdown fences, no commentary).

Trip details:
- Destination: ${trip.destination}
- Dates: ${trip.startDate} to ${trip.endDate}
- Traveling as: ${trip.travelers}
- Arriving by: ${trip.arrival}
- Getting around: ${trip.transport}
- Activity types planned: ${categoriesUsed.length ? categoriesUsed.join(', ') : 'general sightseeing'}
${trip.notes ? `- Extra notes: ${trip.notes}\n` : ''}${userProfile.homeLocation ? `- Traveler's home base (for climate contrast): ${userProfile.homeLocation}\n` : ''}${userProfile.notes ? `- Traveler's personal notes (dietary/accessibility/style — take these seriously): ${userProfile.notes}\n` : ''}
Consider the likely season/climate for the destination and dates. Group items into a few sensible categories (e.g. Documents, Clothing, Electronics, Toiletries, Activity-specific gear). Keep each category to 4-8 concrete items. Don't pad with obvious duplicates.

Return JSON matching exactly this shape:
{ "categories": [ { "name": "Documents", "items": ["Passport", "Travel insurance confirmation"] } ] }`;

  const text = await callClaude({ prompt, maxTokens: 2000 });
  const parsed = parseJsonResponse(text);
  return parsed.categories || [];
}

export async function fetchWeatherForCity(cityName, fromDate, toDate) {
  try {
    const prompt = `Search the web for the current weather forecast for ${cityName} covering ${fromDate} to ${toDate}. Respond with JSON only (no markdown fences, no commentary), matching exactly this shape:
{ "days": [ { "date": "YYYY-MM-DD", "available": true, "high": 75, "low": 58, "condition": "Partly cloudy" } ] }
Include one entry per date in range. If a specific date's forecast isn't available, set "available": false for that date and omit high/low/condition.`;
    const text = await callClaude({ prompt, maxTokens: 2000, webSearch: true });
    const parsed = parseJsonResponse(text);
    const byDate = {};
    (parsed.days || []).forEach(d => { if (d.date) byDate[d.date] = d; });
    return byDate;
  } catch (e) {
    return {};
  }
}

export async function fetchPhotoForQuery(query) {
  try {
    const prompt = `Search the web for one real, high-quality, direct, hotlinkable photo URL representing "${query}". Prefer Wikimedia Commons (upload.wikimedia.org) URLs ending in .jpg, .jpeg, or .png, since those embed reliably in web pages. Respond with JSON only (no markdown fences, no commentary): { "imageUrl": "https://... or null" }. Use null if you can't find a solid direct image URL — don't guess or invent one.`;
    const text = await callClaude({ prompt, maxTokens: 1000, webSearch: true });
    const parsed = parseJsonResponse(text);
    return parsed.imageUrl || null;
  } catch (e) {
    return null;
  }
}
