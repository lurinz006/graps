# Role Separation & Station Jurisdiction Dispatch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement strict Role-Based Access Control (Analyst as human-in-the-loop, Chief of Police with exclusive tactical command authority, and Admin restricted to IT tasks) and Station-Jurisdiction-Aware Officer Dispatch in `friend-theme`.

**Architecture:** 
- In Laravel (`Graps-master/backend`), update `OfficerSeeder.php` to guarantee a balanced deployment pool for all 12 Police Stations (PS 01–PS 12) with explicit station-to-barangay mappings.
- In React (`Graps-master/frontend`), enrich `RecommendationsPanel.jsx` with an interactive Analyst endorsement/modification/proposal workflow and Chief-only approval gateway.
- Enforce strict tactical permissions across `AlertsManager.jsx` and `OfficerDeployment.jsx` so only Chief (`decision_maker`) can approve/deploy/lock rosters, while restricting `admin` to system management.
- Update `AlertsManager.jsx`'s detail audit modal to automatically resolve the affected barangay's parent Police Station and prioritize local station officers for dispatch with secondary adjacent station backup.

**Tech Stack:** React 19, Tailwind CSS, Lucide React, Laravel 11, SQLite/PostgreSQL, PHPUnit/Pest.

**Spec:** System Revisions & Implementation Summary (November 2026).

---

## Global Constraints
- Target branch is `friend-theme` (paths under `Graps-master/`).
- Do not break existing theme system (Light/Dark mode) or Mapbox/Street View integrations.
- Role strings: `'analyst'` (Intelligence Analyst), `'decision_maker'` (Chief of Police), `'admin'` (System Administrator).
- Stations: 12 stations (`PS 01` to `PS 12`).

## Review Focus
1. **Unassigned Officer Station Filtering**: Selecting a barangay under PS 06 (e.g., Tetuan) must exclusively list PS 06 officers (or clearly demarcate backup stations), never distant stations (e.g. PS 01 / Vitali).
2. **Admin Command Lockdown**: Logging in as `admin` must hide or disable tactical deployment triggers in `AlertsManager.jsx` and `OfficerDeployment.jsx`, showing an informative badge instead of silent failures.
3. **Analyst Workflow State Persistence**: Analyst notes, endorsement states, modifications, and custom-created directives must persist across tab changes or session storage so the Chief can review them without data loss.
4. **Chief Approval Gate**: AI recommendations cannot transition to "Implemented / Authorized" without explicit Chief sign-off (`decision_maker`).
5. **Roster Locking**: The officer roster lock state can only be toggled by the Chief, preventing any accidental reassignment.

---

## Tasks

### Task 1: Officer Seeder Overhaul for Guaranteed 12-Station Allocation
**Files:**
- Modify: `Graps-master/backend/database/seeders/OfficerSeeder.php`
- Test: `Graps-master/backend/tests/Unit/OfficerJurisdictionTest.php`

**Steps:**
- [ ] Create unit test `OfficerJurisdictionTest.php` asserting all 12 police stations (PS 01 through PS 12) have at least 5 available (`Active` and unassigned) officers.
- [ ] Update `OfficerSeeder.php` to define the complete, unambiguous station mapping for all 12 stations and 98 Zamboanga City barangays.
- [ ] Refactor the generation loop to seed a guaranteed baseline of officers per station (e.g., 10-15 per station = 120-180 total), ensuring at least 3-5 officers per station have `assigned_barangay = null` and `status = 'Active'`.
- [ ] Run `php artisan db:seed --class=OfficerSeeder` (or unit test) to verify.
- [ ] Commit changes.

---

### Task 2: Station-Jurisdiction-Aware Officer Dispatch in Alerts Modal
**Files:**
- Modify: `Graps-master/frontend/src/components/AlertsManager.jsx`
- Test: Component review / interactive test via UI build

