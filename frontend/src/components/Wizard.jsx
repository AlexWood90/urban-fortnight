import { useState } from 'react';
import { daysBetween } from '../lib/time';
import { buildCitiesPlan } from '../lib/tripPlan';
import { IconPlus, IconClose, IconArrowRight, IconArrowLeft, IconSparkle } from '../lib/icons';

const INTERESTS = [
  ['food', '🍜 Food & drink'], ['history', '🏛️ History & culture'], ['nature', '🌿 Nature & outdoors'],
  ['art', '🎨 Art & museums'], ['nightlife', '🌃 Nightlife'], ['shopping', '🛍️ Shopping'],
  ['relaxation', '🌅 Relaxation'], ['adventure', '🏄 Adventure'],
];
const PACE = [['relaxed', '🐢 Relaxed'], ['balanced', '🚶 Balanced'], ['packed', '⚡ Packed']];
const TRAVELERS = [['solo', '🧍 Solo'], ['couple', '💑 Couple'], ['family', '👨‍👩‍👧 Family'], ['friends', '🧑‍🤝‍🧑 Friends']];
const ARRIVAL = [['flying', '✈️ Flying'], ['driving', '🚗 Driving'], ['local', '🏠 Local']];
const TRANSPORT = [['walk_transit', '🚶 Walk & transit'], ['rental_car', '🚗 Rental car'], ['mixed', '🔀 Mix of both']];
const BUDGET = [['budget', '💸 Budget'], ['moderate', '💰 Moderate'], ['upscale', '💎 Upscale'], ['luxury', '👑 Luxury']];

