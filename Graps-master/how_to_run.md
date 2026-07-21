# GRAPS Server Startup & Execution Guide

To fully access and run the **Geospatial Real-time Analytics & Prediction System (GRAPS)**, you need to start the following components. 

Open separate terminal windows or tabs for each server:

---

## 🗄️ 1. PostgreSQL & PostGIS Database Server
Ensure PostgreSQL is active and has the **PostGIS** spatial extension installed on your system.

### 📦 Installation
*   **Linux (Ubuntu/Debian)**:
    ```bash
    # Install PostgreSQL 16 and PostGIS
    sudo apt update
    sudo apt install -y postgresql-16-postgis-3
    ```
*   **macOS (Homebrew)**:
    ```bash
    brew install postgresql postgis
    ```
*   **Windows**:
    Download the installer from [EnterpriseDB](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads) and install PostGIS via the StackBuilder utility.

### 🔌 Database Setup & Seeding
Once PostgreSQL and PostGIS are installed:
1. Create a database named `graps` with user `postgres` and password `password` (or match your local `.env` settings).
2. Run database migrations and seeding to rebuild tables and populate historical records:
   ```bash
   cd backend
   php artisan migrate:fresh --seed
   ```
   *Note: Migrations will automatically run `CREATE EXTENSION IF NOT EXISTS postgis;` and set up generated geography columns and GiST spatial indexes.*

---

## 🔌 2. Backend API Server (PHP-Laravel)
Launches the backend REST API endpoints.
1.  Navigate to the `backend` folder:
    ```bash
    cd backend
    ```
2.  Start the Laravel server:
    ```bash
    php artisan serve
    ```
3.  **API Address**: `http://127.0.0.1:8000`

---

## ⚙️ 3. Laravel Queue Worker
Listens for background tasks. When you upload a CSV file or trigger training, Laravel sends the task to the queue, which launches the Python ML subprocess.
1.  Navigate to the `backend` folder:
    ```bash
    cd backend
    ```
2.  Start the queue worker:
    ```bash
    php artisan queue:work
    ```

---

## 🖥️ 4. Frontend UI Server (Vite + React)
Launches the interactive dashboard and Mapbox interface.
1.  Navigate to the `frontend` folder:
    ```bash
    cd frontend
    ```
2.  Start the Vite dev server:
    ```bash
    npm run dev
    ```
3.  **Web Interface Address**: `http://localhost:5173`

---

## 📋 Startup Order Summary Checklist
1.  [ ] **PostgreSQL** is running.
2.  [ ] **`php artisan serve`** is active.
3.  [ ] **`php artisan queue:work`** is active.
4.  [ ] **`npm run dev`** is active.
5.  [ ] Open `http://localhost:5173` in your browser.

---

## 🔑 Seeded Test Credentials (RBAC Roles)
You can authenticate inside the system using these default accounts (password is `password` for all):

| Role | User Name | Email Address | Description |
| :--- | :--- | :--- | :--- |
| **Admin** | ZCPO Administrator | `admin@graps.gov` | Access to import data, configure configurations, and manage users. |
| **Analyst** | ZCPO Intelligence Analyst | `analyst@graps.gov` | Access to trigger models, view metrics, and generate tactical reports. |
| **Decision Maker** | ZCPO Chief of Police | `chief@graps.gov` | Access to view the dashboard and patrol recommendations. |

---

## 🧪 5. Running the Test Suites
You can run automated tests for both the backend and frontend modules to verify the setup:

*   **Backend API Tests (Pest/PHPUnit)**:
    ```bash
    cd backend
    php artisan test
    ```
*   **Frontend UI Tests (Jest)**:
    ```bash
    cd frontend
    npm test
    ```
