import re
import json

def classify_environment(name):
    """
    Determines whether the environment is a WM or DE, based on known keywords.
    """
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

def parse_awesome_rices(md_path, output_path="formatted_rices.json"):
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

            results.append({
                "author": author,
                "reddit_post": None,
                "dotfiles": github_url,
                "screenshots": screenshots,
                "environment": environment
            })

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"✅ Parsed {len(results)} entries into {output_path}")

# Example usage:
parse_awesome_rices("../../data/awesome-rice.md", "../../data/formatted_rices.json")
