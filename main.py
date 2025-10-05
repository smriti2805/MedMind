def main():
    print("Hello from medmind!")
    from app import app
    app.run(debug=True, threaded=True, port=5000, host="0.0.0.0")


if __name__ == "__main__":
    main()
