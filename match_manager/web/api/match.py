"""api to modify matches"""

from datetime import datetime
from http import HTTPStatus
from quart import Blueprint
from quart_schema import validate_request, validate_response

from match_manager.model import match as model, auth
from match_manager.model.audit import UtcAwareBaseModel
from match_manager.model.db.match import MatchCapScore
from match_manager.web.api.login import requires_login

from pydantic import BaseModel

blue = Blueprint('matches', __name__, url_prefix='/api/matches')


@blue.route('/', methods=['GET'])
@validate_response(list[model.MatchResponse])
async def list_matches() -> list[model.MatchResponse]:
    """lists matches. TODO: restrict this!"""
    return await model.list_matches()


@blue.route('/in-planning', methods=['GET'])
@validate_response(list[model.MatchResponse])
async def list_matches_in_planning() -> list[model.MatchResponse]:
    """list matches that are in planning"""
    return await model.list_matches_in_planning()


@blue.route('/waiting-for-result', methods=['GET'])
@validate_response(list[model.MatchResponse])
async def list_matches_waiting_for_result() -> list[model.MatchResponse]:
    """list matches that are waiting for a result"""
    return await model.list_matches_waiting_for_result()


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


class MatchTimeSuggestion(UtcAwareBaseModel):
    match_time: datetime
    suggesting_team: int


@blue.route('/<int:match_id>/suggest_match_time', methods=['POST']) # type: ignore
@requires_login()
@validate_request(MatchTimeSuggestion)
async def manager_suggest_match_time(match_id: int, data: MatchTimeSuggestion, author: auth.User):
    """suggest/confirm a date and time for a match"""
    await model.manager_suggest_match_time(match_id, data.suggesting_team, data.match_time, author)
    return "", HTTPStatus.NO_CONTENT


class ResultModel(BaseModel):
    winner_id: int
    result: MatchCapScore


@blue.route('/<int:match_id>/set_result', methods=['POST']) # type: ignore
@requires_login()
@validate_request(ResultModel)
async def set_result(match_id: int, data: ResultModel, author: auth.User):
    """set a fixed result for the match -- admins only."""
    await model.set_result(match_id, data.winner_id, data.result, author)
    return "", HTTPStatus.NO_CONTENT


@blue.route('/<int:match_id>/reset_result', methods=['POST']) # type: ignore
@requires_login()
async def reset_result(match_id: int, author: auth.User):
    """set a fixed result for the match -- admins only."""
    await model.reset_result(match_id, author)
    return "", HTTPStatus.NO_CONTENT


@blue.route('/<int:match_id>', methods=['DELETE'])
@requires_login()
async def delete_match(match_id: int, author: auth.User):
    """deletes a match"""
    await model.delete_match(match_id, author)
    return "", HTTPStatus.NO_CONTENT
