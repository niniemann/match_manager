"""representation of data revolving around teams"""
# pylint: disable=missing-class-docstring,too-few-public-methods

import peewee as pw
from playhouse.shortcuts import model_to_dict
from pydantic import BaseModel, validate_call, Field
from quart_schema.pydantic import File
from typing import Optional
from pathlib import Path

from match_manager import config
from .db.team import Team, TeamManager
from . import auth, db


"""
pydantic models, for validation of function arguments
"""

class NewTeamData(BaseModel):
    """data required to create a new team"""
    name: str = Field(min_length=2)
    tag: str = Field(min_length=2, max_length=5)
    description: str = Field(default="")
    logo: Optional[File] = Field(default=None)

class UpdateTeamData(BaseModel):
    """data required when updating an existing team (everything is optional)
    @note: The team will be selected by means outside the data-update info, e.g. by an id supplied
           through a url or whatever.
    """
    name: str = Field(min_length=2, default=None)
    tag: Optional[str] = Field(min_length=2, max_length=5, default=None)
    description: Optional[str] = Field(default=None)
    logo: Optional[File] = Field(default=None)

class TeamResponse(BaseModel):
    """information sent in return after creating/patching/getting a team"""
    id: int
    name: str
    tag: str
    description: str = Field(default="")


"""
model operations, which use the pydantic validation, manage the database,
and may handle permissions, events and logging in the future.
"""

@validate_call
async def get_team(team_id: int) -> TeamResponse:
    """fetch a team from the database"""
    return TeamResponse(*model_to_dict(Team.get_by_id(team_id)))


async def get_teams() -> list[TeamResponse]:
    """fetch all teams from the database"""
    return list(TeamResponse(**kwargs) for kwargs in Team.select().dicts())


@validate_call
@auth.requires_admin()
async def create_new_team(team_data: NewTeamData, author: auth.User) -> TeamResponse:
    """create a new team"""
    with db.proxy.atomic() as txn:
        # create the team entry
        t = Team(
            name=team_data.name,
            tag=team_data.tag,
            description=team_data.description
        )
        t.save()

        # if provided, store the file
        if team_data.logo:
            storage_path = Path(config.webserver.upload_folder) / "team_logos"
            storage_path.mkdir(parents=True, exist_ok=True)
            await team_data.logo.save(storage_path / f'{t.id}.png')

    return TeamResponse(**model_to_dict(t))


@validate_call
@auth.requires_admin()  # TODO: Allow match manager to edit _some_ of the values
async def update_team_data(team_id: int, update: UpdateTeamData, author: auth.User) -> TeamResponse:
    """patch an existing team"""
    with db.proxy.atomic() as txn:
        t = Team.get_by_id(team_id)

        t.name = t.name if update.name is None else update.name
        t.tag = t.tag if update.tag is None else update.tag
        t.description = t.description if update.description is None else update.description

        t.save()

        if update.logo:
            storage_path = Path(config.webserver.upload_folder) / "team_logos"
            storage_path.mkdir(parents=True, exist_ok=True)
            await update.logo.save(storage_path / f'{t.id}.png')

    return TeamResponse(**model_to_dict(t))


@validate_call
@auth.requires_admin()
async def delete_team(team_id: int, author: auth.User):
    """delete a team by its id"""
    Team.delete_by_id(team_id)
