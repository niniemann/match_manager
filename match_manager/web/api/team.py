"""api to modify teams"""

import os
import hashlib
import logging
from pathlib import Path
from http import HTTPStatus
from typing import List

from quart import Blueprint, send_from_directory, request
from quart_schema import validate_request, validate_response, DataSource

from playhouse.shortcuts import model_to_dict

from match_manager.web.api.login import requires_login, requires_match_maker_admin
from match_manager.model import team as model
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
@requires_login(redirect_on_failure=False)
@requires_match_maker_admin()
async def delete_team(team_id: int):
    """deletes a single team, by id"""
    await model.delete_team(team_id)
    return "", HTTPStatus.NO_CONTENT


@blue.route('/', methods=['POST'])
@requires_login(redirect_on_failure=False)
@requires_match_maker_admin()
@validate_request(model.NewTeamData, source=DataSource.FORM_MULTIPART)
@validate_response(model.TeamResponse, HTTPStatus.CREATED)
async def create_new_team(data: model.NewTeamData) -> model.TeamResponse:
    """create a new team"""
    return await model.create_new_team(data)


@blue.route('/<int:team_id>', methods=['PATCH'])
@requires_login(redirect_on_failure=False)
@requires_match_maker_admin()
@validate_request(model.UpdateTeamData, source=DataSource.FORM_MULTIPART)
@validate_response(model.TeamResponse)
async def update_team_data(team_id: int, data: model.UpdateTeamData):
    """update an existing team"""
    return await model.update_team_data(team_id, data)


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
