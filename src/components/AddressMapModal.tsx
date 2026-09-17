'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Flyout } from '@/components/common/Flyout';
import { Button } from '@/components/common/Button';
import { MapPin, Navigation, Search, Loader2, Check, AlertCircle } from 'lucide-react';

interface AddressMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAddress?: string;
  onSelectAddress: (address: string) => void;
}

interface SearchResultItem {
  display_name: string;
  lat: string;
  lon: string;
  distanceKm?: number;
}

// Calculate distance in kilometers (Haversine formula)
const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

export const AddressMapModal: React.FC<AddressMapModalProps> = ({
  isOpen,
  onClose,
  initialAddress = '',
  onSelectAddress,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchCacheRef = useRef<Map<string, SearchResultItem[]>>(new Map());

  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: 20.5937, // Default: centre of India
    lng: 78.9629,
  });
  const [userCountryCode, setUserCountryCode] = useState<string>('in');
  const [selectedAddress, setSelectedAddress] = useState(initialAddress);
  const [searchQuery, setSearchQuery] = useState(initialAddress);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>('');
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // ─── Load Leaflet CSS & JS dynamically ────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).L) { setLeafletLoaded(true); return; }

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setLeafletLoaded(true);
      document.head.appendChild(script);
    } else {
      setLeafletLoaded(true);
    }
  }, []);

  // ─── Click-outside closes suggestions ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ─── Mapbox Reverse Geocoding ──────────────────────────────────────────────
  const reverseGeocode = async (lat: number, lng: number) => {
    if (!MAPBOX_TOKEN) return;
    setIsGeocoding(true);
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1&language=en`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.features && data.features.length > 0) {
          const feat = data.features[0];
          setSelectedAddress(feat.place_name);
          setLocationStatus('Location pin updated');
          // Detect country code from context
          const countryCtx = feat.context?.find((c: any) => c.id.startsWith('country.'));
          if (countryCtx?.short_code) setUserCountryCode(countryCtx.short_code.toLowerCase());
        }
      }
    } catch (err) {
      console.error('Reverse geocode error:', err);
    } finally {
      setIsGeocoding(false);
    }
  };

  // ─── GPS Geolocation ───────────────────────────────────────────────────────
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation not supported by your browser.');
      return;
    }
    setIsLocating(true);
    setLocationStatus('Detecting your GPS position...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        setIsLocating(false);
        setLocationStatus('GPS location detected');

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 16);
          markerRef.current.setLatLng([latitude, longitude]);
        }
        reverseGeocode(latitude, longitude);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setIsLocating(false);
        setLocationStatus('Could not retrieve current location.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ─── Mapbox Forward Geocoding (Address Search) ────────────────────────────
  const fetchAddressSuggestions = async (queryStr: string): Promise<SearchResultItem[]> => {
    const trimmed = queryStr.trim();
    if (!trimmed || trimmed.length < 3 || !MAPBOX_TOKEN) return [];

    const cacheKey = `${trimmed.toLowerCase()}_${coords.lat.toFixed(2)}_${coords.lng.toFixed(2)}`;
    if (searchCacheRef.current.has(cacheKey)) {
      return searchCacheRef.current.get(cacheKey)!;
    }

    try {
      const params = new URLSearchParams({
        access_token: MAPBOX_TOKEN,
        limit: '8',
        language: 'en',
        // Bias results towards user's current location
        proximity: `${coords.lng},${coords.lat}`,
        // Restrict results to user's country for relevance
        country: userCountryCode,
        // Search all place types for maximum coverage
        types: 'address,poi,neighborhood,locality,place,district,region,postcode',
      });

      const encoded = encodeURIComponent(trimmed);
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?${params.toString()}`
      );

      if (!res.ok) return [];

      const data = await res.json();
      if (!data.features || data.features.length === 0) return [];

      const items: SearchResultItem[] = data.features.map((feat: any) => {
        const [lon, lat] = feat.center; // Mapbox returns [lon, lat]
        return {
          display_name: feat.place_name,
          lat: String(lat),
          lon: String(lon),
          distanceKm: getDistanceKm(coords.lat, coords.lng, lat, lon),
        };
      });

      // Sort nearest first
      items.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
      const final = items.slice(0, 6);
      searchCacheRef.current.set(cacheKey, final);
      return final;
    } catch (err) {
      console.error('Mapbox search error:', err);
      return [];
    }
  };

  // ─── Debounced Search Input Handler (400ms) ───────────────────────────────
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (value.trim().length >= 3) {
      debounceTimerRef.current = setTimeout(async () => {
        setIsSearching(true);
        const results = await fetchAddressSuggestions(value);
        setSearchResults(results);
        setShowSuggestions(true);
        setIsSearching(false);
      }, 400);
    } else {
      setSearchResults([]);
      setShowSuggestions(false);
    }
  };

  // ─── User Selects a Suggestion ────────────────────────────────────────────
  const handleSelectSuggestion = (item: SearchResultItem) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);

    setCoords({ lat, lng });
    setSelectedAddress(item.display_name);
    setSearchQuery(item.display_name);
    setShowSuggestions(false);
    setLocationStatus(`Map centered on: ${item.display_name.slice(0, 45)}...`);

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([lat, lng], 17);
      markerRef.current.setLatLng([lat, lng]);
    }
  };

  // ─── Initialize Leaflet Map (no zoom controls) ────────────────────────────
  useEffect(() => {
    if (!isOpen || !leafletLoaded || !mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false, // No + / - zoom buttons
      }).setView([coords.lat, coords.lng], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([coords.lat, coords.lng], { draggable: true }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setCoords({ lat: pos.lat, lng: pos.lng });
        reverseGeocode(pos.lat, pos.lng);
      });

      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        setCoords({ lat, lng });
        marker.setLatLng([lat, lng]);
        reverseGeocode(lat, lng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    } else {
      setTimeout(() => mapInstanceRef.current.invalidateSize(), 200);
    }
  }, [isOpen, leafletLoaded]);

  // ─── On modal open: geocode default address or use GPS ────────────────────
  useEffect(() => {
    if (!isOpen) return;

    if (initialAddress) {
      setSelectedAddress(initialAddress);
      setSearchQuery(initialAddress);
      fetchAddressSuggestions(initialAddress).then((results) => {
        if (results.length > 0) {
          const top = results[0];
          const lat = parseFloat(top.lat);
          const lng = parseFloat(top.lon);
          setCoords({ lat, lng });
          setSelectedAddress(top.display_name);
          setLocationStatus('Default address centered on map');
          if (mapInstanceRef.current && markerRef.current) {
            mapInstanceRef.current.setView([lat, lng], 15);
            markerRef.current.setLatLng([lat, lng]);
          }
        }
      });
    } else {
      handleGetCurrentLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialAddress]);

  const handleConfirm = () => {
    if (selectedAddress) {
      onSelectAddress(selectedAddress);
      onClose();
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Flyout
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 leading-tight">
              Select Shipping Location on Map
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Type any address, society, landmark or city to search
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <Button type="button" variant="outline" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleConfirm}
            disabled={!selectedAddress || isGeocoding}
            rightIcon={<Check className="w-4 h-4" />}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20"
          >
            Confirm Selected Location
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Search Bar + GPS Button */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          {/* Search Input with Autocomplete Dropdown */}
          <div ref={searchContainerRef} className="relative flex-1 w-full">
            <input
              type="text"
              placeholder="Search society, locality, street, city..."
              value={searchQuery}
              onChange={handleSearchInputChange}
              onFocus={() => { if (searchResults.length > 0) setShowSuggestions(true); }}
              className="w-full bg-slate-50 text-xs font-medium text-slate-900 pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 focus:bg-white transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            {isSearching && (
              <Loader2 className="w-4 h-4 text-indigo-600 animate-spin absolute right-3 top-3 pointer-events-none" />
            )}

            {/* Suggestions Dropdown */}
            {showSuggestions && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl shadow-xl border border-slate-200 max-h-56 overflow-y-auto divide-y divide-slate-100">
                {searchResults.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSuggestion(item)}
                    className="w-full px-3.5 py-2.5 text-left text-xs text-slate-700 hover:bg-indigo-50/80 hover:text-indigo-900 flex items-start justify-between gap-2.5 transition-all group"
                  >
                    <div className="flex items-start gap-2.5 truncate pr-2">
                      <MapPin className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0 mt-0.5" />
                      <span className="font-medium leading-relaxed group-hover:font-semibold truncate">
                        {item.display_name}
                      </span>
                    </div>
                    {item.distanceKm !== undefined && (
                      <span className="text-[10px] font-mono font-semibold text-slate-400 group-hover:text-indigo-600 shrink-0 mt-0.5">
                        {item.distanceKm < 1
                          ? `${Math.round(item.distanceKm * 1000)}m`
                          : `${Math.round(item.distanceKm)}km`}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {showSuggestions && !isSearching && searchResults.length === 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl shadow-lg border border-slate-200 p-3 text-center text-xs text-slate-500 font-medium">
                No locations found. Try a different search term.
              </div>
            )}
          </div>

          {/* GPS Button */}
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={isLocating}
            className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shrink-0"
          >
            <Navigation className={`w-3.5 h-3.5 text-indigo-600 ${isLocating ? 'animate-spin' : ''}`} />
            <span>Use Current Location</span>
          </button>
        </div>

        {/* Location Status Bar */}
        {locationStatus && (
          <div className="text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center justify-between">
            <span className="flex items-center gap-1.5 truncate pr-2">
              <AlertCircle className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="truncate">{locationStatus}</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono shrink-0">
              {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
            </span>
          </div>
        )}

        {/* Map Container */}
        <div className="relative w-full h-[340px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
          {!leafletLoaded && (
            <div className="absolute inset-0 bg-slate-100/90 flex flex-col items-center justify-center space-y-2 z-10">
              <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
              <p className="text-xs font-bold text-slate-600">Loading Interactive Map...</p>
            </div>
          )}
          <div ref={mapContainerRef} className="w-full h-full z-0" />
        </div>

        {/* Selected Address Card */}
        <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
              Selected Delivery Address
            </span>
            {isGeocoding && (
              <span className="text-[10px] font-bold text-indigo-600 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Detecting address...
              </span>
            )}
          </div>
          <p className="text-xs font-bold text-slate-900 leading-snug">
            {selectedAddress || 'No address selected. Click map or choose from suggestions.'}
          </p>
        </div>
      </div>
    </Flyout>
  );
};
