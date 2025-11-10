import re
import json

# --- Source Key Helpers from uniq_element_mongo.py ---
def get_reddit_key(reddit_url: str) -> str | None:
    match = re.search(r'/comments/([a-z0-9]+)', reddit_url, re.IGNORECASE)
    return f"reddit:{match.group(1)}" if match else None

def get_github_key(url: str) -> str | None:
    match = re.search(r'github\.com/([\w.-]+/[\w.-]+)(/tree/[\w./-]+)?', url, re.IGNORECASE)
    if match:
        base = match.group(1).lower()
        tree = match.group(2) or ''
        return f"github:{base}{tree}"
    return None

def get_source_key(doc: dict) -> str | None:
    reddit = doc.get("reddit_post")
    dotfiles = doc.get("dotfiles")

    if reddit:
        reddit_key = get_reddit_key(reddit)
        if reddit_key:
            return reddit_key

    if dotfiles:
        github_key = get_github_key(dotfiles)
        if github_key:
            return github_key

    return None

# --- Environment Classifier ---
def classify_environment(name):
    name_lower = name.lower()
    wm_keywords = ["i3", "bspwm", "sway", "hyprland", "dwm", "openbox", "qtile", "awesome", "xmonad", "yabai", "herbstluftwm", "dkwm", "riverwm", "leftwm"]
    de_keywords = ["gnome", "kde", "xfce", "lxde", "lxqt", "cinnamon", "mate", "budgie"]

    for wm in wm_keywords:
        if wm in name_lower:
            return {"type": "WM", "name": name.strip()}
    for de in de_keywords:
        if de in name_lower:
            return {"type": "DE", "name": name.strip()}

    return {"type": "Unknown", "name": name.strip()}

# --- Main Parsing Function ---
def parse_awesome_rices(md_path, output_path="new_formatted_rices.json"):
    with open(md_path, "r", encoding="utf-8") as f:
        content = f.read()

    results = []
    wm_de_header = re.compile(r"^##\s+(.+)$", re.MULTILINE)
    author_entry = re.compile(r"\[!\[.*?\]\((.*?)\)\]\((.*?)\)")

    sections = wm_de_header.split(content)[1:]
    for i in range(0, len(sections), 2):
        env_label = sections[i].strip()
        environment = classify_environment(env_label)
        body = sections[i + 1]

        author_links = re.findall(r"### \[(.*?)\]\((.*?)\)", body)
        for author, github_url in author_links:
            screenshots = []
            image_links = author_entry.findall(body)
            for img_url, link_url in image_links:
                if github_url in link_url:
                    screenshots.append(img_url)

            doc = {
                "author": author,
                "reddit_post": None,
                "dotfiles": github_url,
                "screenshots": screenshots,
                "environment": environment,
            }

            source_key = get_source_key(doc)
            if source_key:
                doc["source_key"] = source_key

            results.append(doc)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print(f"✅ Parsed {len(results)} entries into {output_path}")

# --- Example Usage ---
parse_awesome_rices("../data/awesome-rice.md", "../data/new_formatted_rices.json")
