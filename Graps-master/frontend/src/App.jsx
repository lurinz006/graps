import React, { useState, useEffect, useMemo } from 'react';
import MapContainer from './components/MapContainer';
import DataUploader from './components/DataUploader';
import AnalyticsPanel from './components/AnalyticsPanel';
import IncidentsLog from './components/IncidentsLog';
import AlertsManager from './components/AlertsManager';
import OfficerDeployment from './components/OfficerDeployment';
import RecommendationsPanel from './components/RecommendationsPanel';
import RichAnalyticsPage from './components/RichAnalyticsPage';
import SettingsPanel from './components/SettingsPanel';
import {
  Layers,
  MapPin,
  Database,
  Server,
  Compass,
  LayoutDashboard,
  Map,
  UploadCloud,
  Shield,
  Users,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Settings,
  FileText,
  Activity,
  Bell,
  BarChart3,
  Star
} from 'lucide-react';

const INITIAL_POINTS = [];

export default function App() {
  const [points, setPoints] = useState([]);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [dbStatus, setDbStatus] = useState("Loading...");

  // Tab control — persisted across reloads
  const [activeTab, setActiveTabRaw] = useState(() => localStorage.getItem('graps_activeTab') || 'dashboard');
  const [mapFocus, setMapFocus] = useState(null);
  const setActiveTab = (tab, targetFocus = null) => {
    setActiveTabRaw(tab);
    localStorage.setItem('graps_activeTab', tab);
    if (typeof targetFocus === 'string') {
      setMapFocus(targetFocus);
    } else {
      setMapFocus(null);
    }
  };
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('graps_sidebarCollapsed') === 'true');
  const [unacknowledgedAlertsCount, setUnacknowledgedAlertsCount] = useState(0);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [barangayList, setBarangayList] = useState([]);

  const fetchUnackedAlertsCount = () => {
    fetch('http://localhost:8000/api/v1/alerts')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const unacked = data.filter(a => !a.acknowledged).length;
          setUnacknowledgedAlertsCount(unacked);
        }
      })
      .catch(err => console.error("Failed to fetch unacknowledged count:", err));
  };

  // Map page drawer toggle
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [mapDrawerTab, setMapDrawerTab] = useState('analytics'); // 'analytics' or 'coordinates'

  // Map Filter applied states (used in useMemo for rendering) — defaults to current year & month
  const [filterCategory, setFilterCategory] = useState('incident');
  const [filterSubtype, setFilterSubtype] = useState('all');
  const [filterYear, setFilterYear] = useState('2025');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterTime, setFilterTime] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');

  // Map Filter draft states (bound to UI controls)
  const [draftCategory, setDraftCategory] = useState('incident');
  const [draftSubtype, setDraftSubtype] = useState('all');
  const [draftYear, setDraftYear] = useState('2025');
  const [draftMonth, setDraftMonth] = useState('all');
  const [draftTime, setDraftTime] = useState('all');
  const [draftSeverity, setDraftSeverity] = useState('all');

  // Check if draft states differ from currently applied filters
  const hasFilterChanges = useMemo(() => {
    return draftCategory !== filterCategory ||
      draftSubtype !== filterSubtype ||
      draftYear !== filterYear ||
      draftMonth !== filterMonth ||
      draftTime !== filterTime ||
      draftSeverity !== filterSeverity;
  }, [draftCategory, filterCategory, draftSubtype, filterSubtype, draftYear, filterYear, draftMonth, filterMonth, draftTime, filterTime, draftSeverity, filterSeverity]);

  const handleApplyFilters = () => {
    setFilterCategory(draftCategory);
    setFilterSubtype(draftSubtype);
    setFilterYear(draftYear);
    setFilterMonth(draftMonth);
    setFilterTime(draftTime);
    setFilterSeverity(draftSeverity);
  };

  const handleResetFilters = () => {
    setDraftCategory('incident');
    setDraftSubtype('all');
    setDraftYear('2025');
    setDraftMonth('all');
    setDraftTime('all');
    setDraftSeverity('all');
    setFilterCategory('incident');
    setFilterSubtype('all');
    setFilterYear('2025');
    setFilterMonth('all');
    setFilterTime('all');
    setFilterSeverity('all');
  };

  // Dashboard Settings View Scope State — persisted to localStorage
  const [dashboardViewMode, setDashboardViewMode] = useState(
    () => localStorage.getItem('graps_dashboard_scope') || '1month'
  );
  const updateDashboardViewMode = (mode) => {
    setDashboardViewMode(mode);
    localStorage.setItem('graps_dashboard_scope', mode);
  };

  // Calculate dynamic dashboard points (default 1 month based on max date, or all)
  const dashboardPoints = useMemo(() => {
    if (dashboardViewMode === 'all' || points.length === 0) {
      return points;
    }

    // Find the most recent date in the points array
    let maxDate = null;
    points.forEach(p => {
      if (p.date_committed && p.date_committed !== 'N/A') {
        const d = new Date(p.date_committed);
        if (!isNaN(d.getTime())) {
          if (!maxDate || d > maxDate) {
            maxDate = d;
          }
        }
      }
    });

    const referenceDate = maxDate || new Date();
    const oneMonthMs = 30 * 24 * 60 * 60 * 1000;

    return points.filter(p => {
      if (p.date_committed && p.date_committed !== 'N/A') {
        const d = new Date(p.date_committed);
        if (!isNaN(d.getTime())) {
          return (referenceDate - d) <= oneMonthMs;
        }
      }
      return true; // Fallback if no date
    });
  }, [points, dashboardViewMode]);

  // Helper to extract the 4-digit year from date formats (YYYY-MM-DD, MM/DD/YYYY, etc.)
  const getYearFromDate = (dateStr) => {
    if (!dateStr || dateStr === 'N/A') return null;
    let year = dateStr.split('-')[0];
    if (!year || year.length !== 4 || isNaN(year)) {
      const parts = dateStr.split('/');
      const lastPart = parts[parts.length - 1];
      if (lastPart && lastPart.length === 4 && !isNaN(lastPart)) {
        year = lastPart;
      } else {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          year = d.getFullYear().toString();
        }
      }
    }
    return (year && year.length === 4 && !isNaN(year)) ? year : null;
  };

  // Helper to extract the 3-letter month abbreviation dynamically from date formats
  const getMonthFromDate = (dateStr) => {
    if (!dateStr || dateStr === 'N/A') return null;
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months[d.getMonth()];
    }
    return null;
  };

  // Extract unique years dynamically from the dataset
  const uniqueYears = useMemo(() => {
    const years = new Set();
    points.forEach(p => {
      const year = getYearFromDate(p.date_committed);
      if (year) {
        years.add(year);
      }
    });
    return Array.from(years).sort();
  }, [points]);

  // Filter coordinate points dynamically based on real CSV incidentType values
  const filteredPoints = useMemo(() => {
    return points.filter(p => {
      // 0. Filter Outliers (Coordinates outside Zamboanga City)
      const lat = parseFloat(p.latitude);
      if (!isNaN(lat) && lat > 7.4) return false;

      const type = p.incident_type || p.name || ''; // contains the incidentType, e.g. "(Incident) Vehicular Accident"

      // 1. Filter Category (Incidents vs Operations)
      const lowerType = type.toLowerCase();
      const isOperation = lowerType.includes('(operation)') ||
        lowerType.includes('operation') ||
        lowerType.includes('buy bust') ||
        lowerType.includes('pdea') ||
        lowerType.includes('check point') ||
        lowerType.includes('search warrant') ||
        lowerType.includes('entrapment') ||
        lowerType.includes('interdiction');

      if (filterCategory === 'incident' && isOperation) return false;
      if (filterCategory === 'operation' && !isOperation) return false;

      // 2. Filter Subtype
      if (filterSubtype !== 'all') {
        const lowerType = type.toLowerCase();
        if (filterSubtype === 'vehicular' && !lowerType.includes('vehicular accident')) return false;
        if (filterSubtype === 'vawc' && !lowerType.includes('violence against women')) return false;
        if (filterSubtype === 'theft' && !(lowerType.includes('theft') || lowerType.includes('robbery'))) return false;
        if (filterSubtype === 'injury' && !(lowerType.includes('physical injury') || lowerType.includes('mauling') || lowerType.includes('stabbing'))) return false;
        if (filterSubtype === 'drugs' && !lowerType.includes('buy bust')) return false;
        if (filterSubtype === 'gambling' && !lowerType.includes('gambling')) return false;
      }

      // 3. Filter Year
      if (filterYear !== 'all') {
        const year = getYearFromDate(p.date_committed);
        if (year !== filterYear) return false;
      }

      // 4. Filter Month
      if (filterMonth !== 'all') {
        const monthVal = (p.monthly && p.monthly !== 'N/A') ? p.monthly : (getMonthFromDate(p.date_committed) || '');
        if (monthVal.toLowerCase() !== filterMonth.toLowerCase()) return false;
      }

      // 5. Filter Time of Day
      if (filterTime !== 'all') {
        if (!p.time_committed || p.time_committed === 'N/A') return false;
        const hour = parseInt(p.time_committed.split(':')[0]);
        if (isNaN(hour)) return false;

        if (filterTime === 'morning') {
          if (hour < 6 || hour >= 12) return false;
        } else if (filterTime === 'afternoon') {
          if (hour < 12 || hour >= 18) return false;
        } else if (filterTime === 'night') {
          if (hour >= 6 && hour < 18) return false;
        }
      }

      // 6. Filter Severity
      if (filterSeverity !== 'all') {
        const val = p.value || 0;
        if (filterSeverity === 'Critical' && val < 100) return false;
        if (filterSeverity === 'High' && (val < 50 || val >= 100)) return false;
        if (filterSeverity === 'Medium' && (val < 25 || val >= 50)) return false;
        if (filterSeverity === 'Low' && val >= 25) return false;
      }

      return true;
    });
  }, [points, filterCategory, filterSubtype, filterYear, filterMonth, filterTime, filterSeverity]);

  // RBAC Authentication State with local storage persistence
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('graps_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Load incidents from local PostgreSQL DB on mount
  const loadPointsFromDB = () => {
    fetch('http://localhost:8000/api/v1/spatial-data')
      .then(res => {
        if (!res.ok) throw new Error("API response error");
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          const mapped = data.map(d => ({
            id: d.id,
            latitude: parseFloat(d.latitude),
            longitude: parseFloat(d.longitude),
            name: d.offense || d.incident_type || 'Incident Record',
            description: `Brgy: ${d.barangay || 'Unknown'} - ${d.offense_type || ''}`.trim(),
            created_at: d.time_committed || d.date_committed || new Date(d.created_at).toLocaleTimeString(),
            monthly: d.monthly_cycle || 'N/A',
            date_committed: d.date_committed || 'N/A',
            time_committed: d.time_committed || 'N/A',
            barangay: d.barangay || 'N/A',
            offense: d.offense || d.incident_type || 'N/A',
            incident_type: d.incident_type || 'N/A',
            value: d.value ? parseFloat(d.value) : 0
          }));
          setPoints(mapped);
          setDbStatus("Local PG Connected");
        }
      })
      .catch(() => {
        console.log("Laravel server offline. Falling back to local mockup data.");
        setPoints(INITIAL_POINTS);
        setDbStatus("Mock Fallback");
      });
  };

  const fetchBarangays = () => {
    fetch('http://localhost:8000/api/v1/barangays')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Sort alphabetically
          const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
          setBarangayList(sorted);
        }
      })
      .catch(err => console.error("Failed to load barangays list:", err));
  };

  useEffect(() => {
    loadPointsFromDB();
    fetchUnackedAlertsCount();
    fetchBarangays();
  }, []);

  const handleAddPoint = (newPoint) => {
    if (dbStatus.includes("Connected")) {
      fetch('http://localhost:8000/api/v1/spatial-data/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          data: [{
            lat: newPoint.latitude,
            lng: newPoint.longitude,
            pro: newPoint.pro || 'PRO 9',
            ppo: newPoint.ppo || 'ZAMBOANGA CPO',
            stn: newPoint.stn || 'PS 07 (Sta. Maria)',
            region: newPoint.region || 'ZAMBOANGA PENINSULA',
            province: newPoint.province || 'ZAMBOANGA CITY PO',
            municipal: newPoint.municipal || newPoint.stn || 'PS 07 (Sta. Maria)',
            barangay: newPoint.barangay || 'Unassigned',
            MONHTLY: newPoint.monthly || new Date(newPoint.date_committed || Date.now()).toLocaleString('en-US', { month: 'short' }),
            dateReported: newPoint.date_reported || newPoint.date_committed || new Date().toISOString().split('T')[0],
            timeReported: newPoint.time_reported || newPoint.time_committed || new Date().toTimeString().split(' ')[0],
            incidentType: newPoint.incident_type || 'Incident',
            dateCommitted: newPoint.date_committed || new Date().toISOString().split('T')[0],
            timeCommitted: newPoint.time_committed || new Date().toTimeString().split(' ')[0],
            offense: newPoint.offense || 'User Placed Marker',
            offenseType: newPoint.offense_type || 'Revised Penal Code',
            iscime: newPoint.is_crime !== false ? 'yes' : 'no',
            stageoffelony: newPoint.stage_of_felony || 'CONSUMMATED',
            value: newPoint.value || 1.0
          }]
        })
      })
        .then(res => res.json())
        .then(res => {
          if (res.success) {
            console.log("Persisted reported incident to Laravel successfully.");
            loadPointsFromDB();
            fetchUnackedAlertsCount();
          }
        })
        .catch(err => console.error("Failed to persist incident:", err));
    } else {
      setPoints(prevPoints => [newPoint, ...prevPoints]);
    }
  };

  const handleDeleteIncident = (id) => {
    if (dbStatus.includes("Connected")) {
      return fetch(`http://localhost:8000/api/v1/spatial-data/${id}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' }
      })
        .then(res => res.json())
        .then(res => {
          if (res.error) {
            alert(res.error);
            return false;
          }
          loadPointsFromDB();
          fetchUnackedAlertsCount();
          return true;
        })
        .catch(err => {
          console.error("Failed to delete point:", err);
          return false;
        });
    } else {
      setPoints(prevPoints => prevPoints.filter(p => p.id !== id));
      return Promise.resolve(true);
    }
  };

  const [clearConfirmStep, setClearConfirmStep] = useState(0); // 0=idle, 1=confirm shown
  const handleClearDatabase = () => {
    fetch('http://localhost:8000/api/v1/spatial-data/clear', {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' }
    })
      .then(res => res.json())
      .then(() => {
        setPoints([]);
        setClearConfirmStep(0);
      })
      .catch(() => {
        // Even if backend fails, clear local state
        setPoints([]);
        setClearConfirmStep(0);
      });
  };

  const handleLogin = (e) => {
    if (e) e.preventDefault();
    setLoginError('');

    let loggedInUser = null;
    // Check credentials matching seeded UserSeeder roles
    if (email === 'admin@graps.gov' && password === 'password') {
      loggedInUser = { name: 'ZCPO Administrator', email, role: 'admin' };
    } else if (email === 'analyst@graps.gov' && password === 'password') {
      loggedInUser = { name: 'ZCPO Intelligence Analyst', email, role: 'analyst' };
    } else if (email === 'chief@graps.gov' && password === 'password') {
      loggedInUser = { name: 'ZCPO Chief of Police', email, role: 'decision_maker' };
    }

    if (loggedInUser) {
      setUser(loggedInUser);
      localStorage.setItem('graps_user', JSON.stringify(loggedInUser));
    } else {
      setLoginError('Invalid email or password. Check the guides for seeded roles.');
    }
  };

  const handleQuickLogin = (role) => {
    let loggedInUser = null;
    if (role === 'admin') {
      loggedInUser = { name: 'ZCPO Administrator', email: 'admin@graps.gov', role: 'admin' };
    } else if (role === 'analyst') {
      loggedInUser = { name: 'ZCPO Intelligence Analyst', email: 'analyst@graps.gov', role: 'analyst' };
    } else if (role === 'chief') {
      loggedInUser = { name: 'ZCPO Chief of Police', email: 'chief@graps.gov', role: 'decision_maker' };
    }

    if (loggedInUser) {
      setUser(loggedInUser);
      localStorage.setItem('graps_user', JSON.stringify(loggedInUser));
    }
  };

  const handleLogout = () => {
    setUser(null);
    setEmail('');
    setPassword('');
    localStorage.removeItem('graps_user');
    setActiveTab('dashboard');
  };

  const handleDataUploaded = (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('task', 'train');
    formData.append('target_column', 'value');
    formData.append('feature_columns', 'latitude,longitude');

    return fetch('http://localhost:8000/api/v1/spatial-data/upload-file', {
      method: 'POST',
      headers: {
        'Accept': 'application/json'
      },
      body: formData
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            throw new Error(err.error || `Server error: ${res.status}`);
          });
        }
        return res.json();
      })
      .then(response => {
        console.log('Synced file with Laravel DB:', response);
        loadPointsFromDB();
        fetchUnackedAlertsCount();
      });
  };


  // 1. RENDER LOGIN SCREEN IF UNAUTHENTICATED
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center font-sans p-6">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-brand-600 via-sky-400 to-violet-500"></div>

          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center text-slate-950 shadow-lg shadow-brand-500/20 mb-3">
              <Compass size={26} className="stroke-[2.5]" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-brand-300 bg-clip-text text-transparent">
              GRAPS Portal Login
            </h1>
            <p className="text-xs text-slate-500 text-center mt-1">
              Geospatial Real-time Analytics & Prediction System
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. analyst@graps.gov"
                className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
                required
              />
            </div>

            {loginError && (
              <p className="text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3.5 py-2.5 rounded-lg">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-brand-600 hover:bg-brand-500 text-slate-50 font-semibold text-sm rounded-xl py-3 shadow-lg shadow-brand-500/15 hover:shadow-brand-500/25 transition-all mt-6"
            >
              Sign In
            </button>
          </form>

          {/* Quick login bypass for Capstone presentation */}
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <span className="block text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Quick Authenticate (Bypass)
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleQuickLogin('admin')}
                className="bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-[10px] font-bold py-2 px-1 rounded-lg text-slate-300 transition-colors"
              >
                🔐 Admin
              </button>
              <button
                onClick={() => handleQuickLogin('analyst')}
                className="bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-[10px] font-bold py-2 px-1 rounded-lg text-slate-300 transition-colors"
              >
                📊 Analyst
              </button>
              <button
                onClick={() => handleQuickLogin('chief')}
                className="bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-[10px] font-bold py-2 px-1 rounded-lg text-slate-300 transition-colors"
              >
                👮 Chief
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. DASHBOARD VIEW DEFINITIONS
  const isAdmin = user.role === 'admin';
  const isAnalyst = user.role === 'analyst';
  const isChief = user.role === 'decision_maker';
  const renderModularTabContent = () => {
    switch (activeTab) {
      case 'settings':
        return (
          <SettingsPanel
            user={user}
            dbStatus={dbStatus}
            clearConfirmStep={clearConfirmStep}
            setClearConfirmStep={setClearConfirmStep}
            handleClearDatabase={handleClearDatabase}
            dashboardViewMode={dashboardViewMode}
            updateDashboardViewMode={updateDashboardViewMode}
          />
        );
      case 'incidents':
        return <IncidentsLog points={points} onAddPoint={handleAddPoint} onDeletePoint={handleDeleteIncident} barangayList={barangayList} user={user} />;
      case 'alerts':
        return <AlertsManager user={user} onAlertsCountChanged={setUnacknowledgedAlertsCount} onNavigateToTab={setActiveTab} />;
      case 'deployment':
        return <OfficerDeployment user={user} filterYear={filterYear} filterMonth={filterMonth} />;

      case 'recommendations':
        return <RecommendationsPanel points={points} onNavigateToTab={setActiveTab} />;
      case 'analytics':
        return <RichAnalyticsPage />;
      default:
        return null;
    }
  };

  // --- DYNAMIC DASHBOARD STATS ---
  const dynamicStats = useMemo(() => {
    if (dashboardPoints.length === 0) {
      return { criticalZones: 0, sectors: 0, officers: 0 };
    }
    
    // Count incidents per barangay
    const counts = {};
    dashboardPoints.forEach(p => {
      if (p.barangay && p.barangay !== 'N/A' && p.barangay !== 'Unassigned') {
        counts[p.barangay] = (counts[p.barangay] || 0) + 1;
      }
    });
    
    const activeBarangays = Object.keys(counts).length;
    
    // Critical zones: Barangays with significantly higher than average incidents
    const values = Object.values(counts);
    const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const critical = values.filter(v => v > (avg * 1.5)).length || (activeBarangays > 3 ? 3 : activeBarangays);
    
    // Assume 2 officers per active sector/barangay as a baseline estimate
    const officers = activeBarangays * 2;

    return {
      criticalZones: critical,
      sectors: activeBarangays,
      officers: officers
    };
  }, [dashboardPoints]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans selection:bg-brand-500/30 selection:text-brand-200">

      {/* 🧭 Vertical Left Sidebar Menu Bar */}
      <aside className={`h-screen sticky top-0 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 transition-all duration-300 overflow-hidden ${isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}>
        <div className="flex flex-col flex-1 min-h-0">
          {/* Brand Header & Toggle (Dynamic layout based on collapse state) */}
          {isSidebarCollapsed ? (
            /* Collapsed State: Vertical stack */
            <div className="p-4 border-b border-slate-800 flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center text-slate-950 shadow-md shrink-0">
                <Compass size={18} className="stroke-[2.5]" />
              </div>

              {/* Collapse Arrow Button below the logo */}
              <button
                onClick={() => { const next = !isSidebarCollapsed; setIsSidebarCollapsed(next); localStorage.setItem('graps_sidebarCollapsed', next); }}
                className="w-full flex items-center justify-center py-1.5 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-slate-200 transition-colors border border-slate-800/40 focus:outline-none"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          ) : (
            /* Expanded State: Horizontal layout */
            <div className="p-4 h-16 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center text-slate-950 shadow-md shrink-0">
                  <Compass size={18} className="stroke-[2.5]" />
                </div>
                <div className="truncate">
                  <h1 className="text-md font-bold tracking-tight bg-gradient-to-r from-slate-100 to-brand-300 bg-clip-text text-transparent">
                    GRAPS
                  </h1>
                  <p className="text-[8px] text-slate-500 font-semibold uppercase tracking-wider">
                    ZCPO Analytics
                  </p>
                </div>
              </div>

              {/* Collapse Arrow Button horizontally aligned */}
              <button
                onClick={() => { const next = !isSidebarCollapsed; setIsSidebarCollapsed(next); localStorage.setItem('graps_sidebarCollapsed', next); }}
                className="text-slate-400 hover:text-slate-200 focus:outline-none p-1.5 hover:bg-slate-850 rounded-lg transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5 flex-1 overflow-y-auto">
            <button
              onClick={() => setActiveTab('dashboard')}
              title="Dashboard Overview"
              className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all ${isSidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'
                } ${activeTab === 'dashboard'
                  ? 'bg-brand-600 text-slate-50 shadow-lg shadow-brand-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
            >
              <LayoutDashboard size={16} className="shrink-0" />
              {!isSidebarCollapsed && <span className="truncate">Dashboard Overview</span>}
            </button>

            <button
              onClick={() => setActiveTab('map')}
              title="Interactive Map"
              className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all ${isSidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'
                } ${activeTab === 'map'
                  ? 'bg-brand-600 text-slate-50 shadow-lg shadow-brand-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
            >
              <Map size={16} className="shrink-0" />
              {!isSidebarCollapsed && <span className="truncate">Interactive Map</span>}
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              title="Interactive Analytics"
              className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all ${isSidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'
                } ${activeTab === 'analytics'
                  ? 'bg-brand-600 text-slate-50 shadow-lg shadow-brand-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
            >
              <BarChart3 size={16} className="shrink-0" />
              {!isSidebarCollapsed && <span className="truncate">Interactive Analytics</span>}
            </button>

            <button
              onClick={() => setActiveTab('incidents')}
              title="Incident Reports Log"
              className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all ${isSidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'
                } ${activeTab === 'incidents'
                  ? 'bg-brand-600 text-slate-50 shadow-lg shadow-brand-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
            >
              <FileText size={16} className="shrink-0" />
              {!isSidebarCollapsed && <span className="truncate">Incident Reports Log</span>}
            </button>

            <button
              onClick={() => setActiveTab('deployment')}
              title="Officer Deployment"
              className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all ${isSidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'
                } ${activeTab === 'deployment'
                  ? 'bg-brand-600 text-slate-50 shadow-lg shadow-brand-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
            >
              <Users size={16} className="shrink-0" />
              {!isSidebarCollapsed && <span className="truncate">Officer Deployment</span>}
            </button>


            <button
              onClick={() => setActiveTab('alerts')}
              title="Alerts & Warnings"
              className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all relative ${isSidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'
                } ${activeTab === 'alerts'
                  ? 'bg-brand-600 text-slate-50 shadow-lg shadow-brand-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
            >
              <Bell size={16} className="shrink-0" />
              {!isSidebarCollapsed && (
                <div className="flex-1 flex justify-between items-center min-w-0">
                  <span className="truncate">Alerts & Warnings</span>
                  {unacknowledgedAlertsCount > 0 && (
                    <span className="bg-rose-500 text-slate-100 text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 min-w-[16px] text-center">
                      {unacknowledgedAlertsCount}
                    </span>
                  )}
                </div>
              )}
              {isSidebarCollapsed && unacknowledgedAlertsCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-slate-950"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('recommendations')}
              title="Recommendations"
              className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all ${isSidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'
                } ${activeTab === 'recommendations'
                  ? 'bg-brand-600 text-slate-50 shadow-lg shadow-brand-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
            >
              <Compass size={16} className="shrink-0" />
              {!isSidebarCollapsed && <span className="truncate">Recommendations</span>}
            </button>

            <button
              onClick={() => setActiveTab('import')}
              title="Import CSV/Dataset"
              className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all ${isSidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'
                } ${activeTab === 'import'
                  ? 'bg-brand-600 text-slate-50 shadow-lg shadow-brand-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
            >
              <UploadCloud size={16} className="shrink-0" />
              {!isSidebarCollapsed && <span className="truncate">Import CSV/Dataset</span>}
            </button>
          </nav>
        </div>

        {/* User profile card & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="mb-3 px-1 overflow-hidden">
            {isSidebarCollapsed ? (
              <div className="w-8 h-8 rounded-full bg-brand-500/15 border border-brand-500/25 flex items-center justify-center text-brand-400 text-xs font-bold mx-auto" title={user.name}>
                {user.name.charAt(0)}
              </div>
            ) : (
              <>
                <span className="block text-xs font-bold text-slate-200 truncate">{user.name}</span>
                <span className="inline-block text-[8px] font-bold px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/25 mt-1 uppercase tracking-wider">
                  {user.role === 'admin' ? 'Administrator' : user.role === 'analyst' ? 'Analyst' : 'Chief of Police'}
                </span>
              </>
            )}
          </div>
          <div className={isSidebarCollapsed ? "flex flex-col gap-2" : "flex gap-2 w-full items-center"}>
            <button
              onClick={() => setIsLogoutConfirmOpen(true)}
              title="Log Out"
              className={`bg-slate-950 hover:bg-slate-850 border border-slate-800 text-[10px] font-bold py-2.5 rounded-lg text-slate-455 hover:text-rose-450 hover:border-rose-500/20 transition-colors flex items-center justify-center gap-1.5 ${isSidebarCollapsed ? 'w-full' : 'w-[75%]'
                }`}
            >
              <Users size={12} className="rotate-180" />
              {!isSidebarCollapsed && 'Exit'}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              title="System Settings"
              className={`bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-450 hover:text-brand-450 transition-colors flex items-center justify-center rounded-lg ${isSidebarCollapsed
                ? 'w-full py-2.5'
                : 'w-10 h-10 shrink-0'
                } ${activeTab === 'settings' ? 'text-brand-400 border-brand-500/20 bg-brand-500/5' : ''}`}
            >
              <Settings size={13} className={activeTab === 'settings' ? 'animate-[spin_4s_linear_infinite]' : ''} />
            </button>
          </div>
        </div>
      </aside>

      {/* 🚀 Main Window Area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top Status Bar */}
        <header className="h-16 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-350 capitalize tracking-wide">
              {activeTab} Workspace
            </span>
            <span className="text-slate-700">|</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${dbStatus.includes("Connected")
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
              {dbStatus}
            </span>
          </div>

        </header>

        {/* 📑 Tab Selection Rendering */}
        <div className="flex-1 overflow-y-auto relative bg-slate-950">
          {activeTab === 'dashboard' ? (
            <div className="p-8 max-w-[1600px] w-full mx-auto space-y-8">

              {/* 4 Summary Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Card 1: Active Hotspot */}
                <div onClick={() => setActiveTab('map')} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-xl cursor-pointer hover:scale-[1.02] hover:ring-2 hover:ring-brand-500/50 transition-all">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Active Hotspots</span>
                    <span className="text-2xl font-bold text-brand-400 block mt-1">
                      {dashboardPoints.length === 0 ? "0 Nodes" : `${dashboardPoints.length} Nodes`}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Stored coordinates</span>
                  </div>
                  <div className="w-12 h-12 bg-brand-500/10 text-brand-400 rounded-xl flex items-center justify-center shrink-0">
                    <MapPin size={24} />
                  </div>
                </div>

                {/* Card 2: Critical Zone */}
                <div onClick={() => setActiveTab('recommendations')} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-xl cursor-pointer hover:scale-[1.02] hover:ring-2 hover:ring-rose-500/50 transition-all">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Critical Zones</span>
                    <span className="text-2xl font-bold text-rose-450 block mt-1">
                      {dashboardPoints.length === 0 ? "0 Predicted" : `${dynamicStats.criticalZones} Predicted`}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">By ML Regression model</span>
                  </div>
                  <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center shrink-0">
                    <AlertTriangle size={24} />
                  </div>
                </div>

                {/* Card 3: Patrol Sectors */}
                <div onClick={() => setActiveTab('deployment')} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-xl cursor-pointer hover:scale-[1.02] hover:ring-2 hover:ring-sky-500/50 transition-all">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Patrol Sectors</span>
                    <span className="text-2xl font-bold text-slate-100 block mt-1">
                      {dashboardPoints.length === 0 ? "0 Sectors" : `${dynamicStats.sectors} Sectors`}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Zamboanga Police Districts</span>
                  </div>
                  <div className="w-12 h-12 bg-sky-500/10 text-sky-400 rounded-xl flex items-center justify-center shrink-0">
                    <Shield size={24} />
                  </div>
                </div>

                {/* Card 4: Officers Active */}
                <div onClick={() => setActiveTab('deployment')} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-xl cursor-pointer hover:scale-[1.02] hover:ring-2 hover:ring-violet-500/50 transition-all">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Officers Active</span>
                    <span className="text-2xl font-bold text-slate-100 block mt-1">
                      {dashboardPoints.length === 0 ? "0 Active" : `${dynamicStats.officers} Active`}
                    </span>
                    <span className="text-[10px] text-emerald-400 block mt-0.5 flex items-center gap-0.5">
                      <TrendingUp size={10} /> {dashboardPoints.length === 0 ? "No active dispatch" : "100% duty deployment"}
                    </span>
                  </div>
                  <div className="w-12 h-12 bg-violet-500/10 text-violet-400 rounded-xl flex items-center justify-center shrink-0">
                    <Users size={24} />
                  </div>
                </div>
              </div>

              {/* Overview Details Section */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Recent Incident Nodes Feed */}
                {/* Recent Incidents Table Feed */}
                <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col h-[400px]">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-200">Recent Incidents</h3>
                      <p className="text-[10px] text-slate-500">Detailed logs from local ZCPO database</p>
                    </div>

                  </div>

                  <div className="overflow-auto flex-1 pr-1">
                    {dashboardPoints.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-slate-550 py-16 border border-slate-850/40 border-dashed rounded-xl bg-slate-950/20">
                        No active incident records found in selected window
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse min-w-[500px]">
                        <thead>
                          <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-2.5 px-3">Monthly</th>
                            <th className="py-2.5 px-3">Date Committed</th>
                            <th className="py-2.5 px-3">Time</th>
                            <th className="py-2.5 px-3">Barangay</th>
                            <th className="py-2.5 px-3">Incident / Offense</th>
                            <th className="py-2.5 px-3 text-right">Coordinates</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850/40 text-xs">
                          {dashboardPoints.map((pt) => (
                            <tr key={pt.id} className="hover:bg-slate-950/40 transition-colors">
                              <td className="py-3 px-3 font-semibold text-brand-400">{pt.monthly || 'N/A'}</td>
                              <td className="py-3 px-3 text-slate-350">{pt.date_committed || 'N/A'}</td>
                              <td className="py-3 px-3 text-slate-400 font-mono">{pt.time_committed || 'N/A'}</td>
                              <td className="py-3 px-3 text-slate-350 font-medium">{pt.barangay || 'N/A'}</td>
                              <td className="py-3 px-3 text-slate-300 truncate max-w-[180px]" title={pt.offense || pt.name}>
                                {pt.offense || pt.name}
                              </td>
                              <td className="py-3 px-3 text-slate-500 font-mono text-[10px] text-right">
                                {pt.latitude.toFixed(4)}, {pt.longitude.toFixed(4)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Tactical Directives / Heuristics Summary */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-200 mb-2">Tactical Directives Overview</h3>
                      <p className="text-xs text-slate-500 mb-6">
                        System recommendations derived from geospatial analytics and density models.
                      </p>

                      <div className="space-y-4">
                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex gap-3">
                          <AlertTriangle className="text-rose-450 shrink-0" size={16} />
                          <div>
                            <span className="block text-[10px] font-bold text-rose-400 uppercase tracking-wider">High Risk Alert</span>
                            <p className="text-[11px] text-slate-300 mt-1">
                              Deploy double-officer foot patrols near Calarian coordinates immediately. Increase visible deterrence.
                            </p>
                          </div>
                        </div>

                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
                          <Shield className="text-amber-450 shrink-0" size={16} />
                          <div>
                            <span className="block text-[10px] font-bold text-amber-400 uppercase tracking-wider">Sectors Assigned</span>
                            <p className="text-[11px] text-slate-300 mt-1">
                              Dispatch vehicle patrols during night shift to Tetuan & Mampang sectors. Coordinate checks with local barangay tanods.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800/80 text-[10px] text-slate-500 flex justify-between">
                      <span>ZCPO Tactical Engine v1.0</span>
                      <span>Verified</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          ) : activeTab === 'map' ? (
            <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden flex">

              {/* Map Canvas (Takes 100% of Space, receives filtered points for performant rendering) */}
              <div className="flex-1 w-full h-full">
                <MapContainer points={filteredPoints} onAddPoint={!isChief ? handleAddPoint : undefined} onDeletePoint={handleDeleteIncident} barangayList={barangayList} focusLocation={mapFocus} />
              </div>

              {/* 🛠️ Sliding Right Drawer (ML Engine & Node List) */}
              <div className={`absolute top-0 right-0 h-full w-96 bg-slate-900 border-l border-slate-800 z-30 transition-transform duration-300 transform shadow-2xl flex flex-col ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
                }`}>

                {/* Toggle Arrow Handle Tab */}
                <button
                  onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                  className="absolute top-1/2 -left-8 -translate-y-1/2 w-8 h-12 bg-slate-900 border border-r-0 border-slate-800 rounded-l-xl flex items-center justify-center cursor-pointer text-slate-400 hover:text-slate-200 shadow-md z-40 outline-none"
                >
                  {isDrawerOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>

                {/* Drawer Contents (Scrollable Container) */}
                <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">

                  {/* 🔍 Dynamic Map Filters Panel */}
                  <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-4 flex flex-col gap-3 shrink-0">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-850">
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                        Geospatial Filters
                      </span>
                      {(filterCategory !== 'incident' || filterSubtype !== 'all' || filterYear !== 'all' || filterMonth !== 'all' || filterTime !== 'all' || hasFilterChanges) && (
                        <button
                          onClick={handleResetFilters}
                          className="text-[9px] font-bold text-brand-400 hover:text-brand-300 focus:outline-none"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    <div>
                      <label className="block text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                        Category Classification
                      </label>
                      <div className="grid grid-cols-2 gap-1 bg-slate-900/60 p-0.5 rounded-lg border border-slate-850/80">
                        {['incident', 'operation'].map((cat) => (
                          <button
                            key={cat}
                            onClick={() => {
                              setDraftCategory(cat);
                              setDraftSubtype('all');
                            }}
                            className={`py-1 text-[9px] font-bold rounded capitalize transition-all ${draftCategory === cat
                              ? 'bg-slate-800 text-brand-400 shadow-sm border border-slate-850'
                              : 'text-slate-500 hover:text-slate-350'
                              }`}
                          >
                            {cat}s
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Subtype Dropdown */}
                    <div>
                      <label className="block text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                        Specific Subtype
                      </label>
                      <select
                        value={draftSubtype}
                        onChange={(e) => setDraftSubtype(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-850 focus:border-brand-500 rounded-lg p-2 text-[10px] font-medium text-slate-350 outline-none transition-all"
                      >
                        {draftCategory === 'operation' ? (
                          <>
                            <option value="all">All Operations</option>
                            <option value="drugs">Drug Buy Busts</option>
                          </>
                        ) : (
                          <>
                            <option value="all">All Incidents</option>
                            <option value="vehicular">Vehicular Accidents</option>
                            <option value="vawc">Violence Against Women & Children</option>
                            <option value="theft">Theft & Robbery</option>
                            <option value="injury">Physical Injury / Stabbing / Mauling</option>
                            <option value="gambling">Illegal Gambling Operations</option>
                          </>
                        )}
                      </select>
                    </div>

                    {/* Temporal Divider and Dropdowns */}
                    <div className="border-t border-slate-850/85 pt-3 space-y-3">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        Temporal Filters
                      </span>

                      {/* Year & Month Dropdowns Grid */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[8px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Year
                          </label>
                          <select
                            value={draftYear}
                            onChange={(e) => {
                              const selectedYear = e.target.value;
                              setDraftYear(selectedYear);
                              if (selectedYear === 'all') {
                                setDraftMonth('all');
                              } else {
                                const currentYear = new Date().getFullYear().toString();
                                if (selectedYear === currentYear) {
                                  const currentMonthIdx = new Date().getMonth();
                                  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                  const selectedMonthIdx = months.indexOf(draftMonth);
                                  if (selectedMonthIdx > currentMonthIdx) {
                                    setDraftMonth(months[currentMonthIdx]);
                                  }
                                }
                              }
                            }}
                            className="w-full bg-slate-900 border border-slate-850 focus:border-brand-500 rounded-lg p-1.5 text-[10px] font-medium text-slate-350 outline-none"
                          >
                            <option value="all">All Years</option>
                            {uniqueYears.map(year => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[8px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Month
                          </label>
                          <select
                            value={draftMonth}
                            disabled={draftYear === 'all'}
                            onChange={(e) => setDraftMonth(e.target.value)}
                            className={`w-full bg-slate-900 border border-slate-850 focus:border-brand-500 rounded-lg p-1.5 text-[10px] font-medium text-slate-350 outline-none transition-all ${draftYear === 'all' ? 'opacity-40 cursor-not-allowed select-none' : ''
                              }`}
                          >
                            <option value="all">All Months</option>
                            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, idx) => {
                              const currentYear = new Date().getFullYear().toString();
                              const currentMonthIdx = new Date().getMonth(); // 0 = Jan, 1 = Feb, ..., 6 = Jul
                              const isDisabled = draftYear === currentYear && idx > currentMonthIdx;
                              return (
                                <option key={m} value={m} disabled={isDisabled}>
                                  {m}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </div>

                      {/* Time and Severity dropdowns */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[8px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Time of Day
                          </label>
                          <select
                            value={draftTime}
                            onChange={(e) => setDraftTime(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-lg p-1.5 text-[10px] font-medium text-slate-350 outline-none"
                          >
                            <option value="all">All Day Hours</option>
                            <option value="morning">Morning (6:00 - 12:00)</option>
                            <option value="afternoon">Afternoon (12:00 - 18:00)</option>
                            <option value="night">Night (18:00 - 6:00)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[8px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Severity Level
                          </label>
                          <select
                            value={draftSeverity}
                            onChange={(e) => setDraftSeverity(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-lg p-1.5 text-[10px] font-medium text-slate-350 outline-none"
                          >
                            <option value="all">All Severities</option>
                            <option value="Low">🟢 Low</option>
                            <option value="Medium">🟡 Medium</option>
                            <option value="High">🟠 High</option>
                            <option value="Critical">🔴 Critical</option>
                          </select>
                        </div>
                      </div>

                      {/* Apply Action Button */}
                      <button
                        onClick={handleApplyFilters}
                        disabled={!hasFilterChanges}
                        className={`w-full py-2 rounded-lg text-xs font-bold border transition-all duration-200 flex items-center justify-center gap-1.5 shadow ${hasFilterChanges
                          ? 'bg-brand-600 hover:bg-brand-500 text-slate-50 border-brand-500/25 shadow-brand-500/10 cursor-pointer'
                          : 'bg-slate-900/60 text-slate-500 border-slate-850/80 cursor-not-allowed shadow-none'
                          }`}
                      >
                        Apply Filters
                      </button>
                    </div>
                  </div>

                  {/* Small sub-navigation bar inside drawer */}
                  <div className="flex border-b border-slate-800 p-0.5 shrink-0 bg-slate-950/40 rounded-xl">
                    <button
                      onClick={() => setMapDrawerTab('analytics')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${mapDrawerTab === 'analytics'
                        ? 'bg-slate-900 text-brand-400 shadow-sm border border-slate-800'
                        : 'text-slate-500 hover:text-slate-350'
                        }`}
                    >
                      <Compass size={14} />
                      AI & ML
                    </button>
                    <button
                      onClick={() => setMapDrawerTab('coordinates')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${mapDrawerTab === 'coordinates'
                        ? 'bg-slate-900 text-brand-400 shadow-sm border border-slate-800'
                        : 'text-slate-500 hover:text-slate-350'
                        }`}
                    >
                      <MapPin size={14} />
                      Coordinate Pins
                    </button>
                  </div>

                  {/* Render Tab Contents */}
                  {mapDrawerTab === 'analytics' ? (
                    /* ML Modeling & Analytics Panel */
                    <div className="flex-grow flex flex-col min-h-0">
                      <AnalyticsPanel points={filteredPoints} user={user} />
                    </div>
                  ) : (
                    /* Active Incident Coordinate Nodes list */
                    <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-4 flex flex-col flex-1 min-h-[300px]">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-850">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Coordinate Pins ({filteredPoints.length})</h4>

                      </div>

                      <div className="overflow-y-auto flex-1 space-y-2 pr-0.5 text-xs">
                        {filteredPoints.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-slate-600 text-center py-10">
                            No active filtered pins in database
                          </div>
                        ) : (
                          filteredPoints.map((pt) => (
                            <div
                              key={pt.id}
                              className="p-3 bg-slate-900/60 border border-slate-850/80 rounded-lg flex items-start gap-2.5 min-w-0"
                            >
                              <MapPin size={14} className="text-brand-400 mt-0.5 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="flex justify-between items-start">
                                  <span className="font-semibold text-slate-200 truncate pr-2">{pt.name}</span>
                                  <span className="text-[9px] text-slate-500 shrink-0">{pt.monthly}</span>
                                </div>
                                <p className="text-[10px] text-slate-450 truncate mt-0.5">{pt.description}</p>
                                <div className="flex gap-2.5 mt-1.5 font-mono text-[9px] text-slate-500">
                                  <span>Lat: {pt.latitude.toFixed(4)}</span>
                                  <span>Lng: {pt.longitude.toFixed(4)}</span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </div>

            </div>
          ) : activeTab === 'import' ? (
            <div className="p-8 max-w-2xl mx-auto space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center text-slate-950 shadow-md">
                    <UploadCloud size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-100">ZCPO Data Ingestor</h2>
                    <p className="text-xs text-slate-500">Upload raw crime incidents database files</p>
                  </div>
                </div>

                {isAdmin ? (
                  <div className="space-y-6">
                    <DataUploader onDataUploaded={handleDataUploaded} />

                    {/* CSV Header guidelines card */}
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-3">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Required ZCPO CSV Header Format:
                      </span>
                      <code className="block p-3 bg-slate-950 text-slate-350 text-[10px] rounded-xl overflow-x-auto font-mono whitespace-nowrap border border-slate-850">
                        pro,ppo,stn,region,province,municipal,barangay,MONHTLY,dateReported,timeReported,dateCommitted,timeCommitted,incidentType,iscime,stageoffelony,offense,offenseType,lat,lng
                      </code>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        *Note: If coordinates (`lat` & `lng`) are missing, the backend automatically performs reverse geocoding to resolve the coordinates matching the Barangay name.*
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-950/50 border border-slate-850 rounded-2xl p-8 text-center space-y-4">
                    <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center mx-auto">
                      <Shield size={22} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-200">Access Restricted</h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                        Data ingestion is locked under role-based policies. Please log in as the **Administrator** (`admin@graps.gov`) to upload raw incident files.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            renderModularTabContent()
          )}
        </div>

      </div>      {/* 🔓 LOGOUT CONFIRMATION MODAL */}
      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                <Users size={20} className="rotate-180" />
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Session</span>
                <h3 className="text-sm font-bold text-slate-100 mt-0.5">Sign Out?</h3>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              You are signed in as <strong className="text-slate-200">{user?.name}</strong>. Are you sure you want to end your session and return to the login screen?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer"
              >
                Stay Signed In
              </button>
              <button
                onClick={() => { setIsLogoutConfirmOpen(false); handleLogout(); }}
                className="bg-rose-600 hover:bg-rose-500 text-slate-50 font-semibold rounded-xl px-4 py-2 text-xs shadow transition-all cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
