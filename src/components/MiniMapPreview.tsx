import React, { useEffect, useRef, useState } from 'react';
import { MapPin, ArrowUpRight, Loader2 } from 'lucide-react';
import { getGoogleMapsUrl } from '../types';

interface MiniMapPreviewProps {
  coordinates: string;
  t: (key: string) => string;
}

export function MiniMapPreview({ coordinates, t }: MiniMapPreviewProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Parse coordinates from string or Google Maps URL
  const parseCoords = (input: string): [number, number] | null => {
    if (!input || !input.trim()) return null;
    const val = input.trim();

    // 1. Coordinates format: lat, lng
    const regex = /^\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*$/;
    const match = val.match(regex);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return [lat, lng];
      }
    }

    // 2. Google Maps URL with @lat,lng
    const urlRegex = /@([-+]?\d+(?:\.\d+)?),([-+]?\d+(?:\.\d+)?)/;
    const urlMatch = val.match(urlRegex);
    if (urlMatch) {
      const lat = parseFloat(urlMatch[1]);
      const lng = parseFloat(urlMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return [lat, lng];
      }
    }

    // 3. Google Maps query query=lat,lng
    const qRegex = /[?&]query=([-+]?\d+(?:\.\d+)?),([-+]?\d+(?:\.\d+)?)/;
    const qMatch = val.match(qRegex);
    if (qMatch) {
      const lat = parseFloat(qMatch[1]);
      const lng = parseFloat(qMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return [lat, lng];
      }
    }

    // 4. Google Maps query q=lat,lng
    const qShortRegex = /[?&]q=([-+]?\d+(?:\.\d+)?),([-+]?\d+(?:\.\d+)?)/;
    const qShortMatch = val.match(qShortRegex);
    if (qShortMatch) {
      const lat = parseFloat(qShortMatch[1]);
      const lng = parseFloat(qShortMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return [lat, lng];
      }
    }

    // 5. Place URL with lat+lng
    const placeRegex = /\/place\/([-+]?\d+(?:\.\d+)?)\+([-+]?\d+(?:\.\d+)?)/;
    const placeMatch = val.match(placeRegex);
    if (placeMatch) {
      const lat = parseFloat(placeMatch[1]);
      const lng = parseFloat(placeMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return [lat, lng];
      }
    }

    return null;
  };

  const parsed = parseCoords(coordinates);
  const mapsUrl = getGoogleMapsUrl(coordinates);

  // Dynamic Leaflet Injection
  useEffect(() => {
    if (!parsed) return; // Only load map if we can parse the coordinates

    if ((window as any).L) {
      setIsLoaded(true);
      return;
    }

    // Injection of CSS
    const linkId = 'leaflet-css-cdn';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Injection of JS
    const scriptId = 'leaflet-js-cdn';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setIsLoaded(true);
      document.body.appendChild(script);
    } else {
      const interval = setInterval(() => {
        if ((window as any).L) {
          setIsLoaded(true);
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [parsed]);

  // Map Initialization
  useEffect(() => {
    if (!isLoaded || !containerRef.current || !parsed) return;
    const L = (window as any).L;
    if (!L) return;

    // Clean up any existing map instance on this container
    if (mapRef.current) {
      try {
        mapRef.current.remove();
      } catch (e) {
        console.error('Error removing map instance:', e);
      }
      mapRef.current = null;
    }

    try {
      mapRef.current = L.map(containerRef.current, {
        center: parsed,
        zoom: 14,
        zoomControl: true,
        scrollWheelZoom: false, // Prevent page scroll hijacking
        dragging: !L.Browser.mobile, // Disable map dragging on mobile for smoother page scrolling
        touchZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://openstreetmap.org" target="_blank">OSM</a>'
      }).addTo(mapRef.current);

      const defaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      markerRef.current = L.marker(parsed, {
        icon: defaultIcon
      }).addTo(mapRef.current);

      // Bind a simple pop-up to open Google Maps
      if (mapsUrl) {
        markerRef.current.bindPopup(
          `<div style="text-align: center; font-family: sans-serif; font-size: 11px; padding: 2px;">
            <strong style="display: block; margin-bottom: 4px;">Unit Location</strong>
            <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" style="color: #1d4ed8; font-weight: bold; text-decoration: underline;">
              ${t('Buka Google Maps')} &rarr;
            </a>
          </div>`
        );
      }

      // Force recalculate sizes to avoid rendering glitch (grey tiles)
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 200);

    } catch (err) {
      console.error('Leaflet initialization error:', err);
    }

    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          // ignore
        }
        mapRef.current = null;
      }
    };
  }, [isLoaded, coordinates]);

  // Clean, responsive layout
  return (
    <div className="bg-blue-50/50 rounded-2xl border border-blue-100/80 overflow-hidden flex flex-col p-4 gap-3 select-none">
      {/* Header Info */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${parsed ? 'border-b border-blue-100/60 pb-3' : ''}`}>
        <div className="flex items-start gap-2.5">
          <div className="p-2 bg-blue-100/80 text-blue-700 rounded-xl shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-blue-600 text-[10px] block uppercase font-bold tracking-wider mb-0.5">
              {t('Titik Koordinat / Maps')}
            </span>
            <span className="text-slate-800 font-mono font-bold text-xs break-all block leading-relaxed pr-2">
              {coordinates}
            </span>
          </div>
        </div>

        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all group shrink-0 cursor-pointer"
          >
            <span>{t('Buka Google Maps')}</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </a>
        )}
      </div>

      {/* Map or Fallback frame */}
      {parsed && (
        <div className="relative h-44 sm:h-52 bg-slate-100 rounded-xl overflow-hidden border border-slate-200/50 shadow-inner">
          {!isLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-50/90 z-20">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                {t('Memuat Peta...')}
              </span>
            </div>
          )}
          <div ref={containerRef} className="w-full h-full z-10" />
        </div>
      )}
    </div>
  );
}
