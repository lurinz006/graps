# G CRAPS Project Architecture & Setup Guide

 This project implements a three-tier architecture: React + Tailwind CSS + Mapbox GL JS on the frontend, PHP-Laravel handling APIs and background queues, and a Python Engine using Pandas, Scikit-learn, and Statsmodels for analytics, all integrated around a
  ## local PostgreSQL database with PostGIS spatial extensions.

---

## 📁 Project Structure

The project contains the following folders and files:

```text
GRAPS/
├── analytics/                      # Python ML & Analytics Engine
│   ├── venv/                       # Python Virtual Environment
│   ├── src/
│   │   ├── __init__.py
│   │   ├── db.py                   # SQLAlchemy connection & session manager (auto-routes to local PG)
│   │   ├── processor.py            # Pandas data loader and cleaner
│   │   └── ml.py                   # Scikit-learn regression & Statsmodels forecasting
│   ├── main.py                     # Python CLI entry point
│   └── requirements.txt            # Python dependencies (pandas, scikit-learn, statsmodels, psycopg2-binary, etc.)
│
├── backend/                        # PHP-Laravel API Server
│   ├── app/
│   │   ├── Console/Commands/
│   │   │   └── RunAnalytics.php    # Artisan command executing python process
│   │   ├── Http/Controllers/Api/V1/
│   │   │   └── AnalyticsController.php # API routes controller (upload, sync, metrics, alerts, officers, statistics)
│   │   └── Jobs/
│   │       └── RunAnalyticsJob.php # Queueable job for background async processing
│   ├── database/migrations/
│   │   ├── 0001_01_01_000000_create_users_table.php             # System users migration
│   │   ├── 2026_07_16_160000_create_spatial_data_table.php       # Coordinates migration (PostGIS geom enabled)
│   │   ├── 2026_07_16_160001_create_analytics_metrics_table.php   # ML results migration
│   │   ├── 2026_07_16_160002_create_barangays_table.php           # Zamboanga City sectors migration (PostGIS geom enabled)
│   │   ├── 2026_07_17_050037_create_officers_table.php            # Active patrol officers migration
│   │   └── 2026_07_17_050038_create_alerts_table.php              # Real-time incident spike warnings migration
│   ├── routes/
│   │   └── api.php                 # Registered /api/v1 routes
│   └── .env                        # Configured with local PostgreSQL connection parameters
│
└── frontend/                       # React Web Application
    ├── src/
    │   ├── components/
    │   │   ├── MapContainer.jsx    # Mapbox GL JS map interface (click-to-pin, token error boundary)
    │   │   ├── DataUploader.jsx    # File drag-and-drop & sync progress bar
    │   │   ├── IncidentsLog.jsx    # Coordinate reporter and filter table
    │   │   ├── AlertsManager.jsx   # Threshold controls and spike alerts feed
    │   │   ├── OfficerDeployment.jsx # Weekly schedule grid and coverage levels
    │   │   ├── RecommendationsPanel.jsx # Model-predicted hotspot priority dispatches
    │   │   ├── RichAnalyticsPage.jsx # Hourly regression charts and Apriori association rules
    │   │   └── SettingsPanel.jsx   # Role preference settings (Admin, Analyst, Chief)
    │   ├── App.jsx                 # Dashboard orchestration layout & dynamic modular tab rendering
    │   └── index.css               # Tailwind CSS & global styles
    ├── tailwind.config.js          # Customized Tailwind CSS v3 tokens
    ├── package.json                # Frontend dependencies and unit tests config
    └── .env                        # Configured with Mapbox Access Token variables
```

---

## ⚙️ Prerequisites, Installation, & Running Guide

To configure your system and execute the application, please follow the documentation index:

## [requirements.md](requirements.md)

This index routes you through:
1. ## [INSTALL_PREREQUISITES.md](INSTALL_PREREQUISITES.md): Installing PHP, PostGIS, Node.js, Python, and PostgreSQL on your host operating system.
2. ## [CLONE_AND_SETUP.md](CLONE_AND_SETUP.md): Configuring the cloned workspace, package installs, and database initializations.
3. ## [how_to_run.md](how_to_run.md): Launching backend servers, frontend dev environments, and running test suites.

---

## 🤖 Analytics Engine Integration details
The Laravel server triggers the Python script using a background command.

### Manual CLI Run
You can also run tasks manually using the Artisan console wrapper:
- ## Train regression model on spatial table:
  ```bash
  php artisan app:run-analytics --task=train --table=spatial_data --target=value --features=latitude,longitude
  ```
- ## Forecast next 7 steps on spatial table:
  ```bash
  php artisan app:run-analytics --task=forecast --table=spatial_data --value-col=value --date-col=recorded_at --steps=7
  ```
- The results are written back directly into the `analytics_metrics` table and displayed on the UI.
