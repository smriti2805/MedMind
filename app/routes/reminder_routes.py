from flask import Blueprint, render_template, request, jsonify, url_for, Response, current_app
from flask_login import login_required, current_user
from app import db, scheduler, notification_queue
from app.models import Reminder, User
from app.forms import ReminderForm
from pywebpush import webpush, WebPushException
import json

reminder_bp = Blueprint("reminder", __name__)


def send_reminder_notification(user_id, medicine_name):
    """
    This function is called by the scheduler.
    It fetches the user's push subscription and sends a push notification.
    """
    with scheduler.app.app_context():
        user = User.query.get(user_id)
        if user and user.push_subscription:
            print(f"Sending push notification to user {user_id} for {medicine_name}")

            subscription_info = json.loads(user.push_subscription)

            notification_data = json.dumps(
                {
                    "title": "MedMind Reminder",
                    "message": f"It's time to take your medicine: {medicine_name}.",
                    "url": url_for("reminder.reminders", _external=True),
                }
            )

            try:
                return webpush(
                    subscription_info,
                    notification_data,
                    current_app.config["VAPID_PRIVATE_KEY"],
                    current_app.config["VAPID_CLAIMS"].copy(),
                    headers={"x-wns-cache-policy": "no-cache"},
                    verbose=True,
                )
            except WebPushException as ex:
                print(repr(ex))
        else:
            print(f"User {user_id} not found or has no push subscription.")


@reminder_bp.route("/vapid-public-key")
@login_required
def get_vapid_public_key():
    return jsonify({"public_key": current_app.config["VAPID_PUBLIC_KEY"]})


@reminder_bp.route("/save-subscription", methods=["POST"])
@login_required
def save_subscription():
    """
    Receives a push subscription object from the browser and saves it to the current user.
    """
    subscription_data = request.json
    if not subscription_data:
        return jsonify({"error": "No subscription data provided."}), 400

    current_user.push_subscription = json.dumps(subscription_data)
    db.session.commit()

    print(f"Saved push subscription for user: {current_user.username}")
    return jsonify({"success": True})


@reminder_bp.route("/reminders")
@login_required
def reminders():
    """Displays the main reminders page with a list of all reminders."""
    user_reminders = Reminder.query.filter_by(user_id=current_user.id).order_by(Reminder.notification_time).all()
    return render_template("services/reminders.html", reminders=user_reminders)


@reminder_bp.route("/add_reminder", methods=["POST"])
@login_required
def add_reminder():
    """Handles adding a new reminder from the modal form."""
    form = ReminderForm()
    if form.validate_on_submit():
        medicine_name = form.medicine_name.data
        notification_time = form.notification_time.data

        new_reminder = Reminder(user_id=current_user.id, medicine_name=medicine_name, notification_time=notification_time)
        db.session.add(new_reminder)
        db.session.commit()

        scheduler.add_job(
            id=f"reminder_{new_reminder.id}",
            func=send_reminder_notification,
            trigger="cron",
            hour=notification_time.hour,
            minute=notification_time.minute,
            args=[current_user.id, new_reminder.medicine_name],
        )

        return jsonify({"success": True, "message": "Reminder set successfully!"})

    return jsonify({"success": False, "errors": form.errors}), 400


@reminder_bp.route("/get_reminder/<int:reminder_id>", methods=["GET"])
@login_required
def get_reminder(reminder_id):
    """Fetches data for a single reminder to pre-fill the edit modal."""
    reminder = Reminder.query.get_or_404(reminder_id)
    if reminder.author != current_user:
        return jsonify({"error": "Unauthorized"}), 403
    return jsonify({"id": reminder.id, "medicine_name": reminder.medicine_name, "notification_time": reminder.notification_time.strftime("%H:%M")})


@reminder_bp.route("/have_reminder", methods=["GET"])
@login_required
def have_reminder():
    have_reminder = Reminder.query.count()
    return jsonify({"have_reminder": have_reminder > 0})


@reminder_bp.route("/edit_reminder", methods=["POST"])
@login_required
def edit_reminder():
    """Handles updating an existing reminder from the modal form."""
    reminder_id = request.form.get("reminder_id")
    if not reminder_id:
        return jsonify({"success": False, "error": "Reminder ID is missing."}), 400

    reminder = Reminder.query.get_or_404(reminder_id)
    if reminder.author != current_user:
        return jsonify({"success": False, "error": "Unauthorized"}), 403

    form = ReminderForm(data=request.form)
    if form.validate_on_submit():
        reminder.medicine_name = form.medicine_name.data
        reminder.notification_time = form.notification_time.data
        db.session.commit()

        if scheduler.get_job(id=f"reminder_{reminder.id}"):
            scheduler.modify_job(
                id=f"reminder_{reminder.id}",
                trigger="cron",
                hour=reminder.notification_time.hour,
                minute=reminder.notification_time.minute,
                args=[current_user.id, reminder.medicine_name],
            )

        return jsonify({"success": True, "message": "Reminder updated successfully!"})

    return jsonify({"success": False, "errors": form.errors}), 400


@reminder_bp.route("/delete_reminder", methods=["POST"])
@login_required
def delete_reminder():
    """Handles deleting a reminder."""
    reminder_id = request.form.get("reminder_id")
    if not reminder_id:
        return jsonify({"success": False, "error": "Reminder ID is missing."}), 400

    reminder = Reminder.query.get_or_404(reminder_id)
    if reminder.author != current_user:
        return jsonify({"success": False, "error": "Unauthorized"}), 403

    if scheduler.get_job(id=f"reminder_{reminder.id}"):
        scheduler.remove_job(id=f"reminder_{reminder.id}")

    db.session.delete(reminder)
    db.session.commit()

    return jsonify({"success": True, "message": "Reminder deleted."})


@reminder_bp.route("/stream_notifications")
@login_required
def stream_notifications():
    """The endpoint the browser connects to for notifications."""

    def event_stream():
        while True:
            message_json = notification_queue.get()
            message_data = json.loads(message_json)

            if message_data.get("user_id") == current_user.id:
                yield f"data: {message_json}\n\n"
            else:
                notification_queue.put(message_json)

    return Response(event_stream(), mimetype="text/event-stream")
