from flask import url_for
from app import db, login_manager
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


class User(UserMixin, db.Model):
    """Database model for a user."""

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256))
    profile_photo = db.Column(db.String(20))
    height = db.Column(db.Float, nullable=True)
    weight = db.Column(db.Float, nullable=True)
    blood_type = db.Column(db.String(5), nullable=True)
    allergies = db.Column(db.Text, nullable=True)
    chronic_conditions = db.Column(db.Text, nullable=True)

    push_subscription = db.Column(db.Text, nullable=True)
    reminders = db.relationship("Reminder", backref="author", lazy="dynamic")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def get_profile_photo(self):
        if self.profile_photo:
            return url_for("auth.uploaded_file", filename=self.profile_photo)
        return f"https://ui-avatars.com/api/?name={self.username.replace(' ', '+')}&background=random"

    def __repr__(self):
        return f"<User {self.username}, Image: {self.profile_photo}>"


class Reminder(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    medicine_name = db.Column(db.String(100), nullable=False)
    notification_time = db.Column(db.Time, nullable=False)

    def __repr__(self):
        return f"<Reminder {self.medicine_name}>"
