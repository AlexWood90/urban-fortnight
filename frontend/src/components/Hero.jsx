import { useState } from 'react';
import { BrandMark, IconUser, IconBookmark } from '../lib/icons';

export default function Hero({ headline, sub, photoUrl, onBrand, onProfile, onSaved }) {
  const [photoOk, setPhotoOk] = useState(true);
  const hasPhoto = !!photoUrl && photoOk;

  return (
    <div className={`hero${hasPhoto ? ' has-photo' : ''}`}>
      {photoUrl && (
        <img
          className="hero-photo"
          src={photoUrl}
          alt=""
          style={{ display: photoOk ? 'block' : 'none' }}
          onLoad={() => setPhotoOk(true)}
          onError={() => setPhotoOk(false)}
        />
      )}
      <div className="hero-overlay" />
      {hasPhoto && photoUrl.includes('wikimedia.org') && (
        <a className="photo-credit hero-photo-credit" href="https://commons.wikimedia.org" target="_blank" rel="noopener noreferrer">
          Photo: Wikimedia Commons
        </a>
      )}
      <div className="hero-decor" />
      <div className="hero-top">
        <button className="brand" onClick={onBrand} aria-label="Go to home">
          <BrandMark />
          <span className="brand-name">Waypoint</span>
        </button>
        <div className="hero-top-actions">
          <button className="icon-btn" onClick={onProfile} title="Your profile" aria-label="Your profile"><IconUser /></button>
          <button className="icon-btn" onClick={onSaved} title="Saved trips" aria-label="Saved trips"><IconBookmark /></button>
        </div>
      </div>
      <div>
        <div className="hero-headline">
          {String(headline).split('\n').map((line, i, arr) => (
            <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
          ))}
        </div>
        <div className="hero-sub">{sub}</div>
      </div>
    </div>
  );
}
