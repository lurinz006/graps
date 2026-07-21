# 🛠️ System Prerequisites Installation Guide

This guide details how to download and install all system dependencies (PHP, Composer, Node.js, Python, PostgreSQL, and PostGIS) across different Operating Systems.

---

## 🐧 1. Linux (Ubuntu / Debian)

Run the following commands in your terminal:

### A. PHP & Extensions
```bash
sudo apt update
sudo apt install -y software-properties-common
sudo add-apt-repository -y ppa:ondrej/php
sudo apt update

# Install PHP 8.2 and common required modules
sudo apt install -y php8.2 php8.2-cli php8.2-common php8.2-pgsql php8.2-xml php8.2-curl php8.2-mbstring php8.2-zip php8.2-gd php8.2-sqlite3
```

### B. Composer
```bash
# Download and install Composer globally
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
chmod +x /usr/local/bin/composer
```

### C. Node.js & npm
```bash
# Install Node.js v18 LTS using NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### D. Python 3 & venv
```bash
sudo apt install -y python3 python3-pip python3-venv
```

### E. PostgreSQL & PostGIS
```bash
sudo apt install -y postgresql-16 postgresql-contrib postgresql-16-postgis-3
# Start the database service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

---

## 🍏 2. macOS (Homebrew)

First, make sure you have the [Homebrew package manager](https://brew.sh/) installed, then run:

### A. PHP, Composer, Node.js, and Python
```bash
brew update

# Install dependencies
brew install php@8.2
brew install composer
brew install node@18
brew install python@3.10
```

### B. PostgreSQL & PostGIS
```bash
brew install postgresql@15 postgis

# Start PostgreSQL service in the background
brew services start postgresql@15
```

---

## 🪟 3. Windows

Follow these installer links to download and install the prerequisite packages:

### A. PHP
1. Download the thread-safe version of PHP 8.2 zip from [php.net/downloads](https://windows.php.net/download/).
2. Extract to `C:\php`.
3. Add `C:\php` to your system's Environment Variables **Path**.
4. Rename `php.ini-development` to `php.ini` and uncomment extensions: `extension=pgsql`, `extension=pdo_pgsql`, `extension=curl`, `extension=fileinfo`, `extension=mbstring`, `extension=openssl`.

### B. Composer
Download and run the official installer executable: [Composer-Setup.exe](https://getcomposer.org/Composer-Setup.exe).

### C. Node.js & npm
Download and run the Node.js MSI installer: [Node.js Windows Installer (.msi)](https://nodejs.org/en/download/).

### D. Python
Download the installer from [python.org/downloads](https://www.python.org/downloads/windows/) and ensure you check **"Add Python to PATH"** during installation.

### E. PostgreSQL & PostGIS
1. Download and run the PostgreSQL database installer: [EnterpriseDB PostgreSQL Installer](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads).
2. During the setup wizard, stack builder will launch. Select the **PostGIS** spatial package under the "Spatial Extensions" category and complete the installation.
