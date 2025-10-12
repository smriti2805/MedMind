import os
from flask import Blueprint, current_app, render_template, redirect, request, send_from_directory, url_for, flash
from flask_login import login_user, logout_user, login_required, current_user
from app import db
from app.models import Reminder, User
from app.forms import LoginForm, RegistrationForm, UpdateProfileForm
import secrets
from PIL import Image

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('main.home'))
    form = RegistrationForm()
    if form.validate_on_submit():
        user = User(username=form.username.data, email=form.email.data)
        user.set_password(form.password.data)
        db.session.add(user)
        db.session.commit()
        flash('Congratulations, you are now a registered user!', 'success')
        return redirect(url_for('auth.login'))
    return render_template('auth/register.html', title='Register', form=form)

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('main.home'))
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data).first()
        if user is None or not user.check_password(form.password.data):
            flash('Invalid email or password', 'danger')
            return redirect(url_for('auth.login'))
        login_user(user)
        return redirect(url_for('main.home'))
    return render_template('auth/login.html', title='Sign In', form=form)

@auth_bp.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('main.home'))


def save_picture(form_picture):
    random_hex = secrets.token_hex(8)
    _, f_ext = os.path.splitext(form_picture.filename)
    picture_fn = random_hex + f_ext
    picture_path = os.path.join(current_app.config["UPLOAD_FOLDER"], picture_fn)

    output_size = (150, 150)
    i = Image.open(form_picture)
    i.thumbnail(output_size)
    i.save(picture_path)

    return picture_fn


@auth_bp.route("/profile", methods=["GET", "POST"])
@login_required
def profile():
    form = UpdateProfileForm()
    if form.validate_on_submit():
        if form.picture.data:
            picture_file = save_picture(form.picture.data)
            current_user.profile_photo = picture_file

        current_user.username = form.username.data
        current_user.email = form.email.data
        current_user.height = form.height.data
        current_user.weight = form.weight.data
        current_user.blood_type = form.blood_type.data
        current_user.allergies = form.allergies.data
        current_user.chronic_conditions = form.chronic_conditions.data

        db.session.commit()
        flash("Your account has been updated!", "success")
        return redirect(url_for("auth.profile"))

    elif request.method == "GET":
        form.username.data = current_user.username
        form.email.data = current_user.email
        form.height.data = current_user.height
        form.weight.data = current_user.weight
        form.blood_type.data = current_user.blood_type
        form.allergies.data = current_user.allergies
        form.chronic_conditions.data = current_user.chronic_conditions

    return render_template("profile/profile.html", title="Profile", form=form)


@auth_bp.route("/uploads/<filename>")
def uploaded_file(filename):
    return send_from_directory(current_app.config["UPLOAD_FOLDER"], filename)


def get_user_reminders():
    """Helper function to fetch user's reminders."""
    return current_user.reminders.order_by(Reminder.notification_time).limit(3).all()


@auth_bp.route("/dashboard")
@login_required
def dashboard():
    """Displays the user's personalized dashboard."""
    # Fetch real data for the user
    reminders = get_user_reminders()

    # --- MOCK DATA (In a real app, you'd query this from your database) ---
    recent_symptoms = [
        {"name": "Headache", "severity": 3, "when": "Today"},
        {"name": "Fatigue", "severity": 4, "when": "Yesterday"},
        {"name": "Muscle Aches", "severity": 2, "when": "2 days ago"},
    ]
    symptom_trends = {"labels": ["Mon", "Tue", "Wed", "Thu", "Fri"], "data": [25, 20, 22, 18, 15]}
    medication_adherence = {"labels": ["Mon", "Tue", "Wed", "Thu", "Fri"], "data": [100, 100, 80, 100, 95]}
    wellness_score = 78

    return render_template(
        "profile/dashboard.html",
        reminders=reminders,
        recent_symptoms=recent_symptoms,
        symptom_trends=symptom_trends,
        medication_adherence=medication_adherence,
        wellness_score=wellness_score,
    )