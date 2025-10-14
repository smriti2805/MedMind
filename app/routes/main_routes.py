import os
from flask import Blueprint, make_response, render_template, current_app, request, jsonify, send_from_directory

from app.utils import read_blogs
from ..static_data import homepage_cards, service_cards

main_bp = Blueprint("main", __name__)


@main_bp.route("/")
def home():
    carousel_image_folder = os.path.join(current_app.static_folder, "carousel-images")
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
    return render_template("home.html", homepage_cards=homepage_cards, slides=slides)

blog_posts = read_blogs()


@main_bp.route("/blog_image/<filename>")
def blog_image_file(filename):
    return send_from_directory(current_app.config["BLOG_IMAGE_FOLDER"], filename)

@main_bp.route("/blogs")
def blogs():
    blog_posts = read_blogs()
    return render_template("blogs.html", blog_posts=blog_posts)


@main_bp.route("/blog/<int:blog_id>")
def blog_detail(blog_id):
    blog = next((b for b in blog_posts if b["id"] == blog_id), None)
    if blog:
        return render_template("blogDetail.html", blog=blog)
    return "Blog not found", 404


@main_bp.route("/about")
def about():
    return render_template("about.html")


@main_bp.route("/services")
def services():
    return render_template("services.html", service_cards=service_cards)


@main_bp.route("/contact", methods=["GET", "POST"])
def contact():
    if request.method == "POST":
        print(request.form)
        return jsonify({"success": True})
    return render_template("contact.html")


@main_bp.route("/chat")
def chat():
    return render_template("services/chatbotPage.html")


@main_bp.route("/symptom-checker")
def symptom_checker():
    return render_template("services/symptomChecker.html")


@main_bp.route("/lab-report-analysis")
def lab_report():
    return render_template("services/labReportAnalysis.html")


@main_bp.route("/mental-health-support")
def mental_health():
    return render_template("services/mentalHealthSupport.html")


@main_bp.route("/find-doctors")
def find_doctors():
    """Renders the map search page."""
    return render_template("services/findDoctors.html")


@main_bp.app_errorhandler(404)
def handle_not_found(error):
    return render_template("error/404.html"), 404


@main_bp.route("/service-worker.js")
def service_worker():
    """
    Serves the service-worker.js file from the static/js directory
    and adds the necessary Service-Worker-Allowed header.
    """
    # The path is relative to the app's root directory
    response = make_response(send_from_directory(os.path.join(current_app.static_folder, "js"), "service-worker.js"))
    response.headers["Content-Type"] = "application/javascript"
    response.headers["Service-Worker-Allowed"] = "/"
    return response