# backend/app/routes/schemas.py
from pydantic import BaseModel, HttpUrl, model_validator
from typing import List, Optional


class Environment(BaseModel):
    type: str  # WM or DE
    name: str  # i3, KDE, GNOME, etc.


# Base schema shared between create + read
class RiceBase(BaseModel):
    author: str
    dotfiles: Optional[HttpUrl] = None
    screenshots: List[HttpUrl]
    environment: Environment
    reddit_post: Optional[HttpUrl] = None

    @model_validator(mode="after")
    def check_links(self) -> "RiceBase":
        if not self.dotfiles and not self.reddit_post:
            raise ValueError("At least one of dotfiles or reddit_post must be provided.")
        return self


# Schema for submission (no ID yet)
class RiceCreate(RiceBase):
    pass


# Schema for responses (includes ID)
class Rice(RiceBase):
    id: str
