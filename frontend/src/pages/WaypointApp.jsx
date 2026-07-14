import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Hero from '../components/Hero';
import Home from '../components/Home';
import Wizard from '../components/Wizard';
import TripView from '../components/TripView';
import ProfileModal from '../components/modals/ProfileModal';
import SavedTripsModal from '../components/modals/SavedTripsModal';
import PackingListModal from '../components/modals/PackingListModal';
import ShareModal from '../components/modals/ShareModal';
import JoinCodeModal from '../components/modals/JoinCodeModal';
import ConfirmModal from '../components/modals/ConfirmModal';
import { useProfile } from '../context/ProfileContext';
import { tripApi } from '../lib/tripApi';
import { fmtDate } from '../lib/time';

const TRAVELERS_LABELS = { solo: 'Solo', couple: 'Couple', family: 'Family', friends: 'Friends' };

export default function WaypointApp() {
  const { onboarded, loaded: profileLoaded } = useProfile();
  const location = useLocation();
  const navigate = useNavigate();

  const [view, setView] = useState('home'); // home | wizard | trip
  const [generating, setGenerating] = useState(false); // wizard -> generate in flight (keeps Wizard mounted so its fields survive a failure)
  const [openingTrip, setOpeningTrip] = useState(false); // opening an existing trip from home/saved
  const [loadingHero, setLoadingHero] = useState({ headline: 'Loading…', sub: '' });
  const [trips, setTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [trip, setTrip] = useState(null);
  const [modal, setModal] = useState(null); // 'profileWelcome' | 'profile' | 'saved' | 'packing' | 'share' | 'joinCode'
  const [confirmModal, setConfirmModal] = useState(null);
  const welcomeShown = useRef(false);
  const joinHandled = useRef(false);

  const refreshTrips = useCallback(async () => {
    setTripsLoading(true);
    try {
      const list = await tripApi.list();
      setTrips(list);
    } finally {
      setTripsLoading(false);
    }
  }, []);

  useEffect(() => { refreshTrips(); }, [refreshTrips]);

  useEffect(() => {
    if (profileLoaded && !onboarded && !welcomeShown.current) {
      welcomeShown.current = true;
      setModal('profileWelcome');
    }
  }, [profileLoaded, onboarded]);

  // A join link (or share redirect) can hand us an openTripId via router state.
  useEffect(() => {
    const openTripId = location.state?.openTripId;
    if (!openTripId || joinHandled.current) return;
    joinHandled.current = true;
    navigate(location.pathname, { replace: true, state: {} });
    openTrip(openTripId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // Live updates: refetch the open trip whenever the server pushes a change
  // (a collaborator's edit, or background weather/photo enrichment landing).
  useEffect(() => {
    if (view !== 'trip' || !trip?.id) return;
    const es = new EventSource(tripApi.eventsUrl(trip.id), { withCredentials: true });
    es.addEventListener('trip_updated', () => {
      tripApi.get(trip.id).then(setTrip).catch(() => {});
    });
    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, trip?.id]);

  function goHome() {
    setTrip(null);
    setView('home');
    refreshTrips();
  }

  function startWizard() {
    setView('wizard');
  }

  async function generateTrip(payload) {
    const isMulti = payload.extraCities.length > 0;
    const names = [payload.destination, ...payload.extraCities.map(c => c.name)];
    setLoadingHero({
      headline: isMulti ? `Planning ${names.join(' → ')}…` : `Planning ${payload.destination}…`,
      sub: `${fmtDate(payload.startDate)} — ${fmtDate(payload.endDate)}`,
    });
    setGenerating(true);
    try {
      const generated = await tripApi.generate(payload);
      setTrip(generated);
      setView('trip');
      refreshTrips();
    } finally {
      setGenerating(false);
    }
  }

  async function openTrip(id) {
    setLoadingHero({ headline: 'Loading trip…', sub: '' });
    setOpeningTrip(true);
    try {
      const opened = await tripApi.get(id);
      setTrip(opened);
      setView('trip');
      if (!opened.days.some(d => d.weather) || !opened.heroImageUrl) {
        tripApi.enrich(id).catch(() => {});
      }
    } catch {
      setView('home');
    } finally {
      setOpeningTrip(false);
    }
  }

  function requestDelete(t) {
    setConfirmModal({
      title: 'Delete this trip?',
      message: `"${t.destination || 'this trip'}" and its full itinerary will be permanently deleted. This can't be undone.`,
      confirmLabel: 'Delete trip',
      onConfirm: async () => {
        setConfirmModal(null);
        await tripApi.remove(t.id);
        if (trip?.id === t.id) { setTrip(null); setView('home'); }
        refreshTrips();
      },
    });
  }

  function saveTrip(updated) {
    setTrip(updated);
    tripApi.save(updated.id, updated).catch(err => console.error('Save failed', err));
  }

  async function regenerateDay(dayIdx) {
    const updated = await tripApi.regenerateDay(trip.id, dayIdx);
    setTrip(updated);
    return updated;
  }

  async function generatePackingList() {
    const updated = await tripApi.packingList(trip.id);
    setTrip(updated);
  }

  function togglePackingItem(key) {
    const next = structuredClone(trip);
    if (!next.packingChecked) next.packingChecked = {};
    next.packingChecked[key] = !next.packingChecked[key];
    saveTrip(next);
  }

  async function shareTrip() {
    const code = await tripApi.share(trip.id);
    setTrip(t => ({ ...t, shareCode: code }));
    return code;
  }

  async function joinByCode(code) {
    const joined = await tripApi.join(code);
    setModal(null);
    setTrip(joined);
    setView('trip');
    refreshTrips();
  }

  function heroContent() {
    if (generating || openingTrip) return { ...loadingHero, photoUrl: null };
    if (view === 'home') return { headline: 'Ready for\nyour next trip?', sub: 'Plan something new, or pick up where you left off.', photoUrl: null };
    if (view === 'wizard') return { headline: 'Where to\nnext?', sub: "Tell us the vibe — we'll build the route.", photoUrl: null };
    if (view === 'trip' && trip) {
      const travelersBit = trip.travelers ? ` · ${TRAVELERS_LABELS[trip.travelers] || trip.travelers}` : '';
      return {
        headline: trip.destination,
        sub: `${fmtDate(trip.startDate)} — ${fmtDate(trip.endDate)} · ${trip.days.length} day${trip.days.length > 1 ? 's' : ''}${travelersBit}`,
        photoUrl: trip.heroImageUrl,
      };
    }
    return { headline: '', sub: '', photoUrl: null };
  }

  const hero = heroContent();

  return (
    <div className="wrap">
      <Hero
        headline={hero.headline}
        sub={hero.sub}
        photoUrl={hero.photoUrl}
        onBrand={goHome}
        onProfile={() => setModal('profile')}
        onSaved={() => setModal('saved')}
      />

      {view !== 'trip' && (
        <div className="content">
          {view === 'home' && !openingTrip && (
            <Home
              trips={trips}
              loading={tripsLoading}
              onStart={startWizard}
              onOpenTrip={openTrip}
              onDelete={requestDelete}
              onSeeAll={() => setModal('saved')}
              onJoin={() => setModal('joinCode')}
            />
          )}
          {view === 'wizard' && (
            // Stays mounted (just hidden) while generating, so a failed
            // request doesn't wipe the fields the user already filled in.
            <div style={{ display: generating ? 'none' : 'block' }}>
              <Wizard onGenerate={generateTrip} />
            </div>
          )}
          {(generating || openingTrip) && (
            <div className="loading">
              <div className="globe"></div>
              <div className="loading-text">{generating ? 'Charting your route…' : 'Loading your trip…'}</div>
              {generating && <div className="loading-sub">Finding the best spots and timing</div>}
            </div>
          )}
        </div>
      )}

      {view === 'trip' && trip && (
        <TripView
          trip={trip}
          onSaveTrip={saveTrip}
          onRegenerateDay={regenerateDay}
          onOpenPacking={() => setModal('packing')}
          onOpenShare={() => setModal('share')}
          onNewTrip={startWizard}
        />
      )}

      {modal === 'profileWelcome' && <ProfileModal isWelcome onClose={() => setModal(null)} />}
      {modal === 'profile' && <ProfileModal onClose={() => setModal(null)} />}
      {modal === 'saved' && (
        <SavedTripsModal trips={trips} onOpen={id => { setModal(null); openTrip(id); }} onDelete={requestDelete} onClose={() => setModal(null)} />
      )}
      {modal === 'packing' && trip && (
        <PackingListModal trip={trip} onGenerate={generatePackingList} onToggleItem={togglePackingItem} onClose={() => setModal(null)} />
      )}
      {modal === 'share' && trip && (
        <ShareModal trip={trip} onShare={shareTrip} onClose={() => setModal(null)} />
      )}
      {modal === 'joinCode' && <JoinCodeModal onJoin={joinByCode} onClose={() => setModal(null)} />}
      {confirmModal && (
        <ConfirmModal title={confirmModal.title} message={confirmModal.message} confirmLabel={confirmModal.confirmLabel}
          onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(null)} />
      )}
    </div>
  );
}
