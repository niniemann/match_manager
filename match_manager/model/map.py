"""representation of data revolving around maps"""


import uuid

from playhouse.shortcuts import model_to_dict
from pydantic import BaseModel, Field, validate_call
from quart_schema.pydantic import File
from pathlib import Path

from .db.map import Map
from . import auth, audit, db
from .. import config

"""
pydantic models for validation
"""

class NewMapData(BaseModel):
    """data required to create a new map"""
    short_name: str = Field(min_length=2)
    full_name: str = Field(min_length=2)
    image: File | None = Field(default=None)

class UpdateMapData(BaseModel):
    """data required when updating an existing map -- everything is optional"""
    short_name: str | None = Field(min_length=2, default=None)
    full_name: str | None = Field(min_length=2, default=None)
    image: File | None = Field(default=None)

class MapResponse(BaseModel):
    """data returned after creating/patching/getting a map"""
    id: int
    short_name: str
    full_name: str
    image_filename: str | None = Field(default=None)


"""
model operations, which use the pydantic validation, manage the database, ...
"""

@validate_call
async def get_maps() -> list[MapResponse]:
    """fetch all maps from the database"""
    return list(MapResponse(**model_to_dict(m)) for m in Map.select().order_by(Map.id)) # type: ignore


@validate_call
@auth.requires_admin()
@audit.log_call(description='{map_data}')
async def create_new_map(map_data: NewMapData, author: auth.User) -> MapResponse:
    """create a new map"""
    with db.proxy.atomic() as txn:
        m = Map(short_name=map_data.short_name, full_name=map_data.full_name)

        if map_data.image:
            m.image_filename = uuid.uuid4().hex + '_' + (map_data.image.filename or '')

            storage_path = Path(config.webserver.upload_folder) / "map_images"
            storage_path.mkdir(parents=True, exist_ok=True)
            await map_data.image.save(storage_path / m.image_filename)

        m.save()

    return MapResponse(**model_to_dict(m))


@validate_call
@auth.requires_admin()
@audit.log_call(description='{map_id}: {update}')
async def update_map_data(map_id: int, update: UpdateMapData, author: auth.User) -> MapResponse:
    """patch an existing map"""
    with db.proxy.atomic() as txn:
        m = Map.get_by_id(map_id)

        # if new data is provided in the update, use it -- else keep don't modify
        m.short_name = update.short_name or m.short_name
        m.full_name = update.full_name or m.full_name

        m.save()

        if update.image:
            old_image = m.image_filename
            m.image_filename = uuid.uuid4().hex + '_' + (update.image.filename or '')

            storage_path = Path(config.webserver.upload_folder) / "map_images"
            storage_path.mkdir(parents=True, exist_ok=True)
            await update.image.save(storage_path / m.image_filename)

            m.save()
            if old_image:
                try:
                    (Path(config.webserver.upload_folder) / "map_images" / old_image).unlink()
                except:
                    pass

    return MapResponse(**model_to_dict(m))
