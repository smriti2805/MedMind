import requests

def get_response(question):
    url = "https://fake.jsonmockapi.com/custom"
    headers = {
        "Content-Type": "application/json"
    }
    data = {
        "response": "paragraph"
    }
    response = requests.post(url, headers=headers, json=data)
    # Parse JSON response
    result = response.json()
    result["question"] = question
    return result

if __name__ == "__main__":
    get_response("What is AI?")