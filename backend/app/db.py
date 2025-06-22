import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client["linux-ricing-db"]
rice_collection = db["rice"]

def get_rice_collection():
    return db["rice"]
