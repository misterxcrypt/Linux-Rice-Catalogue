import requests
import json
import os
import uuid
import re

# Read GitHub URLs from file
with open('../data/temp/github.txt', 'r') as f:
    repos = [line.strip() for line in f if line.strip()]

# Dictionary to store mapping of image filename to repo and original URL
mapping = {}

# Function to download README.md
def download_readme(owner, repo, branch):
    readme_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/README.md"
    response = requests.get(readme_url)
    if response.status_code == 200:
        return response.text
    else:
        print(f"Failed to download README for {owner}/{repo}")
        return None

# Function to extract image URLs from markdown
def extract_image_urls(markdown):
    # Regex for markdown images: ![alt](url)
    md_images = re.findall(r'!\[.*?\]\((.*?)\)', markdown)
    # Regex for HTML images: <img src="url">
    html_images = re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', markdown)
    return md_images + html_images

# Process each repo
for repo_url in repos:
    parts = repo_url.split('/')
    owner = parts[-2]
    repo = parts[-1]

    # Try to download README.md, first assuming 'main', then 'master'
    readme_content = None
    for branch in ['main', 'master']:
        readme_content = download_readme(owner, repo, branch)
        if readme_content:
            break
    if not readme_content:
        print(f"Failed to download README for {repo_url}")
        continue

    # Extract image URLs
    image_urls = extract_image_urls(readme_content)

    # Download each image
    for img_url in image_urls:
        # Handle relative URLs
        if img_url.startswith('./') or img_url.startswith('../') or not img_url.startswith('http'):
            img_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{img_url.lstrip('./')}"
        img_response = requests.get(img_url)
        if img_response.status_code == 200:
            # Get extension from URL or default to .png
            ext = os.path.splitext(img_url)[1] or '.png'
            filename = uuid.uuid4().hex + ext
            filepath = f'../data/img2/{filename}'
            with open(filepath, 'wb') as f:
                f.write(img_response.content)
            # Add to mapping
            mapping[filename] = {
                'repo': repo_url,
                'original_url': img_url
            }
        else:
            print(f"Failed to download {img_url}")

# Save the mapping to a JSON file
with open('../data/image_mapping.json', 'w') as f:
    json.dump(mapping, f, indent=4)

print("Scraping and downloading completed. Mapping saved to data/image_mapping.json")