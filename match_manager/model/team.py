"""representation of data revolving around teams"""
# pylint: disable=missing-class-docstring,too-few-public-methods

import uuid
import peewee as pw
from playhouse.shortcuts import model_to_dict
from pydantic import BaseModel, validate_call, Field
from quart_schema.pydantic import File
from typing import Optional
from pathlib import Path

from match_manager import config
from .db.team import Team, TeamManager
from . import auth, db, user, audit


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
    managers: Optional[list[int]] = Field(default=None)

class TeamResponse(BaseModel):
    """information sent in return after creating/patching/getting a team"""
    id: int
    name: str
    tag: str
    logo_filename: Optional[str] = Field(default=None)
    description: str = Field(default="")
    # managers may be only included in single-team query results
    managers: Optional[list[user.DiscordMemberInfo]] = Field(default=None)


"""
model operations, which use the pydantic validation, manage the database,
and may handle permissions, events and logging in the future.
"""

@validate_call
async def get_team(team_id: int) -> TeamResponse:
    """fetch a team from the database"""
    team = Team.get_by_id(team_id)
    response = TeamResponse(**model_to_dict(team))
    # since only a single team is queried, include extra information, i.e. the team managers

    response.managers = [
        u for m in team.managers if (u := await user.get_user(m.discord_user_id)) is not None
    ]
    return response


async def get_teams() -> list[TeamResponse]:
    """fetch all teams from the database"""
    return list(TeamResponse(**model_to_dict(t)) for t in Team.select())


@validate_call
@auth.requires_admin()
@audit.log_call(description='{team_data}')
async def create_new_team(team_data: NewTeamData, author: auth.User) -> TeamResponse:
    """create a new team"""
    with db.proxy.atomic() as txn:
        # create the team entry
        t = Team(
            name=team_data.name,
            tag=team_data.tag,
            description=team_data.description
        )

        # if provided, store the file
        if team_data.logo:
            # add a unique prefix to force browsers to load new files...
            t.logo_filename = uuid.uuid4().hex + '_' + (team_data.logo.filename or '')

            storage_path = Path(config.webserver.upload_folder) / "team_logos"
            storage_path.mkdir(parents=True, exist_ok=True)
            await team_data.logo.save(storage_path / t.logo_filename)

        t.save()

    return TeamResponse(**model_to_dict(t))


@validate_call
@auth.requires_admin()  # TODO: Allow match manager to edit _some_ of the values
@audit.log_call(description='{team_id}: {update}')
async def update_team_data(team_id: int, update: UpdateTeamData, author: auth.User) -> TeamResponse:
    """patch an existing team"""
    with db.proxy.atomic() as txn:
        t = Team.get_by_id(team_id)

        t.name = t.name if update.name is None else update.name
        t.tag = t.tag if update.tag is None else update.tag
        t.description = t.description if update.description is None else update.description

        if update.managers is not None:
            # remove all team managers that are not in the new list
            TeamManager.delete().where(
                (TeamManager.team==t) &
                TeamManager.discord_user_id.not_in(update.managers) # type: ignore
            ).execute()

            # add all that are missing
            for uid in update.managers:
                TeamManager.get_or_create(discord_user_id=uid, team=t)

        t.save()

        if update.logo:
            # remember the old logo name
            old_logo = t.logo_filename

            # save the new logo
            t.logo_filename = uuid.uuid4().hex + '_' + (update.logo.filename or '')

            storage_path = Path(config.webserver.upload_folder) / "team_logos"
            storage_path.mkdir(parents=True, exist_ok=True)
            await update.logo.save(storage_path / t.logo_filename)

            # save the team and clean up
            t.save()
            if old_logo:
                try:
                    (Path(config.webserver.upload_folder) / "team_logos" / old_logo).unlink()
                except:
                    pass

    return TeamResponse(**model_to_dict(t))


@validate_call
@auth.requires_admin()
@audit.log_call(description='{team_id}')
async def delete_team(team_id: int, author: auth.User):
    """delete a team by its id"""
    with db.proxy.atomic() as txn:
        t = Team.get_by_id(team_id)
        logo = (Path(config.webserver.upload_folder) / "team_logos" / t.logo_filename)
        t.delete_instance()

        try:
            logo.unlink()
        except:
            pass # just ignore errors, nothing we can do if this fails
