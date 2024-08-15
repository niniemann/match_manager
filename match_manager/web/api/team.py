"""api to modify teams"""

import logging
from dataclasses import dataclass
from http import HTTPStatus
from typing import List

from quart import Blueprint, redirect, request, session, url_for
from quart_schema import validate_request, validate_response

from playhouse.shortcuts import model_to_dict

from match_manager.web.api.login import requires_login, requires_match_maker_admin
from match_manager.model import team as model

blue = Blueprint('teams', __name__, url_prefix='/api/teams')
logger = logging.getLogger(__name__)

@dataclass
class PartialTeam:
    name: str | None
    description: str | None
    logo_url: str | None


@dataclass
class Team(PartialTeam):
    id: int


@blue.route('/', methods=['GET'])
@validate_response(List[Team])
def list_teams():
    """lists all teams"""
    return list(model.Team.select().dicts())


@blue.route('/<int:team_id>', methods=['GET'])
@validate_response(Team)
def show_team(team_id: int):
    """returns info of a single team"""
    return model_to_dict(model.Team.get_by_id(team_id))


@blue.route('/', methods=['POST'])
@requires_login(redirect_on_failure=False)
@requires_match_maker_admin()
@validate_request(PartialTeam)
@validate_response(Team)
def create_new_team(data: PartialTeam) -> Team:
    """create a new team"""
    if data.name is None or len(data.name) == 0:
        return "a team name is required", HTTPStatus.BAD_REQUEST

    t = model.Team(name=data.name, description=data.description, logo_url=data.logo_url)
    t.save()
    return Team(**model_to_dict(t))
