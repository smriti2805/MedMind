import base64
import os
import requests
import json
import datetime
from flask import Flask, Response, jsonify, render_template, request
from flask_wtf import CSRFProtect
from queue import Queue
from apscheduler.jobstores.memory import MemoryJobStore
from flask_apscheduler import APScheduler

from config import CHAT_STREAM_URL, SYMPTOM_CHECKER_STREAM_URL, LAB_REPORT_ANALYSIS_STREAM_URL, MENTAL_HEALTH_STREAM_URL
from database_data import load_blogs_from_json
from forms import ChatBoxForm
from static_data import homepage_cards, service_cards

app = Flask(__name__)
app.secret_key = "your_secret_key"
csrf = CSRFProtect(app)
blog_posts = load_blogs_from_json()


# --- Static Page Routes (Unchanged) ---
@app.route("/")
def home():
    form = ChatBoxForm()
    carousel_image_folder = os.path.join(app.static_folder, "carousel-images")
    captions = [
        "Mental Health Support",
        "Health Tips & Reminders",
        "Do Exercise Regularly",
        "Keep a Balanced Diet",
        "Get Adequate Sleep",
        "Avoid Smoking & Alcohol",
        "Discover potential skin issues with our AI-Powered Skin Checker",
    ]
    image_files = sorted([f for f in os.listdir(carousel_image_folder) if f.lower().endswith((".png", ".jpg", ".jpeg", ".gif", ".webp"))])
    slides = [{"file": f"carousel-images/{file}", "caption": captions[i] if i < len(captions) else ""} for i, file in enumerate(image_files)]
    return render_template("home.html", form=form, homepage_cards=homepage_cards, slides=slides)


@app.route("/blogs")
def blogs():
    return render_template("blogs.html", blog_posts=blog_posts)


@app.route("/blog/<int:blog_id>")
def blog_detail(blog_id):
    blog = next((b for b in blog_posts if b["id"] == blog_id), None)
    if blog:
        return render_template("blogDetail.html", blog=blog)
    return "Blog not found", 404


@app.route("/about")
def about():
    return render_template("about.html")


@app.route("/services")
def services():
    return render_template("services.html", service_cards=service_cards)


@app.route("/contact", methods=["GET", "POST"])
def contact():
    if request.method == "POST":
        print(request.form)
        return jsonify({"success": True})
    return render_template("contact.html")


@app.route("/chat")
def chat():
    return render_template("chatbotPage.html")


@app.route("/symptom-checker")
def symptom_checker():
    return render_template("symptomChecker.html")


@app.route("/lab-report-analysis")
def lab_report():
    return render_template("labReportAnalysis.html")


@app.route("/mental-health-support")
def mental_health():
    return render_template("mentalHealthSupport.html")


# --- Core Streaming Logic ---


def generate(api_url, payload):
    """Yields chunks from the LangServe streaming endpoint."""
    try:
        with requests.post(api_url, json=payload, stream=True, headers={"Content-Type": "application/json"}) as response:
            response.raise_for_status()
            for chunk in response.iter_content(chunk_size=None, decode_unicode=True):
                yield chunk
    except requests.exceptions.RequestException as e:
        print(f"Error connecting to LangServe: {e}")
        yield f"event: error\ndata: {json.dumps(str(e))}\n\n"
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        yield f"event: error\ndata: {json.dumps(str(e))}\n\n"


def create_stream_response(api_url, extra_config=None):
    """
    Handles incoming requests with optional text and multiple images,
    builds the appropriate payload, and returns a streaming response.
    """
    try:
        query = request.form.get("query", "")
        image_files = request.files.getlist("images")  # Standardized key for images

        images_data_uris = []
        if image_files:
            for f in image_files:
                binary_data = f.read()
                base64_data = base64.b64encode(binary_data).decode("utf-8")
                mime_type = f.mimetype or "image/jpeg"
                images_data_uris.append(f"data:{mime_type};base64,{base64_data}")

        # Base payload structure
        payload = {"input": {"query": query, "images": images_data_uris}, "config": {}, "kwargs": {}}

        # Add extra configuration if provided (for mental health chat)
        if extra_config:
            payload["config"] = extra_config

        return Response(generate(api_url, payload), mimetype="text/event-stream")

    except Exception as e:
        print(f"❌ Error during request setup: {e}")
        return jsonify({"error": f"Failed to process request: {e}"}), 400


