"""api to access the audit logs"""

from datetime import datetime
import logging
from http import HTTPStatus

from quart import Blueprint, request
from quart_schema import validate_response, validate_querystring
from pydantic import BaseModel, Field

from match_manager import model

blue = Blueprint('audit', __name__, url_prefix='/api/audit')
logger = logging.getLogger(__name__)


class LogSearchQuery(BaseModel):
    timestamp: datetime | None = None

@blue.route('/fetch_log', methods=['GET'])
@validate_querystring(LogSearchQuery)
async def search_user(query_args: LogSearchQuery) -> list[model.audit.AuditEventData]:
    """returns audit log entries older than the given datetime (or the newest ones=)"""
    return await model.audit.fetch_log(query_args.timestamp, 20)
