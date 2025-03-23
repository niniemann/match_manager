"""api to modify matches"""

from http import HTTPStatus
from quart import Blueprint
from quart_schema import validate_request, validate_response

from match_manager.model import match as model, auth
from match_manager.web.api.login import requires_login


blue = Blueprint('matches', __name__, url_prefix='/api/matches')


@blue.route('/', methods=['GET'])
@validate_response(list[model.MatchResponse])
async def list_matches() -> list[model.MatchResponse]:
    """lists matches. TODO: restrict this!"""
    return await model.list_matches()


@blue.route('/<int:match_id>', methods=['GET']) # type: ignore
@validate_response(model.MatchResponse)
async def get_match(match_id: int):
    """get a single match"""
    return await model.get_match(match_id)


@blue.route('/', methods=['POST']) # type: ignore
@requires_login()
@validate_request(model.NewMatchData)
@validate_response(model.MatchResponse)
async def create_match(data: model.NewMatchData, author: auth.User):
    """create a new match"""
    return await model.create_match(data, author)


@blue.route('/<int:match_id>', methods=['PATCH']) # type: ignore
@requires_login()
@validate_request(model.UpdateMatchData)
@validate_response(model.MatchResponse)
async def update_match(match_id: int, data: model.UpdateMatchData, author: auth.User):
    """update a match"""
    return await model.update_match(match_id, data, author)


@blue.route('/<int:match_id>/set_active', methods=['POST']) # type: ignore
@requires_login()
async def set_active(match_id: int, author: auth.User):
    """activate a match"""
    await model.set_active(match_id, author)
    return "", HTTPStatus.NO_CONTENT


@blue.route('/<int:match_id>/set_draft', methods=['POST']) # type: ignore
@requires_login()
async def set_draft(match_id: int, author: auth.User):
    """set a match back to draft-mode"""
    await model.set_draft(match_id, author)
    return "", HTTPStatus.NO_CONTENT


@blue.route('/<int:match_id>', methods=['DELETE'])
@requires_login()
async def delete_match(match_id: int, author: auth.User):
    """deletes a match"""
    await model.delete_match(match_id, author)
    return "", HTTPStatus.NO_CONTENT
