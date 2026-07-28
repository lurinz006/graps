import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Map, { Marker, Popup, NavigationControl, Source, Layer, useMap } from 'react-map-gl/mapbox';
import { MapPin, AlertCircle, Info, Maximize2, X, Trash2, Calendar, Clock } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

// Default initial viewport – centered on Zamboanga City.
// The map is NOT bounds-locked. This is only the starting position.
// Once points load, AutoFitter will fly to show all of them.
const INITIAL_VIEWPORT = {
  longitude: 122.0790,
  latitude: 6.9214,
  zoom: 10,
};

// ─── Computes bounding box for an array of points ─────────────────────────────
function getBounds(points) {
  let minLng = Infinity, maxLng = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;
  let valid = 0;

  points.forEach(p => {
    const lat = parseFloat(p.latitude);
    const lng = parseFloat(p.longitude);
    if (isNaN(lat) || isNaN(lng)) return;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    valid++;
  });

  if (valid === 0) return null;
  const padDeg = 0.02;
  return [
    [minLng - padDeg, minLat - padDeg],
    [maxLng + padDeg, maxLat + padDeg],
  ];
}

// ─── Auto-fit: runs inside Map context so useMap() works ─────────────────────
function AutoFitter({ points, focusLocation, barangayList = [] }) {
  const { grapsMap } = useMap();

  useEffect(() => {
    if (!grapsMap) return;

    if (focusLocation) {
      const bPoints = points.filter(p =>
        (p.barangay || p.name || '').toLowerCase().includes(focusLocation.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(focusLocation.toLowerCase())
      );

      if (bPoints.length > 0) {
        const bounds = getBounds(bPoints);
        if (bounds) {
          grapsMap.fitBounds(bounds, { padding: 80, duration: 1200, maxZoom: 15 });
          return;
        }
      } else {
        // Fallback: look up barangay coordinates from barangayList
        const brgy = barangayList.find(b => (b.name || '').toLowerCase() === focusLocation.toLowerCase());
        if (brgy && brgy.lat && brgy.lng) {
          const lat = parseFloat(brgy.lat);
          const lng = parseFloat(brgy.lng);
          const pad = 0.01;
          const bounds = [
            [lng - pad, lat - pad],
            [lng + pad, lat + pad]
          ];
          grapsMap.fitBounds(bounds, { padding: 80, duration: 1200, maxZoom: 15 });
          return;
        }
      }
    }

    const bounds = getBounds(points);
    if (!bounds) return;

    grapsMap.fitBounds(bounds, {
      padding: 60,
      duration: 900,
      maxZoom: 14
    });
  }, [grapsMap, points, focusLocation, barangayList]);

  return null;
}

// ─── Fit-All button: also inside Map context ──────────────────────────────────
function FitAllButton({ points }) {
  const { grapsMap } = useMap();

  const handleFit = useCallback(() => {
    if (!grapsMap) return;
    const bounds = getBounds(points);
    if (!bounds) return;
    grapsMap.fitBounds(bounds, { padding: 60, duration: 800, maxZoom: 14 });
  }, [grapsMap, points]);

  if (points.length === 0) return null;

  return (
    <button
      onClick={handleFit}
      title="Fit map to show all data points"
      className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-2 bg-slate-900/95 backdrop-blur-md border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl shadow-lg hover:bg-slate-800 hover:border-brand-500/60 transition-all duration-200"
    >
      <Maximize2 size={13} className="text-brand-400" />
      Fit All ({points.length})
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function MapContainer({ points = [], onAddPoint, onDeletePoint, barangayList = [], focusLocation = null, theme = 'dark' }) {
  const [showPins, setShowPins] = useState(INITIAL_VIEWPORT.zoom >= 12);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [pendingClickCoords, setPendingClickCoords] = useState(null);
  const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

  // Form states for adding incident via map click
  const [isAddMode, setIsAddMode] = useState(false);
  const [formBarangay, setFormBarangay] = useState('Santa Maria');
  const [formType, setFormType] = useState('Incident'); // Incident or Operation
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formTime, setFormTime] = useState('12:00');
  const [formSeverity, setFormSeverity] = useState('Medium');
  const [formDescription, setFormDescription] = useState('');
  const [formOffense, setFormOffense] = useState('Theft');
  const [formOffenseType, setFormOffenseType] = useState('Revised Penal Code');
  const [formIsCrime, setFormIsCrime] = useState('yes');
  const [formStage, setFormStage] = useState('CONSUMMATED');
  const [formStn, setFormStn] = useState('PS 07 (Sta. Maria)');
  const [formDateReported, setFormDateReported] = useState(new Date().toISOString().split('T')[0]);
  const [formTimeReported, setFormTimeReported] = useState('12:30');

  // Custom Wizard Picker states
  const [activeDateWizard, setActiveDateWizard] = useState(null);
  const [activeTimeWizard, setActiveTimeWizard] = useState(null);

  // Deletion states
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [pointToDelete, setPointToDelete] = useState(null);

  // Auto-fill the correct nearest barangay on map click
  useEffect(() => {
    if (pendingClickCoords && barangayList.length > 0) {
      let nearest = null;
      let minDistance = Infinity;
      barangayList.forEach(b => {
        // Simple distance squared formula
        const d = Math.pow(b.lat - pendingClickCoords.lat, 2) + Math.pow(b.lng - pendingClickCoords.lng, 2);
        if (d < minDistance) {
          minDistance = d;
          nearest = b.name;
        }
      });
      if (nearest) {
        setFormBarangay(nearest);
      }
    }
  }, [pendingClickCoords, barangayList]);

  // Combined list of barangays alphabetically
  const finalBarangays = useMemo(() => {
    if (barangayList.length > 0) {
      return barangayList.map(b => b.name);
    }
    // Fallback if list not loaded
    const names = new Set();
    points.forEach(p => {
      if (p.barangay && p.barangay !== 'Unassigned' && p.barangay !== 'N/A') {
        names.add(p.barangay);
      }
    });
    const list = Array.from(names).sort();
    return list.length > 0 ? list : ['Santa Maria', 'Tetuan', 'Calarian', 'Ayala', 'Sangali', 'Pasonanca', 'Divisoria', 'Mampang', 'Putik', 'Talon-talon'];
  }, [points, barangayList]);

  const canDeletePoint = (point) => {
    if (!point || !point.created_at) return false;
    const created = new Date(point.created_at);
    const now = new Date();
    const diffMs = now - created;
    const diffMins = diffMs / 1000 / 60;
    return diffMins >= 0 && diffMins < 5;
  };

  const hasToken = mapboxToken && mapboxToken.trim() !== '' && !mapboxToken.startsWith('your_');

  // Filter out any points with null/missing coords before building GeoJSON
  const validPoints = useMemo(() =>
    points.filter(p => p.latitude != null && p.longitude != null &&
      !isNaN(parseFloat(p.latitude)) && !isNaN(parseFloat(p.longitude))),
    [points]);

  // Convert to GeoJSON for heatmap layer
  const geojson = useMemo(() => ({
    type: 'FeatureCollection',
    features: validPoints.map(p => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [parseFloat(p.longitude), parseFloat(p.latitude)],
      },
      properties: {
        id: p.id,
        name: p.name,
        description: p.description,
        value: p.value || 10,
      },
    })),
  }), [validPoints]);

  const heatmapLayer = {
    id: 'heatmap-layer',
    type: 'heatmap',
    maxzoom: 15,
    paint: {
      'heatmap-weight': [
        'interpolate', ['linear'], ['get', 'value'],
        10, 0.2,
        25, 0.5,
        50, 0.8,
        100, 1
      ],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 9, 1, 15, 3],
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0, 'rgba(34, 197, 94, 0)',
        0.2, 'rgba(34, 197, 94, 0.6)', // Green (Low Risk)
        0.5, 'rgba(234, 179, 8, 0.75)', // Yellow (Moderate Risk)
        0.8, 'rgba(249, 115, 22, 0.85)', // Orange (High Risk)
        1, 'rgba(239, 68, 68, 0.95)', // Red (Critical Risk)
      ],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 9, 8, 15, 25],
      'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 11, 0.85, 12, 0],
    },
  };

  const pointsLayer = {
    id: 'points-layer',
    type: 'circle',
    minzoom: 9,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 4, 12, 6, 15, 10],
      'circle-color': [
        'step',
        ['get', 'value'],
        '#22c55e', // < 25: Green (Low)
        25, '#eab308', // 25-49: Yellow (Medium)
        50, '#f97316', // 50-99: Orange (High)
        100, '#ef4444' // >= 100: Red (Critical)
      ],
      'circle-stroke-width': 1.5,
      'circle-stroke-color': '#0f172a',
      'circle-opacity': 0.95,
    }
  };

  const handleMapClick = (event) => {
    const { features, lngLat } = event;
    if (features && features.length > 0) {
      const clickedFeature = features.find(f => f.layer.id === 'points-layer');
      if (clickedFeature && clickedFeature.properties && clickedFeature.properties.id) {
        const pointId = clickedFeature.properties.id;
        const point = points.find(p => p.id == pointId);
        if (point) {
          setSelectedPoint(prev => (prev && prev.id === point.id) ? null : point);
          return;
        }
      }
    }

    if (lngLat && onAddPoint && isAddMode) {
      setPendingClickCoords({ lng: lngLat.lng, lat: lngLat.lat });
    }
  };

  const getYear = (dateStr) => {
    if (!dateStr || dateStr === 'N/A') return 'N/A';
    return dateStr.split('-')[0] || 'N/A';
  };

  const getMonthName = (dateStr, monthly) => {
    if (monthly && monthly !== 'N/A') return monthly;
    if (!dateStr || dateStr === 'N/A') return 'N/A';
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months[d.getMonth()];
    }
    return 'N/A';
  };

  if (!hasToken) {
    return (
      <div className="relative w-full h-[500px] md:h-full bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center justify-center p-8 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
        <div className="relative z-10 max-w-md">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <AlertCircle size={32} />
          </div>
          <h3 className="text-xl font-semibold text-slate-100 mb-2">Mapbox Access Token Required</h3>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Please add your Mapbox Access Token to the environment variables to activate the map visualization.
          </p>
          <div className="bg-slate-950 border border-slate-850 rounded-lg p-4 text-left font-mono text-xs text-slate-300 select-all mb-6">
            # In /frontend/.env<br />
            VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
          </div>
          <a
            href="https://account.mapbox.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-slate-50 font-medium rounded-lg text-sm transition-colors duration-200"
          >
            Get Mapbox Token
          </a>
        </div>
      </div>
    );
  }

  // Show individual pins only when zoomed in past 12 (controlled by onZoom to prevent re-renders)

  return (
    <div className="w-full h-full relative border border-slate-800 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
      <Map
        id="grapsMap"
        initialViewState={INITIAL_VIEWPORT}
        mapboxAccessToken={mapboxToken}
        onZoom={(evt) => {
          const isZoomed = evt.viewState.zoom >= 12;
          if (isZoomed !== showPins) {
            setShowPins(isZoomed);
          }
        }}
        mapStyle={theme === 'light' ? "mapbox://styles/mapbox/light-v11" : "mapbox://styles/mapbox/dark-v11"}
        onClick={handleMapClick}
        interactiveLayerIds={['points-layer']}
        cursor="crosshair"
      // ⚠️ No maxBounds, minZoom, or maxZoom – map is fully pannable worldwide
      >
        <NavigationControl position="top-right" />

        {/* Auto-fit viewport to all loaded points on first render / data load */}
        <AutoFitter points={validPoints} focusLocation={focusLocation} barangayList={barangayList} />

        {/* Fit All button – top-left corner */}
        <FitAllButton points={validPoints} />

        {/* Toggle Add Mode Button */}
        {onAddPoint && (
          <button
            onClick={() => setIsAddMode(!isAddMode)}
            title="Toggle Add Incident Mode"
            className={`absolute top-4 left-[140px] z-10 flex items-center gap-1.5 px-3 py-2 bg-slate-900/95 backdrop-blur-md border text-xs font-semibold rounded-xl shadow-lg transition-all duration-200 ${isAddMode ? 'border-brand-500 text-brand-400 bg-slate-800' : 'border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800 hover:border-slate-600'}`}
          >
            <MapPin size={13} />
            {isAddMode ? 'Add Mode: ON' : 'Add Mode: OFF'}
          </button>
        )}

        {/* GPU-accelerated heatmap and points */}
        {validPoints.length > 0 && (
          <Source id="incidents-source" type="geojson" data={geojson}>
            <Layer {...heatmapLayer} />
            <Layer {...pointsLayer} />
          </Source>
        )}

        {selectedPoint && (
          <Popup
            longitude={parseFloat(selectedPoint.longitude)}
            latitude={parseFloat(selectedPoint.latitude)}
            anchor="top"
            closeButton={true}
            closeOnClick={false}
            onClose={() => setSelectedPoint(null)}
            className="rounded-xl overflow-hidden shadow-2xl"
          >
            <div className="text-sm p-2 bg-[#0B1120] text-[#f8fafc] w-[260px]">
              <h4 className="font-bold text-white text-[11px] uppercase leading-tight mb-1 break-words">{selectedPoint.name}</h4>
              <p className="text-[#A0AEC0] text-[10px] line-clamp-2 mt-1">{selectedPoint.description}</p>
              <div className="mt-2.5 pt-2 border-t border-[#2D3748] text-[9px] text-[#A0AEC0] flex justify-between gap-4">
                <div className="flex flex-col text-left gap-0.5">
                  <span className="font-semibold text-white">
                    {getYear(selectedPoint.date_committed)} • {getMonthName(selectedPoint.date_committed, selectedPoint.monthly)}
                  </span>
                  <span className="text-[9px] text-[#A0AEC0]">
                    {selectedPoint.time_committed || 'N/A'}
                  </span>
                </div>
                <div className="flex flex-col text-right justify-center gap-0.5 shrink-0 text-[#A0AEC0]">
                  <span>Lat: {parseFloat(selectedPoint.latitude).toFixed(6)}</span>
                  <span>Lng: {parseFloat(selectedPoint.longitude).toFixed(6)}</span>
                </div>
              </div>
              {onDeletePoint && canDeletePoint(selectedPoint) && (
                <div className="mt-3 pt-2 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPointToDelete(selectedPoint);
                      setIsDeleteConfirmOpen(true);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/20 text-rose-400 rounded-lg cursor-pointer transition-all"
                  >
                    <Trash2 size={10} /> Delete Incident
                  </button>
                </div>
              )}
            </div>
          </Popup>
        )}
      </Map>

      {/* Status hint bar – bottom left */}
      <div className="absolute bottom-4 left-4 right-4 md:right-auto bg-slate-900/95 backdrop-blur-md border border-slate-800 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 max-w-sm pointer-events-none z-10">
        <div className="bg-brand-500/20 text-brand-400 p-1.5 rounded-lg shrink-0">
          <Info size={16} />
        </div>
        <div>
          <h5 className="text-xs font-semibold text-slate-200">Hotspot Map Visualizer</h5>
          <p className="text-[9px] text-slate-400 leading-relaxed">
            {showPins
              ? `Zoomed In: Showing ${validPoints.length} individual pins. Click any pin to inspect.`
              : `Zoomed Out: Density heatmap active across ${validPoints.length} points. Zoom in past 12× for pins.`
            }
          </p>
        </div>
      </div>
      {/* 📍 ADD INCIDENT MAP CLICK FORM MODAL */}
      {pendingClickCoords && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setPendingClickCoords(null)}
              className="absolute top-5 right-5 text-slate-500 hover:text-slate-300 p-1.5 hover:bg-slate-850 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-brand-600 text-slate-50 flex items-center justify-center">
                <MapPin size={20} />
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Map Ingestion</span>
                <h3 className="text-sm font-bold text-slate-100 mt-0.5">Report Incident at Coordinates</h3>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 mb-4 font-mono text-[10px] text-slate-400 flex justify-between gap-4">
              <span>Latitude: {pendingClickCoords.lat.toFixed(6)}</span>
              <span>Longitude: {pendingClickCoords.lng.toFixed(6)}</span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const category = formType === 'Drug-Related (Buy Bust)' ? 'Operation' : formType;
                const cleanOffense = formOffense === 'Drug-Related (Buy Bust)' ? 'Buy Bust' : formOffense;
                const formattedIncidentType = `(${category}) ${cleanOffense}`;

                onAddPoint({
                  id: Date.now(),
                  longitude: pendingClickCoords.lng,
                  latitude: pendingClickCoords.lat,
                  pro: 'PRO 9',
                  ppo: 'ZAMBOANGA CPO',
                  stn: formStn,
                  region: 'ZAMBOANGA PENINSULA',
                  province: 'ZAMBOANGA CITY PO',
                  municipal: formStn,
                  barangay: formBarangay,
                  monthly: new Date(formDate).toLocaleString('en-US', { month: 'short' }),
                  date_reported: formDateReported,
                  time_reported: formTimeReported,
                  incident_type: formattedIncidentType,
                  date_committed: formDate,
                  time_committed: formTime,
                  offense: cleanOffense,
                  offense_type: formOffenseType,
                  is_crime: formIsCrime === 'yes',
                  stage_of_felony: formStage,
                  value: formSeverity === 'Critical' ? 100 : formSeverity === 'High' ? 50 : formSeverity === 'Medium' ? 25 : 10,
                  description: formDescription || `Manually reported incident in ${formBarangay}`,
                  name: `${category} - ${cleanOffense} (${formBarangay})`,
                  created_at: new Date().toISOString()
                });
                setPendingClickCoords(null);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Barangay Name</label>
                  <select
                    value={formBarangay}
                    onChange={(e) => {
                      const newBrgy = e.target.value;
                      setFormBarangay(newBrgy);
                      // Auto-update coordinates based on selected barangay
                      const matched = barangayList.find(b => b.name === newBrgy);
                      if (matched && matched.lat && matched.lng) {
                        setPendingClickCoords({ lat: parseFloat(matched.lat), lng: parseFloat(matched.lng) });
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-xl px-3 py-2.5 text-xs text-slate-100 outline-none cursor-pointer"
                  >
                    {finalBarangays.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Police Station (STN)</label>
                  <select
                    value={formStn}
                    onChange={(e) => setFormStn(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-xl px-3 py-2.5 text-xs text-slate-100 outline-none cursor-pointer"
                  >
                    <option value="PS 01 (Vitali)">PS 01 (Vitali)</option>
                    <option value="PS 02 (Curuan)">PS 02 (Curuan)</option>
                    <option value="PS 03 (Sangali)">PS 03 (Sangali)</option>
                    <option value="PS 04 (Culianan)">PS 04 (Culianan)</option>
                    <option value="PS 05 (Divisoria)">PS 05 (Divisoria)</option>
                    <option value="PS 06 (Tetuan)">PS 06 (Tetuan)</option>
                    <option value="PS 07 (Sta. Maria)">PS 07 (Sta. Maria)</option>
                    <option value="PS 08 (Sinunuc)">PS 08 (Sinunuc)</option>
                    <option value="PS 09 (Ayala)">PS 09 (Ayala)</option>
                    <option value="PS 10 (Labuan)">PS 10 (Labuan)</option>
                    <option value="PS 11 (Central)">PS 11 (Central)</option>
                    <option value="PS 12 (Zamboanga CPO)">PS 12 (Zamboanga CPO)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Incident Category</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-xl px-3 py-2.5 text-xs text-slate-100 outline-none cursor-pointer"
                  >
                    <option value="Incident">Incident</option>
                    <option value="Operation">Operation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Offense Subtype</label>
                  <select
                    value={formOffense}
                    onChange={(e) => setFormOffense(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-xl px-3 py-2.5 text-xs text-slate-100 outline-none cursor-pointer"
                  >
                    <option value="Theft">Theft</option>
                    <option value="Robbery">Robbery</option>
                    <option value="Vehicular Accident">Vehicular Accident</option>
                    <option value="Violence Against Women and Children">VAWC</option>
                    <option value="Drug-Related (Buy Bust)">Drugs (Buy Bust)</option>
                    <option value="Physical Injury">Physical Injury</option>
                    <option value="Rape">Rape</option>
                    <option value="Stabbing">Stabbing</option>
                    <option value="Shooting">Shooting</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Date Committed</label>
                  <div
                    onClick={() => setActiveDateWizard({ field: 'formDate', step: 1, year: null, month: null, day: null })}
                    className="w-full bg-slate-950 border border-slate-850 hover:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100 outline-none cursor-pointer flex justify-between items-center transition-colors"
                  >
                    <span>{formDate}</span>
                    <Calendar size={13} className="text-slate-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Time Committed</label>
                  <div
                    onClick={() => setActiveTimeWizard({ field: 'formTime', step: 1, ampm: null, hour: null, minute: null })}
                    className="w-full bg-slate-950 border border-slate-850 hover:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100 outline-none cursor-pointer flex justify-between items-center transition-colors"
                  >
                    <span>{formTime}</span>
                    <Clock size={13} className="text-slate-500" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Date Reported</label>
                  <div
                    onClick={() => setActiveDateWizard({ field: 'formDateReported', step: 1, year: null, month: null, day: null })}
                    className="w-full bg-slate-950 border border-slate-850 hover:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100 outline-none cursor-pointer flex justify-between items-center transition-colors"
                  >
                    <span>{formDateReported}</span>
                    <Calendar size={13} className="text-slate-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Time Reported</label>
                  <div
                    onClick={() => setActiveTimeWizard({ field: 'formTimeReported', step: 1, ampm: null, hour: null, minute: null })}
                    className="w-full bg-slate-950 border border-slate-850 hover:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100 outline-none cursor-pointer flex justify-between items-center transition-colors"
                  >
                    <span>{formTimeReported}</span>
                    <Clock size={13} className="text-slate-500" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Severity Level</label>
                <select
                  value={formSeverity}
                  onChange={(e) => setFormSeverity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-xl px-3 py-2.5 text-xs text-slate-100 outline-none cursor-pointer"
                >
                  <option value="Low">🟢 Low</option>
                  <option value="Medium">🟡 Medium</option>
                  <option value="High">🟠 High</option>
                  <option value="Critical">🔴 Critical</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-850">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Classification</label>
                  <select
                    value={formOffenseType}
                    onChange={(e) => setFormOffenseType(e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-slate-350 rounded-lg px-2 py-1 text-[10px] outline-none cursor-pointer"
                  >
                    <option value="Revised Penal Code">RPC</option>
                    <option value="Special Penal Law">SPL</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Is Crime?</label>
                  <select
                    value={formIsCrime}
                    onChange={(e) => setFormIsCrime(e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-slate-350 rounded-lg px-2 py-1 text-[10px] outline-none cursor-pointer"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Stage</label>
                  <select
                    value={formStage}
                    onChange={(e) => setFormStage(e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-slate-350 rounded-lg px-2 py-1 text-[10px] outline-none cursor-pointer"
                  >
                    <option value="CONSUMMATED">Consummated</option>
                    <option value="FRUSTRATED">Frustrated</option>
                    <option value="ATTEMPTED">Attempted</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Enter details or specifics about this report..."
                  className="w-full h-20 bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-xl px-3 py-2.5 text-xs text-slate-100 outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setPendingClickCoords(null)}
                  className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-brand-600 hover:bg-brand-500 text-slate-50 font-semibold rounded-xl px-4 py-2.5 text-xs shadow transition-all cursor-pointer"
                >
                  Create Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ⚠️ DELETE INCIDENT CONFIRMATION MODAL */}
      {isDeleteConfirmOpen && pointToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => { setIsDeleteConfirmOpen(false); setPointToDelete(null); }}
              className="absolute top-5 right-5 text-slate-500 hover:text-slate-300 p-1.5 hover:bg-slate-850 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                <AlertCircle size={20} />
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Incident Report</span>
                <h3 className="text-sm font-bold text-slate-100 mt-0.5">Delete Incident?</h3>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Are you sure you want to delete <strong className="text-slate-200">{pointToDelete.name || 'this incident'}</strong>? This action will permanently remove the record from the database.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setIsDeleteConfirmOpen(false); setPointToDelete(null); }}
                className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeletePoint(pointToDelete.id).then(success => {
                    if (success) {
                      setSelectedPoint(null);
                      setIsDeleteConfirmOpen(false);
                      setPointToDelete(null);
                    }
                  });
                }}
                className="bg-rose-600 hover:bg-rose-500 text-slate-50 font-semibold rounded-xl px-4 py-2 text-xs shadow transition-all cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 📅 CUSTOM 3-STEP DATE WIZARD PICKER MODAL */}
      {activeDateWizard && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setActiveDateWizard(null)}
              className="absolute top-5 right-5 text-slate-500 hover:text-slate-300 p-1.5 hover:bg-slate-850 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center shrink-0">
                <Calendar size={20} />
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Wizard Step {activeDateWizard.step} of 3</span>
                <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                  {activeDateWizard.step === 1 && 'Select Calendar Year'}
                  {activeDateWizard.step === 2 && 'Select Month'}
                  {activeDateWizard.step === 3 && 'Select Calendar Day'}
                </h3>
              </div>
            </div>

            {/* STEP 1: Select Year */}
            {activeDateWizard.step === 1 && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[2023, 2024, 2025, 2026].map(y => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setActiveDateWizard({ ...activeDateWizard, step: 2, year: y })}
                    className="p-3 bg-slate-950 hover:bg-brand-600 hover:text-slate-50 border border-slate-850 hover:border-brand-500 rounded-xl text-slate-200 text-xs font-semibold transition-all cursor-pointer"
                  >
                    {y}
                  </button>
                ))}
              </div>
            )}

            {/* STEP 2: Select Month */}
            {activeDateWizard.step === 2 && (
              <div className="grid grid-cols-3 gap-2.5 mb-4">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, idx) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setActiveDateWizard({ ...activeDateWizard, step: 3, month: idx })}
                    className="p-2 bg-slate-950 hover:bg-brand-600 hover:text-slate-50 border border-slate-850 hover:border-brand-500 rounded-xl text-slate-200 text-xs font-semibold transition-all cursor-pointer"
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}

            {/* STEP 3: Select Day */}
            {activeDateWizard.step === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-7 gap-1.5 max-h-[220px] overflow-y-auto p-1 bg-slate-950 border border-slate-850 rounded-xl">
                  {(() => {
                    const daysInMonth = new Date(activeDateWizard.year, activeDateWizard.month + 1, 0).getDate();
                    const dayButtons = [];
                    for (let d = 1; d <= daysInMonth; d++) {
                      dayButtons.push(
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            const formattedMonth = String(activeDateWizard.month + 1).padStart(2, '0');
                            const formattedDay = String(d).padStart(2, '0');
                            const fullDate = `${activeDateWizard.year}-${formattedMonth}-${formattedDay}`;
                            if (activeDateWizard.field === 'formDate') {
                              setFormDate(fullDate);
                            } else {
                              setFormDateReported(fullDate);
                            }
                            setActiveDateWizard(null);
                          }}
                          className="aspect-square flex items-center justify-center p-1 bg-slate-900 hover:bg-brand-600 hover:text-slate-50 border border-slate-800 rounded-lg text-slate-200 text-[11px] font-semibold transition-all cursor-pointer"
                        >
                          {d}
                        </button>
                      );
                    }
                    return dayButtons;
                  })()}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDateWizard({ ...activeDateWizard, step: 2, month: null })}
                  className="w-full bg-slate-950 border border-slate-800 text-[10px] text-slate-400 hover:text-slate-200 py-2 rounded-xl transition-colors"
                >
                  &larr; Back to Month Selection
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ⏰ CUSTOM 3-STEP TIME WIZARD PICKER MODAL */}
      {activeTimeWizard && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setActiveTimeWizard(null)}
              className="absolute top-5 right-5 text-slate-500 hover:text-slate-300 p-1.5 hover:bg-slate-850 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Wizard Step {activeTimeWizard.step} of 3</span>
                <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                  {activeTimeWizard.step === 1 && 'Select Morning or Afternoon'}
                  {activeTimeWizard.step === 2 && 'Select Hour (1 - 12)'}
                  {activeTimeWizard.step === 3 && 'Select Minutes'}
                </h3>
              </div>
            </div>

            {/* STEP 1: Select AM / PM */}
            {activeTimeWizard.step === 1 && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                {['AM', 'PM'].map(ampm => (
                  <button
                    key={ampm}
                    type="button"
                    onClick={() => setActiveTimeWizard({ ...activeTimeWizard, step: 2, ampm })}
                    className="p-4 bg-slate-950 hover:bg-brand-600 hover:text-slate-50 border border-slate-850 hover:border-brand-500 rounded-xl text-slate-200 text-sm font-bold tracking-wider transition-all cursor-pointer"
                  >
                    {ampm}
                  </button>
                ))}
              </div>
            )}

            {/* STEP 2: Select Hour */}
            {activeTimeWizard.step === 2 && (
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setActiveTimeWizard({ ...activeTimeWizard, step: 3, hour: h })}
                    className="p-3 bg-slate-950 hover:bg-brand-600 hover:text-slate-50 border border-slate-850 hover:border-brand-500 rounded-xl text-slate-200 text-xs font-semibold transition-all cursor-pointer"
                  >
                    {h}
                  </button>
                ))}
              </div>
            )}

            {/* STEP 3: Select Minutes */}
            {activeTimeWizard.step === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        let finalHour = activeTimeWizard.hour;
                        if (activeTimeWizard.ampm === 'PM' && finalHour !== 12) {
                          finalHour += 12;
                        } else if (activeTimeWizard.ampm === 'AM' && finalHour === 12) {
                          finalHour = 0;
                        }
                        const formattedHour = String(finalHour).padStart(2, '0');
                        const fullTime = `${formattedHour}:${m}:00`;
                        if (activeTimeWizard.field === 'formTime') {
                          setFormTime(fullTime);
                        } else {
                          setFormTimeReported(fullTime);
                        }
                        setActiveTimeWizard(null);
                      }}
                      className="p-3 bg-slate-950 hover:bg-brand-600 hover:text-slate-50 border border-slate-850 hover:border-brand-500 rounded-xl text-slate-200 text-xs font-semibold transition-all cursor-pointer"
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTimeWizard({ ...activeTimeWizard, step: 2, hour: null })}
                  className="w-full bg-slate-950 border border-slate-800 text-[10px] text-slate-400 hover:text-slate-200 py-2 rounded-xl transition-colors"
                >
                  &larr; Back to Hour Selection
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
