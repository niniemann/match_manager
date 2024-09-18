"""api to modify teams"""

import os
import hashlib
import logging
from pathlib import Path
from http import HTTPStatus
from typing import List
from functools import wraps

from quart import Blueprint, send_from_directory, request
from quart_schema import validate_request, validate_response, DataSource
from pydantic import validator

from match_manager.web.api.login import requires_login
from match_manager.model import team as model
from match_manager.model import auth
from match_manager import config

blue = Blueprint('teams', __name__, url_prefix='/api/teams')
logger = logging.getLogger(__name__)


@blue.route('/', methods=['GET'])
@validate_response(List[model.TeamResponse])
async def list_teams():
    """lists all teams"""
    return await model.get_teams()


@blue.route('/<int:team_id>', methods=['GET'])
@validate_response(model.TeamResponse)
async def show_team(team_id: int):
    """returns info of a single team"""
    return await model.get_team(team_id)


@blue.route('/<int:team_id>', methods=["DELETE"])
@requires_login()
async def delete_team(team_id: int, author: auth.User):
    """deletes a single team, by id"""
    await model.delete_team(team_id, author)
    return "", HTTPStatus.NO_CONTENT


class NewTeamData(model.NewTeamData):
    """workaround: convert string to list for managers -- issue with multipart form data parsing"""
    @validator('managers', pre=True, check_fields=False)
    def parse_list(cls, value):
        if isinstance(value, str):
            return [int(x) for x in value.split(',')]
        return value

class UpdateTeamData(model.UpdateTeamData):
    """workaround: convert string to list for managers -- issue with multipart form data parsing"""
    @validator('managers', pre=True, check_fields=False)
    def parse_list(cls, value):
        if isinstance(value, str):
            return [int(x) for x in value.split(',')]
        return value


@blue.route('/', methods=['POST'])
@requires_login()
@validate_request(NewTeamData, source=DataSource.FORM_MULTIPART)
@validate_response(model.TeamResponse, HTTPStatus.CREATED)
async def create_new_team(data: model.NewTeamData, author: auth.User) -> model.TeamResponse:
    """create a new team"""
    return await model.create_new_team(data, author)


@blue.route('/<int:team_id>', methods=['PATCH'])
@requires_login()
@validate_request(UpdateTeamData, source=DataSource.FORM_MULTIPART)
@validate_response(model.TeamResponse)
async def update_team_data(team_id: int, data: model.UpdateTeamData, author: auth.User):
    """update an existing team"""
    return await model.update_team_data(team_id, data, author)


_logo_folder = Path(config.webserver.upload_folder) / "team_logos"

@blue.route('/logo/<path:filename>')
async def get_team_logo(filename: str):
    """serve files from the team-logo folder"""
    return await send_from_directory(_logo_folder, filename)