# --- Refactored API Proxy Routes ---


@app.route("/api/stream_chat", methods=["POST"])
def stream_chat_proxy():
    """Handles chatbot requests, now with multiple image support."""
    return create_stream_response(api_url=CHAT_STREAM_URL)


@app.route("/api/symptom_checker", methods=["POST"])
def symptom_checker_proxy():
    """Handles symptom checker requests, now with multiple image support."""
    print("Symptom checker called")
    return create_stream_response(api_url=SYMPTOM_CHECKER_STREAM_URL)


@app.route("/api/analyze_reports", methods=["POST"])
def analyze_reports_proxy():
    """Handles lab report analysis requests."""
    return create_stream_response(api_url=LAB_REPORT_ANALYSIS_STREAM_URL)


@app.route("/api/mental_health", methods=["POST"])
def mental_health_proxy():
    """Handles mental health chat requests, adding session config."""
    config = {"configurable": {"session_id": "user123"}}  # Hardcoded for demo
    return create_stream_response(api_url=MENTAL_HEALTH_STREAM_URL, extra_config=config)


# --- Error Handlers (Unchanged) ---
@app.errorhandler(404)
def handle_not_found(e):
    return render_template("404.html"), 404


# --- Medicine Reminder / Notification System (Unchanged, with corrected loop) ---
reminders_store = {}
reminder_id_counter = 0
notification_queue = Queue()

app.config["SCHEDULER_JOBSTORES"] = {"default": MemoryJobStore()}
# app.config['SCHEDULER_API_ENABLED'] = True
scheduler = APScheduler()
scheduler.init_app(app)
scheduler.start()


def send_reminder_notification(user_id, medicine_name):
    with app.app_context():
        print(f"Putting reminder in queue for user {user_id} for {medicine_name}")
        notification_data = {"title": "MedMind Reminder", "body": f"It's time to take your medicine: {medicine_name}."}
        notification_queue.put(json.dumps(notification_data))


@app.route("/reminders")
def reminders():
    return render_template("reminders.html")


@app.route("/add_reminder", methods=["POST"])
def add_reminder():
    global reminder_id_counter
    user_id = "user123"
    medicine = request.form.get("medicine_name")
    time_str = request.form.get("notification_time")

    if not medicine or not time_str:
        return jsonify({"error": "Missing form data"}), 400

    notification_time = datetime.datetime.strptime(time_str, "%H:%M").time()

    reminder_id_counter += 1
    new_id = reminder_id_counter
    reminders_store[new_id] = {"id": new_id, "user_id": user_id, "medicine_name": medicine, "notification_time": notification_time}

    scheduler.add_job(
        id=f"reminder_{new_id}",
        func=send_reminder_notification,
        trigger="cron",
        hour=notification_time.hour,
        minute=notification_time.minute,
        args=[user_id, medicine],
    )

    print(f"Scheduled reminder for {medicine} at {notification_time.strftime('%H:%M')} for user {user_id}")
    return jsonify({"success": True, "message": "Reminder set!"}), 201


@app.route("/notify/<user_id>")
def notify(user_id):
    def event_stream():
        while True:
            # .get() is a blocking call and will wait efficiently for a message.
            message = notification_queue.get()
            yield f"data: {message}\n\n"

    return Response(event_stream(), mimetype="text/event-stream")


# --- Main Execution ---
if __name__ == "__main__":
    app.run(debug=True, port=5000, threaded=True)
