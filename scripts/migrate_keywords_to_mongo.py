from dotenv import load_dotenv
import os
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError, PyMongoError

dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path)

# --- Configuration ---
MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = "linux-ricing-db"
COLLECTION_NAME = "keywords"

# --- Connect to MongoDB ---
client = MongoClient(MONGO_URI)
print("🧭 Connected to:", client.address)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]

# Keyword maps
wmMap = {
  'i3': ['i3'],
  'BSPWM': ['bspwm'],
  'Sway': ['sway', 'swaywm'],
  'Hyprland': ['hyprland', 'hypr'],
  'DWM': ['dwm'],
  'Openbox': ['openbox'],
  'Qtile': ['qtile'],
  'Awesome': ['awesome', 'awesomewm'],
  'XMonad': ['xmonad'],
  'Yabai': ['yabai'],
  'Herbstluftwm': ['herbstluftwm'],
  'DKWM': ['dkwm'],
  'RiverWM': ['riverwm'],
  'LeftWM': ['leftwm']
}

deMap = {
  'GNOME': ['gnome'],
  'KDE': ['kde'],
  'XFCE': ['xfce'],
  'LXDE': ['lxde'],
  'LXQt': ['lxqt'],
  'Cinnamon': ['cinnamon'],
  'MATE': ['mate'],
  'Budgie': ['budgie']
}

distroMap = {
  'Debian': ['debian'],
  'Arch Linux': ['arch', 'arch linux'],
  'RHEL': ['rhel', 'red hat enterprise linux', 'red hat linux', 'redhat linux'],
  'Slackware': ['slackware'],
  'Gentoo': ['gentoo'],
  'Void Linux': ['void linux', 'void'],
  'Alpine Linux': ['alpine linux', 'alpine'],
  'NixOS': ['nixos', 'nix'],
  'Ubuntu': ['ubuntu', 'kubuntu', 'xubuntu', 'lubuntu', 'ubuntu mate', 'ubuntu studio', 'ubuntu budgie', 'budgie'],
  'Linux Mint': ['linux mint', 'mint'],
  'Pop!_OS': ['pop!_os', 'popos', 'pop'],
  'Zorin OS': ['zorin os', 'zorin'],
  'Elementary OS': ['elementary os', 'elementary'],
  'Deepin': ['deepin'],
  'Kali Linux': ['kali linux', 'kali'],
  'Tails': ['tails'],
  'MX Linux': ['mx linux'],
  'antiX': ['antix'],
  'PureOS': ['pureos'],
  'Parrot OS': ['parrot os', 'parrot'],
  'Manjaro': ['manjaro'],
  'EndeavourOS': ['endeavouros'],
  'Garuda Linux': ['garuda linux', 'garuda'],
  'ArcoLinux': ['arcolinux'],
  'Artix Linux': ['artix linux', 'artix'],
  'RebornOS': ['rebornos'],
  'CachyOS': ['cachyos'],
  'Archcraft': ['archcraft'],
  'BlackArch': ['blackarch'],
  'Archbang': ['archbang'],
  'Hyperbola': ['hyperbola'],
  'Fedora': ['fedora'],
  'CentOS': ['centos stream', 'centos'],
  'Rocky Linux': ['rocky linux'],
  'AlmaLinux': ['almalinux'],
  'ClearOS': ['clearos'],
  'Calculate Linux': ['calculate linux'],
  'Sabayon': ['sabayon'],
  'Redcore Linux': ['redcore linux'],
  'Slax': ['slax'],
  'Zenwalk': ['zenwalk'],
  'Porteus': ['porteus'],
  'Solus': ['solus'],
  'Clear Linux': ['clear linux'],
  'Bodhi Linux': ['bodhi linux'],
  'Qubes OS': ['qubes os'],
  'Guix System': ['guix system'],
  'Bedrock Linux': ['bedrock linux'],
  'ReactOS': ['reactos'],
  'Raspberry Pi OS': ['raspberry pi os', 'raspberry', 'raspberry pi'],
  'SteamOS': ['steamos', 'steam'],
  'OpenWrt': ['openwrt'],
  'LibreELEC': ['libreelec'],
  'OSMC': ['osmc'],
  'IPFire': ['ipfire'],
  'pfSense': ['pfsense'],
  'Rescatux': ['rescatux'],
  'SystemRescue': ['systemrescue'],
  'Linux From Scratch': ['linux from scratch', 'lfs'],
  'Tiny Core Linux': ['tiny core linux'],
  'Puppy Linux': ['puppy linux'],
  'Damn Small Linux': ['damn small linux'],
  'KolibriOS': ['kolibrios'],
  'Cinnamon Ubuntu': ['cinnamon ubuntu']
}

