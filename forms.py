from wtforms import SubmitField, validators, StringField
from flask_wtf import FlaskForm

class ChatBoxForm(FlaskForm):
    user_input = StringField("Your Message", [validators.DataRequired()])
    submit = SubmitField('Send')
