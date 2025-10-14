import os

# Get the absolute path of the directory the config.py file is in
basedir = os.path.abspath(os.path.dirname(__file__))


class Config:
    """Base configuration."""

    SECRET_KEY = os.environ.get("SECRET_KEY") or "a-hard-to-guess-string"

    SERVER_NAME = os.environ.get("SERVER_NAME") or "127.0.0.1:5000"

    # It now points to a file named 'medmind.db' inside an 'instance' folder
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL") or "sqlite:///medmind.db"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Scheduler Config
    SCHEDULER_JOBSTORES = {"default": {"type": "sqlalchemy", "url": "sqlite:///instance/jobs.db"}}
    # SCHEDULER_API_ENABLED = True

    UPLOAD_FOLDER = os.path.join(basedir, "profile_pics")
    BLOG_IMAGE_FOLDER = os.path.join(basedir, "blogs_images")
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    # --- VAPID KEYS FOR PUSH NOTIFICATIONS ---
    VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY")
    VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY")
    VAPID_CLAIMS = {"sub": "mailto:kishandev2509@gmail.com"}

    # LangServe API URLs
    BASE_LANGSERVE_URL = "http://127.0.0.1:8000/{path}/stream"
    CHAT_STREAM_URL = BASE_LANGSERVE_URL.format(path="chat")
    SYMPTOM_CHECKER_STREAM_URL = BASE_LANGSERVE_URL.format(path="symptom_checker")
    LAB_REPORT_ANALYSIS_STREAM_URL = BASE_LANGSERVE_URL.format(path="lab_report_analysis")
    MENTAL_HEALTH_STREAM_URL = BASE_LANGSERVE_URL.format(path="mental_health_support")