themeMap = {
  'Gruvbox': ['gruvbox', 'gruvbox material', 'neo-gruvbox'],
  'Nord': ['nord'],
  'Dracula': ['dracula'],
  'Solarized Dark': ['solarized dark'],
  'Solarized Light': ['solarized light'],
  'Monokai': ['monokai'],
  'Tokyo Night': ['tokyo night', 'tokyonight night', 'tokyonight storm', 'tokyonight moon', 'tokyonight day'],
  'Catppuccin': ['catppuccin'],
  'One Dark': ['one dark'],
  'Everforest': ['everforest'],
  'Material Theme': ['material theme'],
  'Material Dark': ['material dark'],
  'Adwaita': ['adwaita'],
  'Adwaita Dark': ['adwaita dark'],
  'Arc Dark': ['arc dark'],
  'Arc-Darker': ['arc-darker'],
  'Layan': ['layan'],
  'Sweet': ['sweet'],
  'Sweet Dark': ['sweet dark'],
  'Colloid': ['colloid'],
  'Flat Remix': ['flat remix'],
  'Flatery': ['flatery'],
  'Numix': ['numix'],
  'Numix Dark': ['numix dark'],
  'Pop': ['pop'],
  'WhiteSur': ['whitesur'],
  'Orchis': ['orchis'],
  'Mojave': ['mojave'],
  'Matcha': ['matcha'],
  'Qogir': ['qogir'],
  'Canta': ['canta'],
  'Yaru': ['yaru'],
  'McMojave': ['mcmojave'],
  'Zuki': ['zuki'],
  'Materia': ['materia'],
  'Ant': ['ant'],
  'Aritim Dark': ['aritim dark'],
  'Darkman': ['darkman'],
  'Cyberpunk': ['cyberpunk'],
  'Dark Forest': ['dark forest'],
  'Ayu Dark': ['ayu dark'],
  'Ayu Light': ['ayu light'],
  'Base16': ['base16'],
  'Palenight': ['palenight'],
  'Oxocarbon': ['oxocarbon'],
  'Zenburn': ['zenburn'],
  'Paper': ['paper'],
  'Vimix': ['vimix'],
  'Blue Sky': ['blue sky'],
  'HighContrast': ['highcontrast'],
  'Hooli': ['hooli'],
  'Nightfox': ['nightfox'],
  'Doom One': ['doom one'],
  'Rose Pine': ['rose pine', 'rose-pine', 'rose pine moon', 'rose pine dawn'],
  'Skeuomorph': ['skeuomorph'],
  'Pastel Dark': ['pastel dark'],
  'Juno': ['juno'],
  'Hacktober': ['hacktober'],
  'Frost': ['frost'],
  'Azenis': ['azenis'],
  'Obsidian': ['obsidian'],
  'Carbonfox': ['carbonfox'],
  'Spacegray': ['spacegray'],
  'Iceberg': ['iceberg'],
  'Aether': ['aether'],
  'Tango': ['tango'],
  'Darkside': ['darkside'],
  'Breeze': ['breeze'],
  'Breeze Dark': ['breeze dark'],
  'Menta': ['menta'],
  'Mint-Y': ['mint-y'],
  'Mint-X': ['mint-x'],
  'Kali-Dark': ['kali-dark'],
  'Gogh Themes': ['gogh themes']
}

keywords = [
    {"_id": "wm", "data": wmMap},
    {"_id": "de", "data": deMap},
    {"_id": "distro", "data": distroMap},
    {"_id": "theme", "data": themeMap}
]

inserted_count = 0
skipped_count = 0
failed_docs = []

for keyword in keywords:
    try:
        result = collection.insert_one(keyword)
        print(f"✅ Inserted: {keyword['_id']}")
        inserted_count += 1
    except DuplicateKeyError:
        print(f"⏭️ Skipped duplicate: {keyword['_id']}")
        skipped_count += 1
    except PyMongoError as e:
        print(f"❌ Insert failed for {keyword['_id']}: {e}")
        failed_docs.append({**keyword, "error": str(e)})

print(f"\n📦 Total inserted: {inserted_count}")
print(f"⏭️ Total skipped: {skipped_count}")
print(f"❌ Total failed: {len(failed_docs)}")

client.close()