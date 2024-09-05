"""api to modify seasons"""

from typing import List
from quart import Blueprint, request
from quart_schema import validate_request, validate_response

from match_manager.model import season as model, auth
from match_manager.web.api.login import requires_login


blue = Blueprint('seasons', __name__, url_prefix='/api/seasons')


@blue.route('/', methods=['GET'])
@validate_response(List[model.SeasonOverview])
async def list_seasons():
    """lists all seasons"""
    return await model.list_seasons()


@blue.route('/', methods=['POST'])
@requires_login()
@validate_request(model.NewSeasonData)
@validate_response(model.SeasonResponse)
async def create_season(data: model.NewSeasonData, author: auth.User) -> model.SeasonResponse:
    """create a new season"""
    return await model.create_season(data, author)


@blue.route('/<int:season_id>', methods=['GET'])
@validate_response(model.SeasonResponse)
async def get_season(season_id: int):
    """get a single season"""
    return await model.get_season(season_id)
