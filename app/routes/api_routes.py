from flask import Blueprint, request, Response, jsonify, current_app
from flask_login import current_user
import requests
import base64

api_bp = Blueprint('api', __name__)

def generate_stream(api_url, payload):
    """Reusable generator to stream from LangServe."""
    try:
        with requests.post(api_url, json=payload, stream=True, headers={"Content-Type": "application/json"}) as response:
            response.raise_for_status()
            for chunk in response.iter_content(chunk_size=None, decode_unicode=True):
                yield chunk
    except requests.exceptions.RequestException as e:
        print(f"Error connecting to LangServe: {e}")
        yield 'event: error\r\ndata: Could not connect to the model.\r\n\r\n'
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        yield 'event: error\r\ndata: An internal server error occurred.\r\n\r\n'

def create_stream_response(api_url, extra_config={}):
    """Handles multipart/form-data requests and creates a streaming response."""
    try:
        query = request.form.get("query", "")
        images = []
        
        uploaded_files = request.files.getlist("images")

        for f in uploaded_files:
            binary_data = f.read()
            base64_data = base64.b64encode(binary_data).decode("utf-8")
            mime_type = f.mimetype or "image/jpeg"
            images.append(f"data:{mime_type};base64,{base64_data}")

        payload = {"input": {"query": query, "images": images}, "config": extra_config, "kwargs": {}}
        
    except Exception as e:
        print(f"❌ Error during file parsing/Base64 conversion: {e}")
        return jsonify({"error": "Failed to process image/data."}), 400

    return Response(generate_stream(api_url, payload), mimetype="text/event-stream")


@api_bp.route("/stream_chat", methods=["POST"])
def stream_chat_proxy():
    user_id = current_user.id  
    config = {"configurable": {"user_id": user_id}}
    return create_stream_response(current_app.config["CHAT_STREAM_URL"], extra_config=config)

@api_bp.route("/symptom_checker", methods=["POST"])
def symptom_checker_proxy():
    return create_stream_response(current_app.config['SYMPTOM_CHECKER_STREAM_URL'])

@api_bp.route("/lab_report_analysis", methods=["POST"])
def analyze_reports_proxy():
    return create_stream_response(current_app.config['LAB_REPORT_ANALYSIS_STREAM_URL'])

@api_bp.route("/mental_health", methods=["POST"])
def mental_health_proxy():
    user_id = current_user.id
    config = {"configurable": {"user_id": user_id}}
    return create_stream_response(current_app.config['MENTAL_HEALTH_STREAM_URL'], extra_config=config)
