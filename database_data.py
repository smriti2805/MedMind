import requests
from bs4 import BeautifulSoup
import json

def extract_blog_metadata(url):
    response = requests.get(url)
    if response.status_code != 200:
        print(f"Failed to fetch page: {response.status_code}")
        return None

    soup = BeautifulSoup(response.text, 'html.parser')

    # Extract title
    title_tag = soup.find('h1', class_='HNMDR')
    title = title_tag.get_text(strip=True) if title_tag else "No Title Found"

    # Extract author
    author_tag = soup.select_one('.byline a')
    author = author_tag.get_text(strip=True) if author_tag else "Unknown Author"

    # Extract date
    date_tag = soup.select_one('.byline span')
    date = date_tag.get_text(strip=True) if date_tag else "Unknown Date"

    # Extract main image
    image_tag = soup.select_one('img[src*="chagas-disease"]')  # You may adjust selector
    image_url = image_tag['src'] if image_tag else "No Image Found"

    # Extract summary
    summary_tag = soup.select_one('.M1rHh.undefined')
    summary = summary_tag.get_text(strip=True) if summary_tag else "No Summary Found"

    # Extract full content
    content_tags = soup.select('div[data-articlebody="1"] p, div[data-articlebody="1"] span, div[data-articlebody="1"] h2')
    content_html = ''
    for tag in content_tags:
        content_html += str(tag)

    # Build result dictionary
    blog_metadata = {
        "id": 1,
        "title": title,
        "author": author,
        "date": date,
        "summary": summary,
        "image": image_url,
        "content": content_html
    }

    return blog_metadata


def get_blog_posts():
    url = "https://timesofindia.indiatimes.com/life-style/health-fitness/health-news"

    response = requests.get(url)
    if response.status_code != 200:
        print(f"Failed to fetch page: {response.status_code}")
    html_content = response.text

    soup = BeautifulSoup(html_content, 'html.parser')

    # Find all news boxes
    news_boxes = soup.select('.md_news_box')

    blog_posts = []
    for box in news_boxes:
        a_tag = box.find('a')
        title = a_tag.get('title') or a_tag.text.strip()
        link = a_tag['href']
        url=f"https://timesofindia.indiatimes.com{link}"  # Assuming these are relative links
        blog_posts.append(extract_blog_metadata(url))
    return blog_posts

def save_blog_posts_to_json(blog_posts, filename='blog_posts.json'):
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(blog_posts, f, ensure_ascii=False, indent=4)

def load_blogs_from_json(json_filepath='blog_posts.json'):
    with open(json_filepath, 'r', encoding='utf-8') as file:
        blogs = json.load(file)
    return blogs

if __name__ == "__main__":
    # Fetch and save blog posts
    blog_posts = get_blog_posts()
    # save_blog_posts_to_json(blog_posts)