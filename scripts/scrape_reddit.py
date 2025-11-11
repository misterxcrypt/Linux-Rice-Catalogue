import os, json, re
try:
    import praw
except ImportError:
    # Fallback for environments without praw
    praw = None

if praw is not None:
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

    # 4. Load keyword lists - try multiple paths for Vercel compatibility
    keywords_path = None
    possible_paths = [
        os.path.join(os.path.dirname(__file__), '../data/keywords.json'),  # Local development
        os.path.join(os.path.dirname(__file__), '../../data/keywords.json'),  # Vercel deployment
        '/var/task/data/keywords.json'  # Vercel absolute path
    ]

    for path in possible_paths:
        if os.path.exists(path):
            keywords_path = path
            break

    if not keywords_path:
        # Fallback to hardcoded keywords if file not found
        keywords = {
            'WM': ['i3', 'bspwm', 'sway', 'hyprland', 'dwm', 'openbox', 'qtile', 'awesome', 'xmonad', 'yabai', 'herbstluftwm', 'dkwm', 'riverwm', 'leftwm'],
            'DE': ['gnome', 'kde', 'xfce', 'lxde', 'lxqt', 'cinnamon', 'mate', 'budgie'],
            'THEME': ['gruvbox', 'nord', 'dracula', 'solarized dark', 'solarized light', 'monokai', 'tokyo night', 'catppuccin', 'one dark', 'everforest', 'material theme', 'material dark', 'adwaita', 'adwaita dark', 'arc dark', 'arc-darker', 'layan', 'sweet', 'sweet dark', 'colloid', 'flat remix', 'flatery', 'numix', 'numix dark', 'pop', 'whitesur', 'orchis', 'mojave', 'matcha', 'qogir', 'canta', 'yaru', 'mcmojave', 'zuki', 'materia', 'ant', 'aritim dark', 'darkman', 'cyberpunk', 'dark forest', 'ayu dark', 'ayu light', 'tokyonight night', 'tokyonight storm', 'tokyonight moon', 'tokyonight day', 'base16', 'palenight', 'oxocarbon', 'zenburn', 'paper', 'vimix', 'blue sky', 'highcontrast', 'hooli', 'nightfox', 'doom one', 'rose pine', 'rose-pine', 'rose pine moon', 'rose pine dawn', 'skeuomorph', 'pastel dark', 'juno', 'hacktober', 'frost', 'azenis', 'obsidian', 'carbonfox', 'gruvbox material', 'neo-gruvbox', 'spacegray', 'iceberg', 'aether', 'tango', 'darkside', 'breeze', 'breeze dark', 'menta', 'mint-y', 'mint-x', 'kali-dark', 'gogh themes'],
            'DISTRO': ['debian', 'arch', 'arch linux', 'rhel', 'red hat enterprise linux', 'slackware', 'gentoo', 'void linux', 'alpine linux', 'nixos', 'ubuntu', 'kubuntu', 'xubuntu', 'lubuntu', 'ubuntu mate', 'ubuntu studio', 'ubuntu budgie', 'linux mint', 'pop!_os', 'zorin os', 'elementary os', 'deepin', 'kali linux', 'tails', 'mx linux', 'antix', 'pureos', 'parrot os', 'manjaro', 'endeavouros', 'garuda linux', 'arcolinux', 'artix linux', 'rebornos', 'cachyos', 'archcraft', 'blackarch', 'archbang', 'hyperbola', 'fedora', 'centos stream', 'rocky linux', 'almalinux', 'clearos', 'calculate linux', 'sabayon', 'redcore linux', 'centos', 'slax', 'zenwalk', 'porteus', 'solus', 'clear linux', 'bodhi linux', 'qubes os', 'guix system', 'bedrock linux', 'reactos', 'raspberry pi os', 'steamos', 'openwrt', 'libreelec', 'osmc', 'ipfire', 'garuda', 'pfsense', 'rescatux', 'systemrescue', 'linux from scratch', 'tiny core linux', 'puppy linux', 'damn small linux', 'kolibrios', 'popos', 'kali', 'tails', 'cinnamon ubuntu']
        }
    else:
        with open(keywords_path) as f:
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
