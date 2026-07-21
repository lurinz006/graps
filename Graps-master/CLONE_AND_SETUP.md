# 🚀 Initial Repository Clone & Setup Guide

This guide outlines the step-by-step setup procedure required immediately after cloning the **GRAPS** repository from scratch. Complete these installation steps before following the execution commands in [how_to_run.md](file:///home/pheinz/GRAPS/how_to_run.md).

---

## 🛠️ 1. System Prerequisites

Ensure the following tools are installed on your host system:

*   **PHP**: Version `8.2` or higher (with `php-pgsql`, `php-xml`, and `php-curl` modules).
*   **Composer**: Dependency manager for PHP.
*   **Node.js & npm**: Node version `18` or higher.
*   **Python**: Version `3.10` or higher (with `venv` and `pip` utilities).
*   **PostgreSQL**: Version `15` or higher.
*   **PostGIS**: Version `3.x` spatial extension compatible with your PostgreSQL engine.

---

## 📦 2. Step-by-Step Installation

### Step A: Clone the Repository
```bash
git clone <repository-url> Geospatial-Regression-Analytics
cd Geospatial-Regression-Analytics
```

### Step B: Configure the Backend (PHP-Laravel)
1.  Navigate to the `backend` folder:
    ```bash
    cd backend
    ```
2.  Install all Composer dependencies:
    ```bash
    composer install
    ```
3.  Install node dependencies (for Vite asset building):
    ```bash
    npm install
    ```
4.  Create your environment configuration:
    ```bash
    cp .env.example .env
    ```
5.  Generate the application security key:
    ```bash
    php artisan key:generate
    ```
6.  Edit `.env` and fill in your PostgreSQL credentials:
    ```ini
    DB_CONNECTION=pgsql
    DB_HOST=127.0.0.1
    DB_PORT=5432
    DB_DATABASE=graps
    DB_USERNAME=postgres
    DB_PASSWORD=password
    ```

---

### Step C: Configure the Analytics Engine (Python)
1.  Navigate to the `analytics` folder (from the repository root):
    ```bash
    cd ../analytics
    ```
2.  Initialize the Python Virtual Environment:
    ```bash
    python3 -m venv venv
    ```
3.  Activate the virtual environment:
    *   **Linux/macOS**: `source venv/bin/activate`
    *   **Windows (PowerShell)**: `.\venv\Scripts\Activate.ps1`
4.  Install the required machine learning and database driver libraries:
    ```bash
    pip install -r requirements.txt
    ```
5.  Get the absolute path to your Python virtual environment executable:
    *   **Linux/macOS**: `/path/to/Geospatial-Regression-Analytics/analytics/venv/bin/python3`
    *   **Windows**: `C:\path\to\Geospatial-Regression-Analytics\analytics\venv\Scripts\python.exe`
6.  Open `backend/.env` again, and update the `PYTHON_PATH` parameter with this absolute path:
    ```ini
    PYTHON_PATH=/absolute/path/to/analytics/venv/bin/python3
    ```

---

### Step D: Configure the Frontend (Vite + React)
1.  Navigate to the `frontend` folder (from the repository root):
    ```bash
    cd ../frontend
    ```
2.  Install React/Vite/Tailwind packages:
    ```bash
    npm install
    ```

---

### Step E: Database Setup
Before launching the application:
1. Ensure your local PostgreSQL service is running.
2. Log into PostgreSQL and create the `graps` database:
   ```bash
   # On Linux/macOS
   psql -U postgres -h 127.0.0.1 -c "CREATE DATABASE graps;"
   ```
3. Wipe, migrate, and seed all spatial tables:
   ```bash
   cd ../backend
   php artisan migrate:fresh --seed
   ```

---

## 🎉 Next Step
Once these steps are completed, your environment is ready to start! Follow [how_to_run.md](file:///home/pheinz/GRAPS/how_to_run.md) to launch the development servers.
