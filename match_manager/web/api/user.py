"""utilities regarding _any_ user on the tournament discord"""

import logging
from http import HTTPStatus

from quart import Blueprint, request
from quart_schema import validate_response, validate_querystring
from pydantic import BaseModel, Field

from match_manager import model

blue = Blueprint('user', __name__, url_prefix='/api/user')
logger = logging.getLogger(__name__)


class UserSearchQuery(BaseModel):
    user: str

@blue.route('/search', methods=['GET'])
@validate_querystring(UserSearchQuery)
async def search_user(query_args: UserSearchQuery) -> list[model.user.DiscordMemberInfo]:
    """returns a list of users on the tournament discord that match the search term"""
    return await model.user.search_user(query_args.user, max_results=10)
