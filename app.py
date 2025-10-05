import base64
import os
from flask import Flask, render_template, Response, jsonify, request
import requests
from flask_wtf import CSRFProtect
from static_data import homepage_cards, service_cards
from forms import ChatBoxForm
from utils import get_response
from database_data import load_blogs_from_json
from config import LANGSERVE_STREAM_URL

app = Flask(__name__)
app.secret_key = "your_secret_key"
csrf = CSRFProtect(app)
blog_posts = load_blogs_from_json()


@app.route("/")
def home():
    form = ChatBoxForm()

    # Folder with your images
    image_folder = os.path.join(app.static_folder, "carousel-images")

    # Manually defined captions (order matters)
    captions = [
        "Mental Health Support",
        "Health Tips & Reminders",
        "Do Exercise Regularly",
        "Keep a Balanced Diet",
        "Get Adequate Sleep",
        "Avoid Smoking & Alcohol",
        "Discover potential skin issues with our AI-Powered Skin Checker",
    ]

    # Collect only image files and sort them
    image_files = sorted([f for f in os.listdir(image_folder) if f.lower().endswith((".png", ".jpg", ".jpeg", ".gif", ".webp"))])

    # Pair images with captions using dictionary
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
        return render_template("blog_detail.html", blog=blog)
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


@app.route("/api/stream_chat", methods=["POST"])
def stream_chat_proxy():
    try:
        user_query = request.form.get("query", "")
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

    def generate():
        try:
            with requests.post(LANGSERVE_STREAM_URL, json=payload, stream=True, headers={"Content-Type": "application/json"}) as response:
                print(response.status_code, response.reason)
                response.raise_for_status()
                for chunk in response.iter_content(chunk_size=None, decode_unicode=True):
                    yield chunk
        except requests.exceptions.RequestException as e:
            print(f"Error connecting to LangServe: {e}")
            yield f"❌ Error: Could not connect to the model ({e})"
        except Exception as e:
            print(f"An unexpected error occurred: {e}")
            yield "❌ Error: An internal server error occurred."

    return Response(generate(), mimetype="text/event-stream")


if __name__ == "__main__":
    app.run(debug=True)
