import praw
import json
import os
from transformers import pipeline
import requests
from dotenv import load_dotenv

# Load Reddit credentials from .env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

reddit = praw.Reddit(
    client_id=os.getenv("REDDIT_CLIENT_ID"),
    client_secret=os.getenv("REDDIT_CLIENT_SECRET"),
    user_agent=os.getenv("REDDIT_USER_AGENT")
)

classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
# GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

def extract_media_urls(submission):
    media_urls = []

    # Case 1: Gallery (multiple images)
    if hasattr(submission, "media_metadata") and submission.media_metadata:
        for media_id, media_data in submission.media_metadata.items():
            if "s" in media_data and "u" in media_data["s"]:
                media_urls.append(media_data["s"]["u"])

    # Case 2: Single image or video
    elif submission.url:
        media_urls.append(submission.url)

    return media_urls

def get_author_comments(submission):
    submission.comments.replace_more(limit=None)
    author_comments = []

    for comment in submission.comments.list():
        if str(comment.author) == str(submission.author):
            author_comments.append({
                "id": comment.id,
                "parent_id": comment.parent_id,
                "body": comment.body,
                "score": comment.score,
                "created_utc": comment.created_utc,
                "permalink": f"https://reddit.com{comment.permalink}"
            })

    return author_comments

def is_rice_related_keywords_and_flair(submission):
    keywords = [
        "rice", "ricing", "setup", "customization", "theme", "dotfiles", "gtk", "kde",
        "wayland", "hyprland", "i3", "bspwm", "sway", "polybar", "rofi",
        "neofetch", "wallpaper", "window manager", "terminal"
    ]

    # Combine title and selftext
    text = (submission.title or "") + " " + (submission.selftext or "")
    text = text.lower()

    # Keyword match
    keyword_hit = any(kw in text for kw in keywords)

    # Flair match
    flair = submission.link_flair_text
    flair_hit = flair and flair.strip().lower() in ["screenshot", "workflow"]

    return keyword_hit and flair_hit

def is_rice_related_by_ai(title, selftext):
    """
    Use zero-shot classification to determine if the post is related to Linux ricing.
    Returns a tuple: (is_rice_related: bool, audit_info: dict)
    """
    text = f"{title}\n\n{selftext}"
    labels = ["Linux ricing post", "Not related to ricing"]

    try:
        result = classifier(text, candidate_labels=labels)
        top_label = result['labels'][0]
        confidence = result['scores'][0]

        print(f"For {title[:50]}... 🤖 AI Classification Result:")
        print(f"   🔹 Top Label: {top_label}")
        print(f"   🔹 Confidence: {confidence:.4f}")

        return top_label == "Linux ricing post", {
            "title": title,
            "selftext": selftext,
            "top_label": top_label,
            "confidence": round(confidence, 4)
        }
    except Exception as e:
        print(f"❌ AI classification error: {e}")
        return False, {
            "title": title,
            "selftext": selftext,
            "top_label": "error",
            "confidence": 0.0
        }

def fetch_unixporn_posts(output_file="data/unixporn_posts.json", limit=1000):
    subreddit = reddit.subreddit("unixporn")
    posts = []
    audit_log = []

    for submission in subreddit.top(limit=limit):
        print(f"⏳ Checking post: {submission.title[:60]}...")

        keyword_flair_match = is_rice_related_keywords_and_flair(submission)

        is_rice_ai, ai_audit = is_rice_related_by_ai(submission.title, submission.selftext)

        # Decide final result (both required)
        is_rice_final = keyword_flair_match and is_rice_ai

        # Track who caught it
        if is_rice_final:
            detected_by = "Keyword+AI"
        elif keyword_flair_match:
            detected_by = "Keyword"
        elif is_rice_ai:
            detected_by = "AI"
        else:
            detected_by = "None"

        # Save audit log regardless of final result
        audit_log.append({
            "title": submission.title,
            "selftext": submission.selftext,
            "url": f"https://reddit.com{submission.permalink}",
            "is_rice": is_rice_final,
            "detected_by": detected_by,
            "ai_label": ai_audit.get("top_label"),
            "ai_confidence": ai_audit.get("confidence")
        })

        if not is_rice_final:
            continue  # Skip non-rice posts

        media_urls = extract_media_urls(submission)
        author_comments = get_author_comments(submission)

        post_data = {
            "id": submission.id,
            "title": submission.title,
            "author": str(submission.author),
            "created_utc": submission.created_utc,
            "url": submission.url,
            "permalink": f"https://reddit.com{submission.permalink}",
            "selftext": submission.selftext,
            "media_urls": media_urls,
            "author_comments": author_comments,
            "flair": submission.link_flair_text
        }

        posts.append(post_data)

    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, "w") as f:
        json.dump(posts, f, indent=2)
    
    audit_output_file = "data/unixporn_ai_audit.json"
    with open(audit_output_file, "w") as f:
        json.dump(audit_log, f, indent=2)

    print(f"📝 Saved {len(audit_log)} audit entries to {audit_output_file}")
    print(f"✅ Saved {len(posts)} posts to {output_file}")

# # Run
# fetch_unixporn_posts(limit=1000)

# def is_rice_related_by_gemini(title, selftext):
#     prompt = f"""
# You are a Linux ricing enthusiast. Determine whether the following Reddit post is related to Linux ricing — specifically, whether the user is sharing their own customized Linux desktop setup (a "rice").

# Consider tools like window managers, themes, dotfiles, terminal setups, wallpapers, etc.

# Post Title: "{title}"
# Post Body: "{selftext}"

# Answer with only one word: "Yes" or "No".
# """

#     url = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent"    
#     headers = {"Content-Type": "application/json"}
#     params = {"key": GEMINI_API_KEY}
#     body = {
#         "contents": [
#             {"parts": [{"text": prompt.strip()}]}
#         ]
#     }

#     response = requests.post(url, headers=headers, params=params, json=body)
#     print(response.json())

#     if response.status_code != 200:
#         print(f"❌ Gemini API error: {response.status_code}")
#         return False

#     try:
#         reply = response.json()['candidates'][0]['content']['parts'][0]['text'].strip().lower()
#         return reply == "yes"
#     except Exception as e:
#         print(f"❌ Failed to parse Gemini response: {e}")
#         return False