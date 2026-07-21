import React, { useState, useEffect } from 'react';
import { Settings, Shield, User, Key, Database, Sliders, Eye, RefreshCw, Bell, UserPlus } from 'lucide-react';

export default function SettingsPanel({
  user,
  dbStatus,
  clearConfirmStep,
  setClearConfirmStep,
  handleClearDatabase,
  dashboardViewMode,
  updateDashboardViewMode
}) {
  const [settingsTab, setSettingsTab] = useState('profile');

  // Profile Form states
  const [fullName, setFullName] = useState(user?.name || 'Officer Name');
  const [badgeNumber, setBadgeNumber] = useState(user?.role === 'admin' ? 'ADM-9821' : user?.role === 'analyst' ? 'ANA-7720' : 'COP-0112');
  const [userRank, setUserRank] = useState(user?.role === 'admin' ? 'System Administrator' : user?.role === 'analyst' ? 'Crime Analyst' : 'Chief of Police');

  // Security Password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Preference states
  const [theme, setTheme] = useState('slate-dark');
  const [refreshInterval, setRefreshInterval] = useState('none');
  const [coordFormat, setCoordFormat] = useState('DD');

  // AI Hyperparameters (Analyst only)
  const [dbscanEpsilon, setDbscanEpsilon] = useState(0.03);
  const [dbscanMinPoints, setDbscanMinPoints] = useState(5);
  const [aprioriSupport, setAprioriSupport] = useState(0.10);
  const [aprioriConfidence, setAprioriConfidence] = useState(0.80);

  // Notifications (Chief only)
  const [smsTrigger, setSmsTrigger] = useState(true);
  const [emailBriefing, setEmailBriefing] = useState(true);
  const [dispatchStrictness, setDispatchStrictness] = useState('Recommended');

  // Feedback Toast state
  const [toastMessage, setToastMessage] = useState(null);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleProfileSave = (e) => {
    e.preventDefault();
    triggerToast("Profile preferences updated successfully.");
  };

  const handlePasswordReset = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      triggerToast("⚠️ Passwords do not match!");
      return;
    }
    triggerToast("Password credentials changed successfully.");
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const isAdmin = user?.role === 'admin';
  const isAnalyst = user?.role === 'analyst';
  const isChief = user?.role === 'decision_maker';

  return (
    <div className="p-8 max-w-[1200px] w-full mx-auto space-y-6">

      {/* Title Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-900">
        <div className="w-12 h-12 bg-slate-900 border border-slate-800 text-slate-350 rounded-2xl flex items-center justify-center shadow-lg">
          <Settings size={22} className="animate-[spin_10s_linear_infinite] text-brand-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-100 uppercase tracking-wider">System Settings</h2>
          <p className="text-xs text-slate-550">Configure role preferences, profile options, and tactical analytics configs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">

        {/* Settings Navigation Menu */}
        <div className="md:col-span-3 bg-slate-900 border border-slate-850 rounded-3xl p-4 flex flex-col gap-1.5 shadow-xl">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2 block">Settings Tab Menu</span>

          <button
            onClick={() => setSettingsTab('profile')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${settingsTab === 'profile' ? 'bg-brand-600 text-slate-50 shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/45'
              }`}
          >
            <User size={14} /> Profile & Details
          </button>

          <button
            onClick={() => setSettingsTab('preferences')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${settingsTab === 'preferences' ? 'bg-brand-600 text-slate-50 shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/45'
              }`}
          >
            <Eye size={14} /> App Preferences
          </button>

          <button
            onClick={() => setSettingsTab('security')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${settingsTab === 'security' ? 'bg-brand-600 text-slate-50 shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/45'
              }`}
          >
            <Key size={14} /> Security & Password
          </button>

          {/* Admin Tab option */}
          {isAdmin && (
            <button
              onClick={() => setSettingsTab('admin')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${settingsTab === 'admin' ? 'bg-brand-600 text-slate-50 shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/45'
                }`}
            >
              <Database size={14} /> System Admin
            </button>
          )}

          {/* Analyst Tab option */}
          {isAnalyst && (
            <button
              onClick={() => setSettingsTab('analyst')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${settingsTab === 'analyst' ? 'bg-brand-600 text-slate-50 shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/45'
                }`}
            >
              <Sliders size={14} /> AI Hyperparameters
            </button>
          )}

          {/* Chief Tab option */}
          {isChief && (
            <button
              onClick={() => setSettingsTab('chief')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${settingsTab === 'chief' ? 'bg-brand-600 text-slate-50 shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/45'
                }`}
            >
              <Bell size={14} /> Dispatch Settings
            </button>
          )}
        </div>

        {/* Settings Form panel */}
        <div className="md:col-span-9">

          {/* TAB: PROFILE & DETAILS */}
          {settingsTab === 'profile' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Profile Settings</h3>
                <p className="text-xs text-slate-500 mt-0.5">Manage identity credentials and badge reference parameters</p>
              </div>

              <form onSubmit={handleProfileSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-650 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Badge Number</label>
                    <input
                      type="text"
                      value={badgeNumber}
                      onChange={(e) => setBadgeNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-650 outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Designated Rank</label>
                    <input
                      type="text"
                      value={userRank}
                      onChange={(e) => setUserRank(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-xl px-4 py-2.5 text-xs text-slate-400 outline-none cursor-not-allowed"
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Official Email</label>
                    <input
                      type="text"
                      value={user?.email || 'officer@graps.gov'}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-slate-400 outline-none cursor-not-allowed"
                      disabled
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="bg-brand-600 hover:bg-brand-500 text-slate-50 font-semibold text-xs rounded-xl px-5 py-2.5 shadow transition-all cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: APP PREFERENCES */}
          {settingsTab === 'preferences' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">App Preferences</h3>
                <p className="text-xs text-slate-550 mt-0.5">Customize interface view modes and dashboard scopes</p>
              </div>

              <div className="space-y-5 text-xs">
                {/* Historical Scope Selector */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-850">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-350 block">Dashboard Scope</span>
                    <span className="text-[10px] text-slate-500">Filter range of incidents loaded on the dashboard view</span>
                  </div>
                  <div className="flex gap-2 bg-slate-950 p-1 rounded-lg border border-slate-850 w-full sm:w-auto">
                    <button
                      onClick={() => updateDashboardViewMode('1month')}
                      className={`px-3 py-1.5 rounded text-[10px] font-bold transition-all ${dashboardViewMode === '1month' ? 'bg-brand-600 text-slate-50' : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                      1 Month Window
                    </button>
                    <button
                      onClick={() => updateDashboardViewMode('all')}
                      className={`px-3 py-1.5 rounded text-[10px] font-bold transition-all ${dashboardViewMode === 'all' ? 'bg-brand-600 text-slate-50' : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                      All Incidents
                    </button>
                  </div>
                </div>

                {/* Theme options */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-850">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-350 block">Theme Scheme</span>
                    <span className="text-[10px] text-slate-500">Select visual palette for map and panel components</span>
                  </div>
                  <div className="flex gap-2">
                    {['slate-dark', 'midnight-blue', 'emerald-dark'].map((t) => (
                      <button
                        key={t}
                        onClick={() => { setTheme(t); triggerToast(`Theme updated to ${t.replace('-', ' ')}.`); }}
                        className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${theme === t ? 'bg-brand-600 text-slate-50 border-brand-500/20' : 'text-slate-400 border-slate-850 hover:border-slate-700'
                          }`}
                      >
                        {t === 'slate-dark' ? 'Slate' : t === 'midnight-blue' ? 'Midnight' : 'Emerald'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auto Refresh */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-850">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-350 block">Live Data Auto-Refresh</span>
                    <span className="text-[10px] text-slate-500">Set background interval to fetch latest warnings</span>
                  </div>
                  <select
                    value={refreshInterval}
                    onChange={(e) => { setRefreshInterval(e.target.value); triggerToast("Auto-refresh interval adjusted."); }}
                    className="bg-slate-950 border border-slate-850 rounded-lg p-2 text-xs font-semibold text-slate-350 outline-none"
                  >
                    <option value="none">Manual Refresh Only</option>
                    <option value="30s">Every 30 Seconds</option>
                    <option value="1m">Every 1 Minute</option>
                    <option value="5m">Every 5 Minutes</option>
                  </select>
                </div>

                {/* Coordinates Format */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-350 block">Coordinate Representation</span>
                    <span className="text-[10px] text-slate-500">Select presentation values of lat/lng nodes</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCoordFormat('DD')}
                      className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${coordFormat === 'DD' ? 'bg-brand-600 text-slate-50 border-brand-500/20' : 'text-slate-400 border-slate-850 hover:border-slate-700'
                        }`}
                    >
                      Decimal Degrees
                    </button>
                    <button
                      onClick={() => setCoordFormat('DMS')}
                      className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${coordFormat === 'DMS' ? 'bg-brand-600 text-slate-50 border-brand-500/20' : 'text-slate-400 border-slate-850 hover:border-slate-700'
                        }`}
                    >
                      Degrees Mins Secs
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SECURITY & PASSWORD */}
          {settingsTab === 'security' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Security Credentials</h3>
                <p className="text-xs text-slate-550 mt-0.5">Calibrate security authentication hashes and cryptographic parameters</p>
              </div>

              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password..."
                    className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-650 outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password..."
                      className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-650 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password..."
                      className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-650 outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="bg-brand-600 hover:bg-brand-500 text-slate-50 font-semibold text-xs rounded-xl px-5 py-2.5 shadow transition-all cursor-pointer"
                  >
                    Reset Password
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: SYSTEM ADMIN (Admin only) */}
          {settingsTab === 'admin' && isAdmin && (
            <div className="space-y-6">

              {/* Mapbox and DB details */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">Database Connectivity Audit</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Manage details mapping Mapbox tokens and Laravel database latency</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-1">
                    <span className="font-semibold text-slate-400 block">Mapbox Access Status:</span>
                    <span className="text-emerald-400 font-bold block">✓ ACTIVE</span>
                    <span className="font-mono text-[9px] text-slate-550 block truncate">VITE_MAPBOX_ACCESS_TOKEN loaded</span>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-1">
                    <span className="font-semibold text-slate-400 block">Laravel API Status:</span>
                    <span className="text-emerald-400 font-bold block">{dbStatus}</span>
                    <span className="font-mono text-[9px] text-slate-550 block">Latency &lt; 2.5ms</span>
                  </div>
                </div>
              </div>

              {/* Mock User Management */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-850">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">Access Key Tokens</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Manage credentials matching seeded UserSeeder credentials</p>
                  </div>
                  <button
                    onClick={() => triggerToast("New API client token generated.")}
                    className="flex items-center gap-1 bg-slate-950 border border-slate-850 hover:bg-slate-850 text-slate-300 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                  >
                    <UserPlus size={12} /> Add Key
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-850 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-2">User Sector</th>
                        <th className="py-2">Assigned Role</th>
                        <th className="py-2">Status</th>
                        <th className="py-2 text-right">Key Hash</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/40 text-slate-350">
                      <tr>
                        <td className="py-2.5 font-semibold text-slate-200">admin@graps.gov</td>
                        <td className="py-2.5">System Admin</td>
                        <td className="py-2.5 text-emerald-450 font-bold">Active</td>
                        <td className="py-2.5 text-right font-mono text-[10px]">zcpo_adm_token_098a...</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-semibold text-slate-200">analyst@graps.gov</td>
                        <td className="py-2.5">Intelligence Analyst</td>
                        <td className="py-2.5 text-emerald-450 font-bold">Active</td>
                        <td className="py-2.5 text-right font-mono text-[10px]">zcpo_ana_token_452b...</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-semibold text-slate-200">chief@graps.gov</td>
                        <td className="py-2.5">Chief of Police</td>
                        <td className="py-2.5 text-emerald-450 font-bold">Active</td>
                        <td className="py-2.5 text-right font-mono text-[10px]">zcpo_cop_token_112c...</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-slate-900 border border-rose-950/40 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-start justify-between gap-6">
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-rose-450">Danger Zone — Clear Database</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Deletes every incident entry and resets the map layers. Only visible to Administrators. This operation cannot be undone.
                    </p>
                  </div>

                  <div className="shrink-0">
                    {clearConfirmStep === 0 ? (
                      <button
                        onClick={() => setClearConfirmStep(1)}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all cursor-pointer"
                      >
                        Clear Database
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-rose-400 font-bold">Confirm delete?</span>
                        <button
                          onClick={handleClearDatabase}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-rose-600 text-white hover:bg-rose-500 transition-all cursor-pointer"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setClearConfirmStep(0)}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-350 hover:bg-slate-700 transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB: AI HYPERPARAMETERS (Analyst only) */}
          {settingsTab === 'analyst' && isAnalyst && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">AI Analytics Hyperparameters</h3>
                <p className="text-xs text-slate-550 mt-0.5">Calibrate spatial clustering and association rule threshold parameters</p>
              </div>

              <div className="space-y-5 text-xs">
                {/* Epsilon */}
                <div>
                  <div className="flex justify-between font-semibold text-slate-350 mb-1.5">
                    <span>DBSCAN Epsilon Radius (degrees):</span>
                    <span className="text-brand-400 font-bold">{dbscanEpsilon.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="0.10"
                    step="0.01"
                    value={dbscanEpsilon}
                    onChange={(e) => setDbscanEpsilon(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-brand-500"
                  />
                  <span className="text-[9px] text-slate-500 mt-1 block">*Specifies distance threshold for neighborhood cluster coordinates. (Approx: {Math.round(dbscanEpsilon * 111)}km)*</span>
                </div>

                {/* MinPoints */}
                <div>
                  <div className="flex justify-between font-semibold text-slate-350 mb-1.5">
                    <span>DBSCAN MinPoints Density:</span>
                    <span className="text-rose-450 font-bold">{dbscanMinPoints} incidents</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="20"
                    step="1"
                    value={dbscanMinPoints}
                    onChange={(e) => setDbscanMinPoints(parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />
                  <span className="text-[9px] text-slate-500 mt-1 block">*Minimum adjacent incidents required to qualify as a cluster hotspot core.*</span>
                </div>

                {/* Apriori Support */}
                <div className="grid grid-cols-2 gap-6 pt-2 border-t border-slate-850/80">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Apriori Min Support</label>
                    <select
                      value={aprioriSupport}
                      onChange={(e) => setAprioriSupport(parseFloat(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-xs text-slate-300 outline-none"
                    >
                      <option value="0.05">5% Frequency (Lenient)</option>
                      <option value="0.10">10% Frequency (Normal)</option>
                      <option value="0.20">20% Frequency (Strict)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Apriori Min Confidence</label>
                    <select
                      value={aprioriConfidence}
                      onChange={(e) => setAprioriConfidence(parseFloat(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-xs text-slate-300 outline-none"
                    >
                      <option value="0.60">60% Confidence threshold</option>
                      <option value="0.80">80% Confidence threshold</option>
                      <option value="0.90">90% Confidence threshold</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={() => triggerToast("AI model hyperparameters saved. Background training queued.")}
                    className="bg-violet-600 hover:bg-violet-500 text-slate-50 font-semibold text-xs rounded-xl px-5 py-2.5 shadow transition-all cursor-pointer"
                  >
                    Calibrate Models
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: DISPATCH SETTINGS (Chief only) */}
          {settingsTab === 'chief' && isChief && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Dispatch & Telemetry Config</h3>
                <p className="text-xs text-slate-550 mt-0.5">Calibrate patrol notification triggers and automatic dispatch policies</p>
              </div>

              <div className="space-y-5 text-xs">
                {/* SMS alert toggle */}
                <div className="flex justify-between items-center pb-4 border-b border-slate-850">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-350 block">SMS Warning Integration</span>
                    <span className="text-[10px] text-slate-500">Send instant cellular SMS triggers for Critical Severity alerts</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={smsTrigger}
                    onChange={(e) => { setSmsTrigger(e.target.checked); triggerToast(`SMS notifications ${e.target.checked ? 'activated' : 'deactivated'}.`); }}
                    className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500 focus:ring-opacity-25 border-slate-800 bg-slate-950"
                  />
                </div>

                {/* Email Briefing toggle */}
                <div className="flex justify-between items-center pb-4 border-b border-slate-850">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-350 block">Daily Email Briefings</span>
                    <span className="text-[10px] text-slate-500">Send consolidated morning analytics reports to ZCPO leadership</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailBriefing}
                    onChange={(e) => { setEmailBriefing(e.target.checked); triggerToast(`Consolidated reports briefing queued.`); }}
                    className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500 focus:ring-opacity-25 border-slate-800 bg-slate-950"
                  />
                </div>

                {/* Dispatch Strictness */}
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-350 block">Dispatch Recommendation Rules</span>
                    <span className="text-[10px] text-slate-500">Select staffing assignment recommendation strictness level</span>
                  </div>
                  <select
                    value={dispatchStrictness}
                    onChange={(e) => { setDispatchStrictness(e.target.value); triggerToast(`Dispatch algorithms set to ${e.target.value}.`); }}
                    className="bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-xs font-semibold text-slate-300 outline-none"
                  >
                    <option value="Lenient">Lenient Staffing allocations</option>
                    <option value="Recommended">Normal (Model-Recommended)</option>
                    <option value="High Priority">Strict (Critical pre-positioning)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Floating Success Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-emerald-500/10 border border-emerald-500/30 text-emerald-450 px-5 py-3.5 rounded-xl shadow-2xl z-50 animate-[fadeInUp_0.3s_ease] backdrop-blur-md flex items-center gap-2.5 text-xs font-semibold">
          <Shield size={16} />
          {toastMessage}
        </div>
      )}

    </div>
  );
}
