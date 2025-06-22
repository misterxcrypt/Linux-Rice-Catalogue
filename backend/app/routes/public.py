from fastapi import APIRouter
from .schemas import RiceCreate, Rice
from app.crud import get_all_rices, get_rice, create_rice

router = APIRouter()

@router.get("/rices", response_model=list[Rice])
def read_all_rices():
    # collection = get_all_rices()
    # rices = list(collection.find({}))
    # result = []

    # for rice in rices:
    #     # Convert ObjectId to string and rename to "id"
    #     rice["id"] = str(rice["_id"])
    #     del rice["_id"]
    #     result.append(rice)

    # return result
    return get_all_rices()

@router.get("/rices/{rice_id}", response_model=Rice)
def read_rice(rice_id: str):
    return get_rice(rice_id)

@router.post("/submit", status_code=201)
def submit_rice(rice: RiceCreate):
    print("Received rice submission:", rice)  # Debugging log
    new_id = create_rice(rice)
    return {"id": new_id}
