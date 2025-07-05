import os
import re
import json
import requests
from pymongo import MongoClient
from dotenv import load_dotenv
from bson import ObjectId
from bs4 import BeautifulSoup

# --- Load Env ---
load_dotenv()
MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB")
COLLECTION_NAME = "rice"

client = MongoClient(MONGO_URI)
collection = client[DB_NAME][COLLECTION_NAME]

# --- Keyword Lists ---
distros = [
    "debian", "arch", "arch linux", "rhel", "red hat enterprise linux", "slackware", "gentoo", "void linux",
    "alpine linux", "nixos", "ubuntu", "kubuntu", "xubuntu", "lubuntu", "ubuntu mate", "ubuntu studio",
    "ubuntu budgie", "linux mint", "pop!_os", "zorin os", "elementary os", "deepin", "kali linux", "tails",
    "mx linux", "antix", "pureos", "parrot os", "manjaro", "endeavouros", "garuda linux", "arcolinux",
    "artix linux", "rebornos", "cachyos", "archcraft", "blackarch", "archbang", "hyperbola", "fedora",
    "centos stream", "rocky linux", "almalinux", "clearos", "calculate linux", "sabayon", "redcore linux", "centos",
    "slax", "zenwalk", "porteus", "solus", "clear linux", "bodhi linux", "qubes os", "guix system",
    "bedrock linux", "reactos", "raspberry pi os", "steamos", "openwrt", "libreelec", "osmc", "ipfire", "garuda",
    "pfsense", "rescatux", "systemrescue", "linux from scratch", "tiny core linux", "puppy linux",
    "damn small linux", "kolibrios", "popos", "kali", "tails"
]
themes = [
    "gruvbox", "nord", "dracula", "solarized dark", "solarized light", "monokai", "tokyo night",
    "catppuccin", "one dark", "everforest", "material theme", "material dark", "adwaita",
    "adwaita dark", "arc dark", "arc-darker", "layan", "sweet", "sweet dark", "colloid",
    "flat remix", "flatery", "numix", "numix dark", "pop", "whitesur", "orchis", "mojave",
    "matcha", "qogir", "canta", "yaru", "mcmojave", "zuki", "materia", "ant", "aritim dark",
    "darkman", "cyberpunk", "dark forest", "ayu dark", "ayu light", "tokyonight night",
    "tokyonight storm", "tokyonight moon", "tokyonight day", "base16", "palenight",
    "oxocarbon", "zenburn", "paper", "vimix", "blue sky", "highcontrast", "hooli", "nightfox",
    "doom one", "rose pine", "rose-pine", "rose pine moon", "rose pine dawn", "skeuomorph", "pastel dark",
    "juno", "hacktober", "frost", "azenis", "obsidian", "carbonfox", "gruvbox material",
    "neo-gruvbox", "spacegray", "iceberg", "aether", "tango", "darkside", "breeze", "breeze dark",
    "menta", "mint-y", "mint-x", "kali-dark", "gogh themes"
]

# --- Search helper ---
def extract_from_text(text: str, keywords: list[str]) -> str | None:
    text = text.lower()
    for word in keywords:
        if word in text:
            return word.capitalize()
    return None

# --- Get README.md text from GitHub URL ---
def get_repo_readme_text(github_url: str) -> str:
    try:
        match = re.search(r"github\.com/([\w.-]+/[\w.-]+)(/tree/[\w./-]+)?", github_url)
        if not match:
            return ""

        repo_path = match.group(1)
        branch_or_path = match.group(2) or "/main"
        raw_url = f"https://raw.githubusercontent.com/{repo_path}{branch_or_path}/README.md"

        response = requests.get(raw_url, timeout=10)
        if response.status_code == 200:
            return response.text

        html = requests.get(github_url, timeout=10).text
        soup = BeautifulSoup(html, "html.parser")
        readme = soup.find("article")
        return readme.get_text() if readme else ""

    except Exception as e:
        print(f"❌ Error fetching README from {github_url}: {e}")
        return ""

# --- Loop through all rice documents ---
results = []

for doc in collection.find({ "dotfiles": { "$exists": True } }):
    _id = str(doc["_id"])
    source_key = doc.get("source_key", "")
    dotfiles = doc.get("dotfiles", "")

    print(f"🔍 Checking: {dotfiles}")

    # Step 1: Try to detect from URL itself
    distro = extract_from_text(dotfiles, distros)
    theme = extract_from_text(dotfiles, themes)
    # Step 2: Fallback to README
    readme_text = get_repo_readme_text(dotfiles)
    if not distro:
        distro = extract_from_text(readme_text, distros)
    if not theme:
        theme = extract_from_text(readme_text, themes)
    # Collect metadata
    rice_info = {
        "_id": _id,
        "source_key": source_key,
        "dotfiles": dotfiles,
        "distro": distro,
        "theme": theme
    }

    results.append(rice_info)
    print(f"✅ Extracted: {rice_info}")

# --- Save to JSON ---
output_path = "../data/rice_metadata_from_url_and_readme.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)

print(f"\n📦 Saved {len(results)} entries to {output_path}")
