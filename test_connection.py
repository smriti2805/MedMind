# test_connection.py
import requests

LANGSERVE_URL = "http://127.0.0.1:8000/docs" # Hitting the public docs endpoint
FLASK_URL = "http://127.0.0.1:5000"

print("--- Testing Connectivity ---")
print(f"1. Attempting to reach Flask port {FLASK_URL} (Expects Failure if Flask is OFF):")
try:
    r_flask = requests.get(FLASK_URL, timeout=3)
    print(f"   Success! Status: {r_flask.status_code}")
except requests.exceptions.ConnectionError:
    print("   Connection Refused (Expected if Flask is OFF).")

print(f"\n2. Attempting to reach LangServe port {LANGSERVE_URL} (Expects Success if LangServe is ON):")
try:
    # START YOUR LANGSERVE APP NOW (uv run main.py)
    r_langserve = requests.get(LANGSERVE_URL, timeout=3)
    r_langserve.raise_for_status()
    print(f"   ✅ SUCCESS! LangServe is reachable on 8000. Status: {r_langserve.status_code}")
except requests.exceptions.ConnectionError:
    print("   ❌ FAILURE: Connection Refused. Port 8000 is NOT reachable.")
except requests.exceptions.HTTPError as e:
    print(f"   ⚠️ Reached but error status: {e.response.status_code}") # Could be 404/405/etc.
except Exception as e:
    print(f"   An unexpected error occurred: {e}")