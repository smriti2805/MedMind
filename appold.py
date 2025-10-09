import base64
import os
import requests
from flask import Flask, Response, jsonify, render_template, request
from flask_wtf import CSRFProtect
from queue import Queue
import json
import datetime
from apscheduler.jobstores.memory import MemoryJobStore
from flask_apscheduler import APScheduler
from config import CHAT_STREAM_URL, SYMPTOM_CHECKER_STREAM_URL, LAB_REPORT_ANALYSIS_STREAM_URL, MENTAL_HEALTH_STREAM_URL
from database_data import load_blogs_from_json
from forms import ChatBoxForm
from static_data import homepage_cards, service_cards
from utils import get_response

app = Flask(__name__)
app.secret_key = "your_secret_key"
csrf = CSRFProtect(app)
blog_posts = load_blogs_from_json()


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

    slides = [
        {
            "file": f"carousel-images/{file}",
            "caption": captions[i] if i < len(captions) else "",
        }
        for i, file in enumerate(image_files)
    ]

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


@app.route("/contact", methods=['GET','POST'])
def contact():
    if request.method == "POST":
        print(request)
        return json.dumps({"sucess":True})
    return render_template("contact.html")


@app.route("/chat")
def chat():
    return render_template("chatbotPage.html")


@app.route("/result", methods=["POST"])
def result():
    form = ChatBoxForm()
    if form.validate_on_submit():
        user_input = form.user_input.data
        return render_template("result.html", result=get_response(user_input))
    return render_template("home.html", form=form, homepage_cards=homepage_cards)


def generate(api_url, payload):
    try:
        with requests.post(api_url, json=payload, stream=True, headers={"Content-Type": "application/json"}) as response:
            response.raise_for_status()
            for chunk in response.iter_content(chunk_size=None, decode_unicode=True):
                yield chunk
    except requests.exceptions.RequestException as e:
        print(f"Error connecting to LangServe: {e}")
        yield f"event: error\r\ndata: ❌ Error: Could not connect to the model. Try Again later.\r\nerror: {e}\r\n\r\n"
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        yield f"event: error\r\ndata: ❌ Error: An internal server error occurred.\r\nerror: {e}\r\n\r\n"


def streamer(api_url):
    try:
        user_query = request.form.get("query")
        image_file = request.files.get("image_file")

        image_data_uri = None
        if image_file:
            binary_data = image_file.read()
            base64_encoded_data = base64.b64encode(binary_data).decode("utf-8")
            mime_type = image_file.mimetype or "image/jpeg"
            image_data_uri = f"data:{mime_type};base64,{base64_encoded_data}"
        payload = {"input": {"query": user_query, "image_url": image_data_uri}, "config": {}, "kwargs": {}}
    except Exception as e:
        print(f"❌ Error during file parsing/Base64 conversion: {e}")
        return jsonify({"error": "Failed to process image/data."}), 400

    return Response(generate(api_url, payload), mimetype="text/event-stream")


@app.route("/symptom-checker")
def symptom_checker():
    return render_template("symptomChecker.html")


@app.route("/lab-report-analysis")
def lab_report():
    return render_template("labReportAnalysis.html")


@app.route("/test")
def test():
    return render_template("zzzzz.html")


@app.route("/mental-health-support")
def mental_health():
    return render_template("mentalHealthSupport.html")


@app.route("/api/stream_chat", methods=["POST"])
def stream_chat_proxy():
    return streamer(api_url=CHAT_STREAM_URL)


@app.route("/api/symptom_checker", methods=["POST"])
def symptom_checker_proxy():
    return streamer(api_url=SYMPTOM_CHECKER_STREAM_URL)


@app.route("/api/mental_health", methods=["POST"])
def mental_health_proxy():
    try:
        user_query = request.form.get("query")
        payload = {"input": {"query": user_query}, "config": {"configurable": {"session_id": "user123"}}, "kwargs": {}}
    except Exception as e:
        print(f"❌ Error during file parsing/Base64 conversion: {e}")
        return jsonify({"error": "Failed to process image/data."}), 400

    return Response(generate(MENTAL_HEALTH_STREAM_URL, payload), mimetype="text/event-stream")


