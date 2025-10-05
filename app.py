import base64
import os
import requests
from flask import Flask, Response, jsonify, render_template, request
from flask_wtf import CSRFProtect

from config import CHAT_STREAM_URL, SYMPTOM_CHECKER_STREAM_URL, LAB_REPORT_ANALYSIS_STREAM_URL
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


@app.route("/contact")
def contact():
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


@app.route("/api/stream_chat", methods=["POST"])
def stream_chat_proxy():
    return streamer(api_url=CHAT_STREAM_URL)


@app.route("/api/symptom_checker", methods=["POST"])
def symptom_checker_proxy():
    return streamer(api_url=SYMPTOM_CHECKER_STREAM_URL)


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
    return  Response(generate(LAB_REPORT_ANALYSIS_STREAM_URL, payload), mimetype="text/event-stream")


@app.errorhandler(400)
def handle_bad_request(e):
    return f"❌ Bad Request intercepted: {str(e)}", 400


@app.errorhandler(404)
def handle_not_found(e):
    return render_template("404NotFound.html"), 404


if __name__ == "__main__":
    app.run(debug=True, port=5000, threaded=True)
