import os
from flask import Flask, render_template
from flask_wtf import CSRFProtect
from static_data import homepage_cards, service_cards
from forms import ChatBoxForm
from utils import get_response
from database_data import load_blogs_from_json

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
    image_files = sorted(
        [
            f
            for f in os.listdir(image_folder)
            if f.lower().endswith((".png", ".jpg", ".jpeg", ".gif", ".webp"))
        ]
    )

    # Pair images with captions using dictionary
    slides = [
        {
            "file": f"carousel-images/{file}",
            "caption": captions[i] if i < len(captions) else "",
        }
        for i, file in enumerate(image_files)
    ]

    return render_template(
        "home.html", form=form, homepage_cards=homepage_cards, slides=slides
    )

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


if __name__ == "__main__":
    app.run(debug=True)