@app.route("/api/analyze_reports", methods=["POST"])
def analyze_reports_proxy():
    try:
        uploaded_files = request.files.getlist("reports")
        if not uploaded_files:
            return jsonify({"error": "No files were uploaded."}), 400
        print(f"Received {len(uploaded_files)} files:")
        images = []
        for f in uploaded_files:
            binary_data = f.read()
            base64_encoded_data = base64.b64encode(binary_data).decode("utf-8")
            mime_type = f.mimetype or "image/jpeg"
            image_data_uri = f"data:{mime_type};base64,{base64_encoded_data}"
            images.append(image_data_uri)
        payload = {"input": {"images": images}, "config": {}, "kwargs": {}}
    except Exception as e:
        print(f"❌ Error during file parsing/Base64 conversion: {e}")
        return jsonify({"error": "Failed to process image/data."}), 400
    return Response(generate(LAB_REPORT_ANALYSIS_STREAM_URL, payload), mimetype="text/event-stream")


@app.errorhandler(400)
def handle_bad_request(e):
    return f"❌ Bad Request intercepted: {str(e)}", 400


@app.errorhandler(404)
def handle_not_found(e):
    return render_template("404.html"), 404







# --- In-Memory Storage & Queue (Instead of Database & Redis) ---
reminders_store = {}
reminder_id_counter = 0
notification_queue = Queue() # Use a simple in-memory queue instead of Redis

# --- Scheduler Configuration ---
# Use MemoryJobStore for the demo - jobs are lost on restart
app.config['SCHEDULER_JOBSTORES'] = {'default': MemoryJobStore()}
app.config['SCHEDULER_API_ENABLED'] = True
scheduler = APScheduler()
scheduler.init_app(app)
scheduler.start()

def send_reminder_notification(user_id, medicine_name):
    """
    This function is called by the scheduler.
    It now puts a notification into the in-memory queue.
    """
    with app.app_context():
        print(f"Putting reminder in queue for user {user_id} for {medicine_name}")
        notification_data = {
            "title": "MedMind Reminder",
            "body": f"It's time to take your medicine: {medicine_name}."
        }
        notification_queue.put(json.dumps(notification_data))

# --- API Endpoints ---
@app.route('/reminders')
def reminders():
    """Serves the main HTML page."""
    return render_template('reminders.html')

@app.route('/add_reminder', methods=['POST'])
def add_reminder():
    """Saves a new reminder in memory and schedules the notification job."""
    global reminder_id_counter
    user_id = "user123" # Hardcoded for demo
    medicine = request.form.get('medicine_name')
    time_str = request.form.get('notification_time')
    
    if not medicine or not time_str:
        return jsonify({"error": "Missing form data"}), 400

    notification_time = datetime.datetime.strptime(time_str, '%H:%M').time()

    # Create and store the reminder in our dictionary
    reminder_id_counter += 1
    new_id = reminder_id_counter
    reminders_store[new_id] = {
        "id": new_id,
        "user_id": user_id,
        "medicine_name": medicine,
        "notification_time": notification_time
    }

    # Add a job to the scheduler
    scheduler.add_job(
        id=f'reminder_{new_id}',
        func=send_reminder_notification,
        trigger='cron',
        hour=notification_time.hour,
        minute=notification_time.minute,
        args=[user_id, medicine]
    )
    
    print(f"Scheduled reminder for {medicine} at {notification_time.strftime('%H:%M')} for user {user_id}")
    return jsonify({"success": True, "message": "Reminder set!"}), 201


@app.route('/notify/<user_id>')
def notify(user_id):
    """The endpoint the browser connects to for notifications."""
    def event_stream():
        while True:
            if notification_queue.empty():
                continue
            print("getting stream data")
            message = notification_queue.get()
            yield f"data: {message}\n\n"
            print("stream data sent")

    return Response(event_stream(), mimetype='text/event-stream')





if __name__ == "__main__":
    app.run(debug=True, port=5000, threaded=True)
