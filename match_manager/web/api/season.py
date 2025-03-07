"""api to modify seasons"""

from http import HTTPStatus
from typing import List
from quart import Blueprint, request
from quart_schema import validate_request, validate_response

from match_manager.model import season as model, auth
from match_manager.web.api.login import requires_login


blue = Blueprint('seasons', __name__, url_prefix='/api/seasons')


@blue.route('/', methods=['GET'])
@validate_response(List[model.SeasonOverview])
async def list_seasons() -> List[model.SeasonOverview]:
    """lists all seasons"""
    return await model.list_seasons()


@blue.route('/', methods=['POST']) # type: ignore
@requires_login()
@validate_request(model.NewSeasonData)
@validate_response(model.SeasonResponse)
async def create_season(data: model.NewSeasonData, author: auth.User) -> model.SeasonResponse:
    """create a new season"""
    return await model.create_season(data, author)


@blue.route('/<int:season_id>', methods=['GET']) # type: ignore
@validate_response(model.SeasonResponse)
async def get_season(season_id: int) -> model.SeasonResponse:
    """get a single season"""
    return await model.get_season(season_id)


@blue.route('/groups', methods=['POST']) # type: ignore
@requires_login()
@validate_request(model.NewMatchGroupData)
@validate_response(model.MatchGroupResponse)
async def create_group(data: model.NewMatchGroupData, author: auth.User) -> model.MatchGroupResponse:
    """create a new match group"""
    return await model.create_match_group(data, author)


@blue.route('/groups/<int:group_id>', methods=['PATCH']) # type: ignore
@requires_login()
@validate_request(model.UpdateMatchGroupData)
@validate_response(model.MatchGroupResponse)
async def update_group(group_id: int, data: model.UpdateMatchGroupData, author: auth.User) -> model.MatchGroupResponse:
    """update an existing match group"""
    return await model.update_match_group(group_id, data, author)


@blue.route('/groups/<int:group_id>', methods=['DELETE'])
@requires_login()
async def delete_group(group_id: int, author: auth.User):
    """delete a match group"""
    await model.delete_match_group(group_id, author)
    return "", HTTPStatus.NO_CONTENT
