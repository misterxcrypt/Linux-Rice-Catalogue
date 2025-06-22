from pydantic import BaseModel, HttpUrl
from typing import List, Optional

class Environment(BaseModel):
    type: str    # "WM" or "DE"
    name: str

class Rice(BaseModel):
    id: Optional[str]
    author: str
    dotfiles: Optional[HttpUrl]
    screenshots: List[HttpUrl]
    environment: Environment
    reddit_post: Optional[HttpUrl]