function defaultDates() {
  const start = new Date(); start.setDate(start.getDate() + 14);
  const end = new Date(start); end.setDate(end.getDate() + 4);
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

export default function Wizard({ onGenerate }) {
  const [step, setStep] = useState(1);
  const [destination, setDestination] = useState('');
  const [extraCities, setExtraCities] = useState([]);
  const [{ startDate, endDate }, setDates] = useState(defaultDates());
  const [staying, setStaying] = useState('');
  const [interests, setInterests] = useState([]);
  const [pace, setPace] = useState('balanced');
  const [travelers, setTravelers] = useState('solo');
  const [arrival, setArrival] = useState('flying');
  const [transport, setTransport] = useState('walk_transit');
  const [budget, setBudget] = useState('moderate');
  const [notes, setNotes] = useState('');
  const [error1, setError1] = useState('');
  const [error3, setError3] = useState('');

  function validateStep1() {
    setError1('');
    if (!destination.trim()) { setError1('Add a destination to start planning.'); return false; }
    if (!startDate || !endDate) { setError1('Pick a start and end date.'); return false; }
    if (new Date(endDate) < new Date(startDate)) { setError1('End date is before the start date.'); return false; }
    const numDays = daysBetween(startDate, endDate);
    if (numDays > 14) { setError1('Keep trips to 14 days or fewer for a focused plan.'); return false; }
    const plan = buildCitiesPlan(destination.trim(), numDays, extraCities);
    if (plan.error) { setError1(plan.error); return false; }
    return true;
  }

  function addCity() { setExtraCities(cs => [...cs, { name: '', nights: 2 }]); }
  function removeCity(i) { setExtraCities(cs => cs.filter((_, idx) => idx !== i)); }
  function updateCity(i, field, val) {
    setExtraCities(cs => cs.map((c, idx) => idx === i ? { ...c, [field]: val } : c));
  }
  function toggleInterest(val) {
    setInterests(list => list.includes(val) ? list.filter(v => v !== val) : [...list, val]);
  }

  async function handleGenerate() {
    setError3('');
    if (!validateStep1()) { setStep(1); return; }
    try {
      await onGenerate({
        destination: destination.trim(), startDate, endDate, staying: staying.trim(),
        interests, pace, budget, travelers, arrival, transport, notes: notes.trim(),
        extraCities: extraCities.filter(c => c.name.trim()).map(c => ({ name: c.name.trim(), nights: Number(c.nights) || 0 })),
      });
    } catch (err) {
      setStep(3);
      setError3(err.message || "Couldn't generate the itinerary. Please try again.");
    }
  }

  return (
    <div>
      <div className="progress">
        {[1, 2, 3].map(i => <div key={i} className={`progress-seg${i <= step ? ' done' : ''}`} />)}
      </div>

      {step === 1 && (
        <div className="step">
          <div className="card">
            <div className="step-title">The basics</div>
            <div className="step-desc">Where and when are you headed?</div>
            <div className="field">
              <label>Destination</label>
              <input type="text" value={destination} onChange={e => setDestination(e.target.value)} placeholder="e.g. Kyoto, Japan" />
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              {extraCities.map((c, i) => (
                <div className="city-row" key={i}>
                  <input type="text" className="city-name" placeholder="e.g. Kyoto, Japan" value={c.name} onChange={e => updateCity(i, 'name', e.target.value)} />
                  <input type="number" className="city-nights" min="1" max="13" value={c.nights} onChange={e => updateCity(i, 'nights', e.target.value)} />
                  <button type="button" className="city-row-remove" aria-label="Remove city" onClick={() => removeCity(i)}><IconClose /></button>
                </div>
              ))}
              <button type="button" className="add-city-btn" onClick={addCity}><IconPlus /> Add another city</button>
            </div>
            <div className="field row2">
              <div>
                <label>Start date</label>
                <input type="date" value={startDate} onChange={e => setDates(d => ({ ...d, startDate: e.target.value }))} />
              </div>
              <div>
                <label>End date</label>
                <input type="date" value={endDate} onChange={e => setDates(d => ({ ...d, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Where you're staying (optional)</label>
              <input type="text" value={staying} onChange={e => setStaying(e.target.value)} placeholder="Hotel name, address, or neighborhood" />
            </div>
          </div>
          {error1 && <div className="error-box">{error1}</div>}
          <div className="nav-row">
            <button className="btn btn-primary" onClick={() => { if (validateStep1()) setStep(2); }}>
              Next <IconArrowRight />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="step">
          <div className="card">
            <div className="step-title">Set the vibe</div>
            <div className="step-desc">Pick what excites you — and how fast to move.</div>
            <div className="field">
              <label>Interests</label>
              <div className="chips">
                {INTERESTS.map(([val, label]) => (
                  <span key={val} className={`chip${interests.includes(val) ? ' active' : ''}`} onClick={() => toggleInterest(val)}>{label}</span>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Pace</label>
              <div className="pace-track">
                {PACE.map(([val, label]) => (
                  <div key={val} className={`pace-opt${pace === val ? ' active' : ''}`} onClick={() => setPace(val)}>{label}</div>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Who's traveling</label>
              <div className="travelers-grid">
                {TRAVELERS.map(([val, label]) => (
                  <div key={val} className={`travelers-opt${travelers === val ? ' active' : ''}`} onClick={() => setTravelers(val)}>{label}</div>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Arriving by</label>
              <div className="arrival-track">
                {ARRIVAL.map(([val, label]) => (
                  <div key={val} className={`arrival-opt${arrival === val ? ' active' : ''}`} onClick={() => setArrival(val)}>{label}</div>
                ))}
              </div>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Getting around</label>
              <div className="transport-track">
                {TRANSPORT.map(([val, label]) => (
                  <div key={val} className={`transport-opt${transport === val ? ' active' : ''}`} onClick={() => setTransport(val)}>{label}</div>
                ))}
              </div>
            </div>
          </div>
          <div className="nav-row">
            <button className="btn btn-ghost" onClick={() => setStep(1)} aria-label="Back to previous step"><IconArrowLeft /></button>
            <button className="btn btn-primary" onClick={() => setStep(3)}>Next <IconArrowRight /></button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="step">
          <div className="card">
            <div className="step-title">Final touches</div>
            <div className="step-desc">Budget and any last details.</div>
            <div className="field">
              <label>Budget level</label>
              <div className="budget-grid">
                {BUDGET.map(([val, label]) => (
                  <div key={val} className={`budget-opt${budget === val ? ' active' : ''}`} onClick={() => setBudget(val)}>{label}</div>
                ))}
              </div>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Anything else? (optional)</label>
              <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Traveling with kids, avoid early mornings, love street food..." />
            </div>
          </div>
          {error3 && <div className="error-box">{error3}</div>}
          <div className="nav-row">
            <button className="btn btn-ghost" onClick={() => setStep(2)} aria-label="Back to previous step"><IconArrowLeft /></button>
            <button className="btn btn-primary" onClick={handleGenerate}><IconSparkle /> Plan my trip</button>
          </div>
        </div>
      )}
    </div>
  );
}
