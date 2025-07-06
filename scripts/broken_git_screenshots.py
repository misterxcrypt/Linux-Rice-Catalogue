import os
import re
import requests
import binascii
from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId

# Load .env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))
MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB")
COLLECTION_NAME = "rice"

client = MongoClient(MONGO_URI)
collection = client[DB_NAME][COLLECTION_NAME]

TARGET_ID = "68570ebf6d70f4df72f0e7ff"

def get_default_branch(repo_url):
    try:
        api_url = repo_url.replace("https://github.com", "https://api.github.com/repos")
        response = requests.get(api_url)
        return response.json().get("default_branch", "main")
    except:
        return "main"

def extract_image_urls_from_markdown(markdown_text):
    return re.findall(r'!\[.*?\]\((.*?)\)', markdown_text)

def is_valid_image_url(url):
    return (
        url.startswith("http") and (
            any(url.lower().endswith(ext) for ext in ['.png', '.jpg', '.jpeg', '.webp']) or
            "camo.githubusercontent.com" in url or
            "private-user-images.githubusercontent.com" in url
        )
    )

def extract_from_camo(camo_url):
    try:
        hex_part = camo_url.split("/")[-1]
        decoded = binascii.unhexlify(hex_part).decode("utf-8")
        return decoded if decoded.startswith("http") else None
    except:
        return None

def get_raw_github_file(user_repo, branch, path):
    return f"https://raw.githubusercontent.com/{user_repo}/{branch}/{path}"

def fetch_and_extract_screenshots(dotfiles_url):
    match = re.search(r"github\.com/([\w.-]+/[\w.-]+)", dotfiles_url)
    if not match:
        print("❌ Invalid GitHub URL")
        return []

    user_repo = match.group(1)
    branch = get_default_branch(dotfiles_url)
    url = get_raw_github_file(user_repo, branch, "readme.md")

    res = requests.get(url)
    if res.status_code != 200:
        print("❌ README.md not found")
        return []

    raw_links = extract_image_urls_from_markdown(res.text)

    resolved_links = []
    for url in raw_links:
        if not url.startswith("http"):
            url = get_raw_github_file(user_repo, branch, url.lstrip('./'))
        if "camo.githubusercontent.com" in url:
            decoded = extract_from_camo(url)
            if decoded:
                resolved_links.append(decoded)
            else:
                resolved_links.append(url)  # fallback
        else:
            resolved_links.append(url)

    # Filter valid images
    valid = list(filter(is_valid_image_url, resolved_links))
    return valid

# Main execution
doc = collection.find_one({ "_id": ObjectId(TARGET_ID) })

if not doc:
    print(f"❌ Document with _id {TARGET_ID} not found.")
else:
    dotfiles = doc.get("dotfiles")
    if not dotfiles:
        print(f"❌ No dotfiles URL in document {TARGET_ID}")
    else:
        new_images = fetch_and_extract_screenshots(dotfiles)
        if new_images:
            collection.update_one(
                { "_id": doc["_id"] },
                { "$set": { "screenshots": new_images } }
            )
            print(f"✅ Updated document {TARGET_ID} with {len(new_images)} image(s)")
        else:
            print(f"⚠️ No valid images found for document {TARGET_ID}")
