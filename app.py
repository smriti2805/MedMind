import os
from flask import Flask, render_template
from flask_wtf import CSRFProtect
from static_data import homepage_cards
from forms import ChatBoxForm
from utils import get_response

app = Flask(__name__)
app.secret_key = "your_secret_key"
csrf = CSRFProtect(app)


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
    image_files = sorted([
        f for f in os.listdir(image_folder)
        if f.lower().endswith((".png", ".jpg", ".jpeg", ".gif", ".webp"))
    ])

    # Pair images with captions using dictionary
    slides = [
        {"file": f"carousel-images/{file}", "caption": captions[i] if i < len(captions) else ""}
        for i, file in enumerate(image_files)
    ]

    return render_template(
        "home.html",
        form=form,
        homepage_cards=homepage_cards,
        slides=slides
    )




@app.route("/about")
def about():
    return render_template("about.html")


@app.route("/services")
def services():
    return render_template("services.html")


@app.route("/contact")
def contact():
    return render_template("contact.html")


@app.route("/result", methods=["POST"])
def result():
    form = ChatBoxForm()
    if form.validate_on_submit():
        user_input = form.user_input.data
        return render_template("result.html", result=get_response(user_input))
    return render_template("home.html", form=form, homepage_cards=homepage_cards)


if __name__ == "__main__":
    app.run(debug=True)
