import React from 'react';
import karnatakaMapOverlayImg from '../../assets/karnataka_map_overlay.png';

export const KarnatakaMap: React.FC = () => {
  return (
    <div className="karnataka-intel-map">
      
      {/* AUTHORITATIVE SUPPLIED KARNATAKA MAP IMAGE ASSET */}
      <img
        src={karnatakaMapOverlayImg}
        alt="Karnataka State Map Intelligence Visual"
        className="karnataka-intel-map__image"
      />

      {/* CITY INTELLIGENCE OVERLAY ON TOP OF SUPPLIED MAP ASSET */}
      <svg
        viewBox="0 0 360 480"
        className="karnataka-intel-map__overlay"
      >
        {/* Fine Concentric Gold Mesh Rings around Bengaluru Primary Hub */}
        <circle className="map-ring" cx="270" cy="350" r="55" />
        <circle className="map-ring" cx="270" cy="350" r="95" />

        {/* Thin Gold Intelligence Connecting Lines */}
        <path className="map-line" d="M 270 350 Q 210 240 160 160" />
        <path className="map-line" d="M 270 350 Q 190 330 135 340" />
        <path className="map-line" d="M 270 350 Q 240 395 210 425" />
        <path className="map-line" d="M 160 160 Q 140 130 120 95" />
        <path className="map-line" d="M 160 160 Q 170 205 180 250" />

        {/* City Intelligence Node Markers */}

        {/* Belagavi */}
        <circle className="map-node" cx="120" cy="95" r="4" />
        <text className="map-label" x="130" y="99">Belagavi</text>

        {/* Hubballi */}
        <circle className="map-node" cx="160" cy="160" r="4" />
        <text className="map-label" x="170" y="164">Hubballi</text>

        {/* Shivamogga */}
        <circle className="map-node" cx="180" cy="250" r="4" />
        <text className="map-label" x="190" y="254">Shivamogga</text>

        {/* Mangaluru */}
        <circle className="map-node" cx="135" cy="340" r="4" />
        <text className="map-label" x="75" y="344">Mangaluru</text>

        {/* Bengaluru (Primary Hub Node with Restrained Pulse) */}
        <circle className="map-node--primary-halo" cx="270" cy="350" r="14" />
        <circle className="map-node--primary" cx="270" cy="350" r="5.5" />
        <text className="map-label" x="285" y="354">Bengaluru</text>

        {/* Mysuru */}
        <circle className="map-node" cx="210" cy="425" r="4" />
        <text className="map-label" x="220" y="429">Mysuru</text>

      </svg>
    </div>
  );
};