**Steps:**
- [ ] Add the station-to-barangay lookup dictionary inside `AlertsManager.jsx` (matching the backend jurisdiction table).
- [ ] In the Alert Detail Audit Modal, resolve `targetStation = BARANGAY_STATION_MAP[selectedAlert.barangay] || 'PS 12'`.
- [ ] Group available officers in the dispatch dropdown into:
  1. **Primary Jurisdiction**: Active officers assigned to `targetStation`.
  2. **Adjacent / Backup Stations**: Active officers from neighboring stations clearly badged as `(Backup - PS XX)`.
- [ ] Display an alert badge in the modal showing `Station Jurisdiction: PS XX (Assigned)` with local officer counts.
- [ ] Disable dispatch action if current user is not Chief of Police (`user?.role !== 'decision_maker'`), displaying a message: *"Only the Chief of Police holds authority to authorize tactical deployments."*
- [ ] Commit changes.

---

### Task 3: Analyst Human-in-the-Loop Workflow in Recommendations Panel
**Files:**
- Modify: `Graps-master/frontend/src/components/RecommendationsPanel.jsx`
- Modify: `Graps-master/frontend/src/App.jsx` (pass `user` prop to `RecommendationsPanel`)

**Steps:**
- [ ] Pass `user={user}` prop to `<RecommendationsPanel>` in `App.jsx`.
- [ ] Implement Analyst interactive controls for each AI Recommendation:
  - **Agree & Endorse**: Analyst adds qualitative assessment notes and marks the recommendation as `Endorsed by Analyst`.
  - **Modify**: Analyst can edit recommended patrol frequencies, shifts, or target sectors with explanatory rationale.
  - **Reject**: Analyst can flag false alarms or tactical redundancies, moving them to a "Rejected / False Alarm" archive.
- [ ] Add a **"Propose Tactical Initiative"** modal allowing Analysts to draft a custom operational brief from scratch (Title, Priority, Target Barangay, Recommended Action, Tactical Justification).
- [ ] Add a **"Submit Intelligence Brief to Chief"** floating action bar to compile all endorsed/proposed directives into an official brief.
- [ ] Commit changes.

---

### Task 4: Chief of Police Command Authority & Approval Gateway
**Files:**
- Modify: `Graps-master/frontend/src/components/RecommendationsPanel.jsx`
- Modify: `Graps-master/frontend/src/components/OfficerDeployment.jsx`

**Steps:**
- [ ] In `RecommendationsPanel.jsx`, update the "Implement / Authorize" action:
  - When logged in as Chief (`decision_maker`): Displays **"Approve & Authorize Deployment"** button with command signature confirmation.
  - When logged in as Analyst (`analyst`): Only displays **"Endorse for Chief's Review"**.
  - When logged in as Admin (`admin`): Displays view-only mode with a notice *"Tactical command actions reserved for Chief of Police"*.
- [ ] In `OfficerDeployment.jsx`:
  - Change all tactical controls (`Quick Deploy`, `Auto-Balance Patrols`, editing officer status/barangay, `Lock Roster`) from `user?.role === 'admin'` to `user?.role === 'decision_maker'`.
  - Add a persistent **"Roster Lock Status"** toggle that only the Chief can engage/disengage.
- [ ] Commit changes.

---

### Task 5: Admin IT Role Restriction
**Files:**
- Modify: `Graps-master/frontend/src/components/OfficerDeployment.jsx`
- Modify: `Graps-master/frontend/src/components/AlertsManager.jsx`
- Modify: `Graps-master/frontend/src/components/SettingsPanel.jsx`

**Steps:**
- [ ] Verify that `admin` role has no buttons to deploy officers, change tactical states, or resolve police alerts.
- [ ] Ensure `SettingsPanel.jsx` continues to provide Admin-only IT controls: Raw CSV Data Uploader, Database Purge / Seed reset, and System User Account Management.
- [ ] Add visual role indicator badges in navigation headers (e.g. `[Analyst - Intelligence]`, `[Chief of Police - Command]`, `[Admin - Technical Support]`).
- [ ] Run `npm run build` in `Graps-master/frontend` to verify syntax and bundling.
- [ ] Commit changes.
