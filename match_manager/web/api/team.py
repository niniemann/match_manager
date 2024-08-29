"""api to modify teams"""

import logging
from dataclasses import dataclass
from http import HTTPStatus
from typing import List, Optional

from quart import Blueprint
from quart_schema import validate_request, validate_response

from playhouse.shortcuts import model_to_dict

from match_manager.web.api.login import requires_login, requires_match_maker_admin
from match_manager.model import team as model

blue = Blueprint('teams', __name__, url_prefix='/api/teams')
logger = logging.getLogger(__name__)

@dataclass
class PartialTeam:
    """partial team data, potentially not existent in the database yet"""
    name: Optional[str] = None
    tag: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None


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
@validate_request(PartialTeam)
@validate_response(Team, HTTPStatus.CREATED)
async def create_new_team(data: PartialTeam) -> Team:
    """create a new team"""
    if data.name is None or len(data.name) == 0:
        return "a team name is required", HTTPStatus.BAD_REQUEST

    t = model.Team(name=data.name, description=data.description, logo_url=data.logo_url)
    t.save()
    return Team(**model_to_dict(t))


@blue.route('/<int:team_id>', methods=['PATCH'])
@requires_login(redirect_on_failure=False)
@requires_match_maker_admin()
@validate_request(PartialTeam)
async def update_team_data(team_id: int, data: PartialTeam):
    """update an existing team"""
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

    if data.logo_url is not None:
        # t.logo_url =
        # TODO - logo upload?
        pass

    t.save()

    return "", HTTPStatus.OK
