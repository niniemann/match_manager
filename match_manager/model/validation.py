"""some utilities for data validation with pydantic"""

from datetime import datetime, timezone
from pydantic import BaseModel, field_validator

class UtcAwareBaseModel(BaseModel):
    """
    For all datetime fields, this base model assumes that a missing
    tzinfo field represents UTC, and explicitly sets it.
    """
    @field_validator("*", mode="before")
    def assume_empty_tzinfo_is_utc(cls, value, info):
        if isinstance(value, datetime) and value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value
