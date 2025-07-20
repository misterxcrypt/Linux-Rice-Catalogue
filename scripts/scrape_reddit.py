import os, json, praw, re
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

reddit = praw.Reddit(
    client_id=os.getenv("REDDIT_CLIENT_ID"),
    client_secret=os.getenv("REDDIT_CLIENT_SECRET"),
    user_agent=os.getenv("REDDIT_USER_AGENT")
)

def normalize(text):
    return text.lower().replace('-', ' ').replace('_', ' ')

def match_keywords(text, keywords):
    text = normalize(text)
    matches = [k for k in keywords if k in text]
    return matches[0] if matches else None

def extract_github_link(text):
    if not text: return None
    matches = re.findall(r'https?://(?:www\.)?github\.com/[^\s)>\]]+', text)
    return matches[0] if matches else None

def scrape_post(url):
    submission = reddit.submission(url=url)
    submission.comments.replace_more(limit=None)

    title = submission.title
    selftext = submission.selftext or ""
    author = submission.author.name if submission.author else ''
    images = []
    dotfiles = None

    # 1. Check for GitHub link in title or body
    dotfiles = extract_github_link(title) or extract_github_link(selftext)

    # 2. If not found, look in author's comments
    if not dotfiles:
        for comment in submission.comments.list():
            if comment.author and comment.author.name == author:
                dotfiles = extract_github_link(comment.body)
                if dotfiles:
                    break

    # 3. Screenshot handling
    if submission.url and (submission.url.endswith('.png') or submission.url.endswith('.jpg')):
        images.append(submission.url)

    if hasattr(submission, "gallery_data"):
        items = submission.gallery_data["items"]
        media = submission.media_metadata
        for item in items:
            media_id = item["media_id"]
            if media_id in media:
                m = media[media_id]
                if m["status"] == "valid":
                    img_url = m["s"]["u"].replace("&amp;", "&")
                    images.append(img_url)

    # 4. Load keyword lists
    with open(os.path.join(os.path.dirname(__file__), '../data/keywords.json')) as f:
        keywords = json.load(f)

    wm = match_keywords(title, keywords['WM'])
    de = match_keywords(title, keywords['DE'])
    theme = match_keywords(title, keywords['THEME'])
    distro = match_keywords(title, keywords['DISTRO'])

    return {
        "reddit_post": url,
        "author": author,
        # "title": title,
        "dotfiles": dotfiles,
        "environment": {
            "type": "WM" if wm else "DE" if de else "",
            "name": wm or de or ""
        },
        "theme": theme,
        "distro": distro,
        "screenshots": images
    }

if __name__ == "__main__":
    import sys
    print(json.dumps(scrape_post(sys.argv[1])))
