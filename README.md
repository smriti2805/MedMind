# MedMind: Frontend Web Application 💊

This repository contains the user-facing web application for the MedMind project—a comprehensive AI-powered healthcare companion. It is a **Flask** application that provides the user interface, manages user accounts, schedules reminders, and serves as the client for the specialized AI services hosted by the separate Backend API.

## 🌟 Key Features

* **User Accounts & Profiles:** Secure registration, login, and profile management.
* **Health Reminders:** Scheduling and push notifications for medications and appointments using **Flask-APScheduler** and **PyWebPush**.
* **Integrated AI Services:** Dedicated front-end pages to interact with the backend API for:
    * Medical Chatbot (`/chat`)
    * Symptom Checker (`/symptom-checker`)
    * Lab Report Analysis (`/lab-report-analysis`)
    * Mental Health Support (`/mental-health-support`)
* **Doctor Finder:** A map-based search page to locate nearby healthcare professionals.

## 🛠️ Tech Stack

* **Package Manager:** [uv](https://docs.astral.sh/uv/) (Astral)
* **Web Framework:** Flask
* **Database:** SQLite (managed with **Flask-SQLAlchemy** and **Flask-Migrate**)
* **Scheduler:** Flask-APScheduler
* **Frontend:** HTML/Jinja2, Tailwind CSS, Vanilla JavaScript

## 🔗 Project Dependency (Backend API)

This application is the client for the AI services. To run MedMind fully, you **must** also run the separate backend service.

* **Backend Repository:** [https://github.com/kishandev2509/MedMind---Backend](https://github.com/kishandev2509/MedMind---Backend)
* **Configuration:** The frontend is configured to communicate with the backend on **`http://127.0.0.1:8000`**.

## 🚀 Setup & Installation

### Prerequisites
* **uv:** This project uses `uv` for ultra-fast package management. You do not need to manually create virtual environments.
    * [**Install uv (Official Guide)**](https://docs.astral.sh/uv/getting-started/installation/)
* The **MedMind AI Backend API** running on `http://127.0.0.1:8000`.

### Installation Steps

1.  **Clone this repository:**
    ```bash
    git clone [https://github.com/smriti2805/MedMind](https://github.com/smriti2805/MedMind)
    cd MedMind
    ```

2.  **Sync Dependencies:**
    With `uv`, you don't need to manually create a virtual environment or install packages one by one. Just run:
    ```bash
    uv sync
    ```
    This will automatically create the environment and install all required dependencies defined in `pyproject.toml`.

3.  **Configure Environment Variables:**
    Create an `.env` file in the root directory to set configuration values.
    ```env
    SECRET_KEY="A_VERY_SECRET_KEY"
    DATABASE_URL="sqlite:///medmind.db"
    # VAPID Keys are required for push notifications
    VAPID_PUBLIC_KEY=...
    VAPID_PRIVATE_KEY=...
    ```

4.  **Run the Application:**
    Start the project using `uv`:
    ```bash
    uv run main.py
    ```
    The application will be available at the configured `SERVER_NAME` (default: `http://127.0.0.1:5000`).
