from .db import rice_collection
from .models import Rice
from bson import ObjectId

def get_all_rices():
    query = {
        "$or": [
            {"status": "approved"},
            {"status": {"$exists": False}}  # include legacy entries with no status
        ]
    }

    rices = rice_collection.find(query)
    
    result = []
    for rice in rices:
        rice["id"] = str(rice["_id"])
        del rice["_id"]
        result.append(rice)

    return result

def get_rice(rice_id: str):
    rice = rice_collection.find_one({"_id": ObjectId(rice_id)})
    if rice:
        rice["id"] = str(rice["_id"])
        del rice["_id"]
    return rice

def create_rice(rice: Rice):
    data = rice.model_dump(mode="json", exclude_unset=True)  # 👈 Converts HttpUrl to str
    data["status"] = "pending"  # add status field
    result = rice_collection.insert_one(data)
    return str(result.inserted_id)

def get_pending_rices():
    return [
        {
            **rice,
            "id": str(rice["_id"])
        }
        for rice in rice_collection.find({"status": "pending"})
    ]