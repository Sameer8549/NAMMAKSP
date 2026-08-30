import React, { useState, useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { dataService } from '../../services/mockDataService';
import type { DistrictStats } from '../../types/analytics';
import {
  MapPin,
  Sparkles,
  Layers,
  Box,
  Globe,
  Compass,
  RotateCw,
  ShieldAlert
} from 'lucide-react';

interface Karnataka3DMapProps {
  selectedDistrictName?: string;
  onSelectDistrict?: (district: DistrictStats) => void;
  selectedCrimeCategory?: string;
}

type MapMode = '3D' | 'SATELLITE' | 'STANDARD' | 'HYBRID';

export const Karnataka3DMap: React.FC<Karnataka3DMapProps> = ({
  selectedDistrictName,
  onSelectDistrict
}) => {
  const districts = dataService.getDistricts();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const [selectedDistrict, setSelectedDistrict] = useState<DistrictStats>(
    districts.find(d => d.name === selectedDistrictName) || districts[0]
  );
  const [mapMode, setMapMode] = useState<MapMode>('3D');
  const [pitch, setPitch] = useState<number>(60);
  const [filterRisk, setFilterRisk] = useState<string>('ALL');
  const [isRotating, setIsRotating] = useState<boolean>(false);

  // Map Tile Style definitions (Using open free raster/vector tiles)
  const getStyleForMode = (mode: MapMode): maplibregl.StyleSpecification | string => {
    switch (mode) {
      case 'SATELLITE':
      case '3D':
      case 'HYBRID':
        return {
          version: 8,
          sources: {
            'esri-satellite': {
              type: 'raster',
              tiles: [
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
              ],
              tileSize: 256,
              attribution: 'Esri World Imagery | Karnataka State Police GIS'
            },
            'carto-labels': {
              type: 'raster',
              tiles: [
                'https://basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png'
              ],
              tileSize: 256
            }
          },
          layers: [
            {
              id: 'satellite-layer',
              type: 'raster',
              source: 'esri-satellite',
              minzoom: 0,
              maxzoom: 19
            },
            {
              id: 'labels-layer',
              type: 'raster',
              source: 'carto-labels',
              minzoom: 0,
              maxzoom: 19,
              layout: {
                visibility: mode === 'HYBRID' || mode === '3D' ? 'visible' : 'none'
              }
            }
          ]
        };
      case 'STANDARD':
      default:
        return {
          version: 8,
          sources: {
            'osm-tiles': {
              type: 'raster',
              tiles: [
                'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
              ],
              tileSize: 256,
              attribution: 'OpenStreetMap contributors'
            }
          },
          layers: [
            {
              id: 'osm-layer',
              type: 'raster',
              source: 'osm-tiles',
              minzoom: 0,
              maxzoom: 19
            }
          ]
        };
    }
  };

  // Initialize MapLibre GL Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: getStyleForMode('3D'),
      center: [75.8, 14.8], // Center of Karnataka State
      zoom: 6.8,
      pitch: 60,
      bearing: -20,
      maxPitch: 85
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), 'bottom-right');

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update map style when mapMode changes
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setStyle(getStyleForMode(mapMode));
    
    // Apply pitch/bearing appropriate for the mode
    if (mapMode === '3D') {
      mapRef.current.easeTo({ pitch: 60, bearing: -20, duration: 1000 });
      setPitch(60);
    } else {
      mapRef.current.easeTo({ pitch: 0, bearing: 0, duration: 800 });
      setPitch(0);
    }
  }, [mapMode]);

  // Render & Update Hotspot Markers on Map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const filteredDistricts = districts.filter(d => {
      if (filterRisk === 'ALL') return true;
      if (filterRisk === 'HIGH_ALERT') return d.riskStatus === 'HIGH_ALERT';
      if (filterRisk === 'MODERATE') return d.riskStatus === 'MODERATE';
      if (filterRisk === 'NORMAL') return d.riskStatus === 'NORMAL';
      return true;
    });

    filteredDistricts.forEach(district => {
      const isSelected = selectedDistrict.name === district.name;
      const riskColor = district.riskStatus === 'HIGH_ALERT' ? '#ef4444' : district.riskStatus === 'MODERATE' ? '#f59e0b' : '#10b981';

      // Create custom DOM element for 3D/2D marker
      const el = document.createElement('div');
      el.className = 'ksp-hotspot-marker';
      el.style.cssText = `
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: translate(-50%, -100%);
        z-index: ${isSelected ? 100 : 10};
      `;

      el.innerHTML = `
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          <div style="
            position: absolute;
            width: ${isSelected ? '48px' : '36px'};
            height: ${isSelected ? '48px' : '36px'};
            border-radius: 50%;
            background: rgba(${district.riskStatus === 'HIGH_ALERT' ? '239, 68, 68' : '245, 158, 11'}, 0.25);
            border: 2px solid ${riskColor};
            animation: pulse 1.8s infinite;
          "></div>

          <div style="
            width: ${isSelected ? '28px' : '20px'};
            height: ${isSelected ? '28px' : '20px'};
            border-radius: 50%;
            background: ${riskColor};
            border: 3px solid #ffffff;
            box-shadow: 0 0 16px ${riskColor};
            display: grid;
            place-items: center;
            transition: all 250ms ease;
          "></div>
        </div>

        <div style="
          margin-top: 4px;
          padding: 2px 8px;
          background: rgba(15, 23, 42, 0.92);
          border: 1.5px solid ${riskColor};
          border-radius: 4px;
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          letter-spacing: 0.02em;
        ">
          ${district.name.split(' ')[0]} (${district.totalCases})
        </div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        handleSelectDistrict(district);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([district.coordinates.lng, district.coordinates.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [selectedDistrict, mapMode, filterRisk]);

  // Handle District Selection & 3D FlyTo Camera Transition
  const handleSelectDistrict = (d: DistrictStats) => {
    setSelectedDistrict(d);
    if (onSelectDistrict) onSelectDistrict(d);

    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [d.coordinates.lng, d.coordinates.lat],
        zoom: mapMode === '3D' ? 9.5 : 9,
        pitch: mapMode === '3D' ? 65 : 0,
        bearing: mapMode === '3D' ? -25 : 0,
        duration: 1800,
        essential: true
      });
    }
  };

  // Adjust camera pitch
  const changePitch = (delta: number) => {
    if (!mapRef.current) return;
    const newPitch = Math.min(85, Math.max(0, pitch + delta));
    setPitch(newPitch);
    mapRef.current.easeTo({ pitch: newPitch, duration: 400 });
  };

  // Toggle continuous 3D camera orbit rotation
  useEffect(() => {
    let animationFrameId: number;
    const rotateCamera = () => {
      if (mapRef.current && isRotating) {
        const currentBearing = mapRef.current.getBearing();
        mapRef.current.setBearing(currentBearing + 0.3);
        animationFrameId = requestAnimationFrame(rotateCamera);
      }
    };

    if (isRotating) {
      animationFrameId = requestAnimationFrame(rotateCamera);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isRotating]);

  return (
    <div style={{
      backgroundColor: 'var(--surface-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      boxShadow: 'var(--shadow-sm)'
    }}>
      
      {/* 1. MAP HEADER & VIEW MODE CONTROLS */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <MapPin size={22} color="var(--accent)" />
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Karnataka State Spatial Hotspot & 3D Intelligence Observatory Map
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
              Free Map Engine with 3D Pitch View, Esri High-Res Satellite Imagery & Real-Time Hotspot Audits
            </p>
          </div>
        </div>

        {/* VIEW MODE TOGGLE BUTTONS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setMapMode('3D')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.74rem',
              fontWeight: 800,
              padding: '0.4rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: `1.5px solid ${mapMode === '3D' ? 'var(--accent)' : 'var(--border)'}`,
              backgroundColor: mapMode === '3D' ? 'var(--accent)' : 'var(--surface-muted)',
              color: mapMode === '3D' ? '#000000' : 'var(--text-primary)',
              cursor: 'pointer',
              boxShadow: mapMode === '3D' ? '0 0 12px rgba(217, 119, 6, 0.3)' : 'none',
              transition: 'all 180ms ease'
            }}
          >
            <Box size={14} />
            <span>3D VIEW</span>
          </button>

          <button
            onClick={() => setMapMode('SATELLITE')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.74rem',
              fontWeight: 800,
              padding: '0.4rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: `1.5px solid ${mapMode === 'SATELLITE' ? 'var(--accent)' : 'var(--border)'}`,
              backgroundColor: mapMode === 'SATELLITE' ? 'var(--accent)' : 'var(--surface-muted)',
              color: mapMode === 'SATELLITE' ? '#000000' : 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'all 180ms ease'
            }}
          >
            <Globe size={14} />
            <span>SATELLITE VIEW</span>
          </button>

          <button
            onClick={() => setMapMode('HYBRID')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.74rem',
              fontWeight: 800,
              padding: '0.4rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: `1.5px solid ${mapMode === 'HYBRID' ? 'var(--accent)' : 'var(--border)'}`,
              backgroundColor: mapMode === 'HYBRID' ? 'var(--accent)' : 'var(--surface-muted)',
              color: mapMode === 'HYBRID' ? '#000000' : 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'all 180ms ease'
            }}
          >
            <Layers size={14} />
            <span>HYBRID</span>
          </button>

          <button
            onClick={() => setMapMode('STANDARD')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.74rem',
              fontWeight: 800,
              padding: '0.4rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: `1.5px solid ${mapMode === 'STANDARD' ? 'var(--accent)' : 'var(--border)'}`,
              backgroundColor: mapMode === 'STANDARD' ? 'var(--accent)' : 'var(--surface-muted)',
              color: mapMode === 'STANDARD' ? '#000000' : 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'all 180ms ease'
            }}
          >
            <Compass size={14} />
            <span>STANDARD</span>
          </button>
        </div>
      </div>

      {/* RISK FILTER BAR & 3D CAMERA CONTROL STRIP */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem',
        padding: '0.5rem 0.85rem',
        backgroundColor: 'var(--surface-muted)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)'
      }}>
        {/* Risk Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', marginRight: '0.3rem' }}>
            HOTSPOT FILTER:
          </span>
          {['ALL', 'HIGH_ALERT', 'MODERATE', 'NORMAL'].map((f) => (
            <button
              key={f}
              onClick={() => setFilterRisk(f)}
              style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '0.25rem 0.55rem',
                borderRadius: '4px',
                border: '1px solid var(--border)',
                backgroundColor: filterRisk === f ? 'var(--accent)' : 'var(--surface-card)',
                color: filterRisk === f ? '#000000' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* 3D Camera Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent)' }}>
            3D CAMERA: {Math.round(pitch)}° TILT
          </span>
          <button
            onClick={() => changePitch(15)}
            className="admin-btn-secondary"
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', fontWeight: 800 }}
            title="Increase 3D Tilt Angle"
          >
            PITCH +
          </button>
          <button
            onClick={() => changePitch(-15)}
            className="admin-btn-secondary"
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', fontWeight: 800 }}
            title="Decrease 3D Tilt Angle"
          >
            PITCH -
          </button>
          <button
            onClick={() => setIsRotating(!isRotating)}
            style={{
              padding: '0.2rem 0.5rem',
              fontSize: '0.7rem',
              fontWeight: 800,
              borderRadius: '4px',
              border: '1px solid var(--accent)',
              backgroundColor: isRotating ? 'var(--accent)' : 'transparent',
              color: isRotating ? '#000000' : 'var(--accent)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
            title="Toggle Continuous 3D Camera Rotation Orbit"
          >
            <RotateCw size={12} style={{ animation: isRotating ? 'spin 3s linear infinite' : 'none' }} />
            <span>{isRotating ? 'ORBITING' : 'ORBIT 3D'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN MAP SPLIT: LEFT 3D/SATELLITE CANVAS | RIGHT BESIDE-MAP SIDE PANEL */}
      {/* ========================================================================= */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(360px, 1.8fr) minmax(320px, 1fr)',
        gap: '1.25rem',
        alignItems: 'stretch'
      }}>

        {/* MAP CANVAS CONTAINER */}
        <div style={{
          position: 'relative',
          backgroundColor: 'var(--surface-card)',
          borderRadius: 'var(--radius-md)',
          border: '1.5px solid var(--border)',
          minHeight: '540px',
          overflow: 'hidden',
          boxShadow: 'inset 0 0 24px rgba(0,0,0,0.3)'
        }}>
          {/* MapLibre DOM Target */}
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '540px' }} />

          {/* Active 3D Badge Overlay */}
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--border-accent)',
            borderRadius: 'var(--radius-md)',
            padding: '0.45rem 0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: 'var(--shadow-sm)',
            pointerEvents: 'none'
          }}>
            <Box size={16} color="var(--accent)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ffffff' }}>
              {mapMode} ENGINE ACTIVE
            </span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)' }} />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. RIGHT SIDE PANEL: COMPLETE INFORMATION BESIDE THE MAP                  */}
        {/* ========================================================================= */}
        <div style={{
          backgroundColor: 'var(--surface-card)',
          border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '1rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Header & Badges */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(217, 119, 6, 0.15)',
                    color: 'var(--accent)',
                    border: '1px solid var(--accent)'
                  }}>
                    CODE: {selectedDistrict.karnatakaCode}
                  </span>
                  <span className={`badge ${
                    selectedDistrict.riskStatus === 'HIGH_ALERT' ? 'badge-critical' : selectedDistrict.riskStatus === 'MODERATE' ? 'badge-warning' : 'badge-success'
                  }`} style={{ fontSize: '0.72rem' }}>
                    {selectedDistrict.riskStatus.replace('_', ' ')}
                  </span>
                </div>

                <h4 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
                  {selectedDistrict.name}
                </h4>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                  District Intelligence & Hotspot Audit Stream
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block' }}>
                  CRIME INDEX
                </span>
                <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--accent)' }}>
                  {selectedDistrict.crimeRatePerLakh} <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>/ Lakh</span>
                </span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem'
            }}>
              <div style={{
                padding: '0.75rem',
                backgroundColor: 'var(--surface-muted)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)'
              }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
                  TOTAL CASES
                </span>
                <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                  {selectedDistrict.totalCases}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--critical)', fontWeight: 700, display: 'block', marginTop: '0.15rem' }}>
                  ▲ {selectedDistrict.trendPercentage}% Surge
                </span>
              </div>

              <div style={{
                padding: '0.75rem',
                backgroundColor: 'var(--surface-muted)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)'
              }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
                  CLEARANCE RATE
                </span>
                <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--success)' }}>
                  {selectedDistrict.clearanceRate}%
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.15rem' }}>
                  {selectedDistrict.resolvedCases} Solved
                </span>
              </div>

              <div style={{
                padding: '0.75rem',
                backgroundColor: 'var(--surface-muted)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)'
              }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
                  PENDING FIRs
                </span>
                <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--warning)' }}>
                  {selectedDistrict.pendingCases}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.15rem' }}>
                  Active Investigation
                </span>
              </div>

              <div style={{
                padding: '0.75rem',
                backgroundColor: 'var(--surface-muted)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)'
              }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
                  DOMINANT OFFENSE
                </span>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--accent)', lineHeight: 1.25, display: 'block', marginTop: '0.2rem' }}>
                  {selectedDistrict.dominantCategory}
                </span>
              </div>
            </div>

            {/* Verified evidence scope for the selected district. */}
            <div style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--surface-muted)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.55rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <ShieldAlert size={15} color="var(--accent)" />
                  Verified district evidence
                </span>
                <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--accent)' }}>
                  {selectedDistrict.totalCases} FIRs
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                <span>Open or investigating:</span>
                <strong style={{ color: 'var(--warning)' }}>{selectedDistrict.pendingCases}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                <span>Resolved records:</span>
                <strong style={{ color: 'var(--success)' }}>{selectedDistrict.resolvedCases}</strong>
              </div>
            </div>

            {/* AI Pattern Advisory */}
            <div style={{
              padding: '0.75rem 0.9rem',
              backgroundColor: 'rgba(217, 119, 6, 0.1)',
              border: '1px solid rgba(217, 119, 6, 0.3)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.76rem',
              color: 'var(--text-primary)',
              lineHeight: 1.4
            }}>
              <strong style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Sparkles size={14} /> AI Spatial Assessment:
              </strong>
              {selectedDistrict.name} has {selectedDistrict.totalCases} verified FIRs. {selectedDistrict.dominantCategory} is the dominant recorded category and {selectedDistrict.pendingCases} cases remain open or under investigation.
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
