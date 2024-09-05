"""Model interactions with seasons and match-groups"""

import peewee as pw
from playhouse.shortcuts import model_to_dict
from pydantic import BaseModel, validate_call, Field

from .db.season import Season, MatchGroup, TeamInGroup
from .db.team import Team
from .team import TeamResponse
from . import auth, db

"""
pydantic models for validation
"""

class MatchGroupResponse(BaseModel):
    """basic info about a MatchGroup - does not contain the matches"""
    name: str = Field(min_length=2)
    teams: list[TeamResponse]


class NewSeasonData(BaseModel):
    """data required to create a new season"""
    name: str = Field(min_length=2)


class SeasonOverview(BaseModel):
    """basic info about a season"""
    id: int
    name: str
    num_groups: int   # number of groups/stages/divisions in the season


class SeasonResponse(SeasonOverview):
    """season info including configured match groups"""
    match_groups: list[MatchGroupResponse]


"""
model operations
"""

@validate_call
async def list_seasons() -> list[SeasonOverview]:
    """list all seasons"""
    query = (Season
        .select(Season.id, Season.name, pw.fn.COUNT(MatchGroup.id).alias("num_groups"))
        .join(MatchGroup, pw.JOIN.LEFT_OUTER)
        .group_by(Season)
        .order_by(Season.id))

    return list(SeasonOverview(**model_to_dict(result, extra_attrs=['num_groups'])) for result in query)


@validate_call
async def get_season(season_id: int) -> SeasonResponse:
    """get the details of a selected season"""
    season = Season.get_by_id(season_id)
    groups = (MatchGroup
        .select(MatchGroup, Team)
        .left_outer_join(TeamInGroup)
        .join(Team)
        .where(MatchGroup.season_id == season_id))
    groups = [MatchGroupResponse(name=g.name, teams=g.teams) for g in groups]
    return SeasonResponse(id=season.id, name=season.name, num_groups=len(groups), match_groups=groups)


@validate_call
@auth.requires_admin()
async def create_season(season_data: NewSeasonData, author: auth.User) -> SeasonResponse:
    """create a new season"""
    with db.proxy.atomic() as txn:
        s = Season(name=season_data.name)
        s.save()

    return SeasonResponse(**model_to_dict(s, backrefs=True), num_groups=0)
