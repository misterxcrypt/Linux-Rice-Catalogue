from dotenv import load_dotenv
import os
from pymongo import MongoClient
from pymongo.errors import PyMongoError
import re

dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path)

# --- Configuration ---
MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = "linux-ricing-db"
RICE_COLLECTION = "rice"
KEYWORDS_COLLECTION = "keywords"

# --- Connect to MongoDB ---
client = MongoClient(MONGO_URI)
print("🧭 Connected to:", client.address)
db = client[DB_NAME]
rice_collection = db[RICE_COLLECTION]
keywords_collection = db[KEYWORDS_COLLECTION]

def normalize_text(text):
    if not text:
        return ""
    return text.lower().replace('-', ' ').replace('_', ' ')

def match_keyword(text, keyword_map):
    if not text or not keyword_map:
        return None
    normalized_text = normalize_text(text)
    for canonical, variants in keyword_map.items():
        if any(normalize_text(variant) in normalized_text for variant in variants):
            return canonical
    return None

# Fetch keywords
keywords = {}
for doc in keywords_collection.find({}):
    keywords[doc['_id']] = doc['data']

print("📚 Loaded keywords:", list(keywords.keys()))

# Process rices
rices = list(rice_collection.find({}))
print(f"🍚 Found {len(rices)} rices to process")

updated_count = 0

for rice in rices:
    updates = {}

    # Normalize environment.name
    if 'environment' in rice and 'name' in rice['environment']:
        env_type = rice['environment'].get('type')
        env_name = rice['environment']['name']
        if env_type == 'WM' and 'wm' in keywords:
            normalized = match_keyword(env_name, keywords['wm'])
            if normalized and normalized != env_name:
                updates['environment.name'] = normalized
        elif env_type == 'DE' and 'de' in keywords:
            normalized = match_keyword(env_name, keywords['de'])
            if normalized and normalized != env_name:
                updates['environment.name'] = normalized

    # Normalize theme
    if 'theme' in rice and 'theme' in keywords:
        normalized = match_keyword(rice['theme'], keywords['theme'])
        if normalized and normalized != rice['theme']:
            updates['theme'] = normalized

    # Normalize distro
    if 'distro' in rice and 'distro' in keywords:
        normalized = match_keyword(rice['distro'], keywords['distro'])
        if normalized and normalized != rice['distro']:
            updates['distro'] = normalized

    if updates:
        try:
            rice_collection.update_one({'_id': rice['_id']}, {'$set': updates})
            print(f"✅ Updated {rice['_id']}: {updates}")
            updated_count += 1
        except PyMongoError as e:
            print(f"❌ Error updating {rice['_id']}: {e}")

print(f"📦 Total updated: {updated_count}")

client.close()