import json
import os

file_name = 'instance/blog_data.json'

def read_blogs():
    if os.path.exists(file_name):
        try:
            with open(file_name, 'r', encoding='utf-8') as file:
                blog_posts = json.load(file)
            print(f"Successfully loaded {len(blog_posts)} blog posts from {file_name}.")
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON from the file: {e}")
        except Exception as e:
            print(f"An unexpected error occurred: {e}")
    else:
        print(f"Error: The file '{file_name}' was not found.")
        blog_posts = []
    return blog_posts

