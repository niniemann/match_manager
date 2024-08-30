"""api to modify teams"""

import os
import hashlib
import logging
from pathlib import Path
from dataclasses import dataclass
from http import HTTPStatus
from typing import List, Optional

from quart import Blueprint, send_from_directory, request
from quart_schema import validate_request, validate_response, DataSource
from quart_schema.pydantic import File

from playhouse.shortcuts import model_to_dict

from match_manager.web.api.login import requires_login, requires_match_maker_admin
from match_manager.model import team as model
from match_manager import config

blue = Blueprint('teams', __name__, url_prefix='/api/teams')
logger = logging.getLogger(__name__)

@dataclass
class PartialTeam:
    """partial team data, potentially not existent in the database yet"""
    name: Optional[str] = None
    tag: Optional[str] = None
    description: Optional[str] = None
    logo: Optional[File] = None

@dataclass
class Team(PartialTeam):
    """existing team, including its id"""
    id: int = 0


@blue.route('/', methods=['GET'])
@validate_response(List[Team])
async def list_teams():
    """lists all teams"""
    return list(model.Team.select().dicts())


@blue.route('/<int:team_id>', methods=['GET'])
@validate_response(Team)
async def show_team(team_id: int):
    """returns info of a single team"""
    return model_to_dict(model.Team.get_by_id(team_id))

@blue.route('/<int:team_id>', methods=["DELETE"])
@requires_login(redirect_on_failure=False)
@requires_match_maker_admin()
async def delete_team(team_id: int):
    """deletes a single team, by id"""
    model.Team.delete_by_id(team_id)
    return "", HTTPStatus.NO_CONTENT


@blue.route('/', methods=['POST'])
@requires_login(redirect_on_failure=False)
@requires_match_maker_admin()
@validate_request(PartialTeam, source=DataSource.FORM_MULTIPART)
@validate_response(Team, HTTPStatus.CREATED)
async def create_new_team(data: PartialTeam) -> Team:
    """create a new team"""
    print(data)
    if data.name is None or len(data.name) == 0:
        return "a team name is required", HTTPStatus.BAD_REQUEST

    t = model.Team(name=data.name, description=data.description)
    t.save()

    if data.logo:
        storage_path = Path(config.webserver.upload_folder) / "team_logos"
        storage_path.mkdir(parents=True, exist_ok=True)
        print(storage_path)
        await data.logo.save(storage_path / f'{t.id}.png')

    return Team(**model_to_dict(t))


@blue.route('/<int:team_id>', methods=['PATCH'])
@requires_login(redirect_on_failure=False)
@requires_match_maker_admin()
@validate_request(PartialTeam, source=DataSource.FORM_MULTIPART)
@validate_response(Team)
async def update_team_data(team_id: int, data: PartialTeam):
    """update an existing team"""
    print(data)
    if data.name is not None and len(data.name) == 0:
        return "a team name is required", HTTPStatus.BAD_REQUEST

    t = model.Team.get_by_id(team_id)

    if data.name is not None:
        if len(data.name) == 0:
            return "a team name is required", HTTPStatus.BAD_REQUEST
        t.name = data.name

    if data.tag is not None:
        #t.tag = data.tag
        pass # TODO

    if data.description is not None:
        t.description = data.description

    t.save()

    if data.logo:
        # store the logos in the build folder
        storage_path = Path(config.webserver.upload_folder) / "team_logos"
        storage_path.mkdir(parents=True, exist_ok=True)
        print(storage_path)
        await data.logo.save(storage_path / f'{team_id}.png')

    return Team(**model_to_dict(t)), HTTPStatus.OK


@blue.route('/<int:team_id>/logo')
async def get_team_logo(team_id: int):
    """serve the logo belonging to the selected team"""
    filename = f'{team_id}.png'
    folder = Path(config.webserver.upload_folder) / "team_logos"

    # compute an etag header, to only re-fetch a file when it changed
    stat = os.stat(folder / filename)
    etag = hashlib.md5(f"{stat.st_mtime}-{stat.st_size}".encode()).hexdigest()

    if_none_match = request.headers.get('If-None-Match')
    print("etag?", if_none_match, etag)
    if if_none_match == etag:
        return '', HTTPStatus.NOT_MODIFIED

    response = await send_from_directory(folder, filename)
    response.headers['ETag'] = etag
    response.headers['cache-control'] = 'no-store'
    return response
