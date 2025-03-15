"""Model interactions with seasons and match-groups"""

import peewee as pw
from playhouse.shortcuts import model_to_dict
from pydantic import BaseModel, validate_call, Field
from typing import Optional

from .db.season import Season, MatchGroup, TeamInGroup
from .db.team import Team
from .team import TeamResponse
from . import auth, db, audit

"""
pydantic models for validation
"""

class NewMatchGroupData(BaseModel):
    """required to create a new match group"""
    season_id: int
    name: str = Field(min_length=2)

class UpdateMatchGroupData(BaseModel):
    """used to patch individual attributes of a match group"""
    name: Optional[str] = Field(min_length=2, default=None)
    teams: Optional[list[int]] = Field(default=None)

class MatchGroupResponse(BaseModel):
    """basic info about a MatchGroup - does not contain the matches, but full team data"""
    id: int
    name: str = Field(min_length=2)
    teams: list[TeamResponse]


class MatchGroupOverview(BaseModel):
    """basic info about a MatchGroup - only its id and name"""
    id: int
    name: str


class NewSeasonData(BaseModel):
    """data required to create a new season"""
    name: str = Field(min_length=2)


class SeasonOverview(BaseModel):
    """basic info about a season"""
    id: int
    name: str
    match_groups: list[MatchGroupOverview]


class SeasonResponse(BaseModel):
    """season info including configured match groups"""
    id: int
    name: str
    match_groups: list[MatchGroupResponse]


"""
model operations
"""

@validate_call
async def list_seasons() -> list[SeasonOverview]:
    """list all seasons"""

    season_query = Season.select();
    groups_query = MatchGroup.select() # type: ignore
    seasons_with_groups = pw.prefetch(season_query, groups_query)

    return [
        SeasonOverview(
            id=s.id,
            name=s.name,
            match_groups=[
                MatchGroupOverview(id=m.id, name=m.name)
                for m in s.match_groups
            ]
        )
        for s in seasons_with_groups
    ]


@validate_call
async def get_season(season_id: int) -> SeasonResponse:
    """get the details of a selected season"""

    season = Season.get_by_id(season_id)
    groups_q = MatchGroup.select().where(MatchGroup.season_id == season_id) # type: ignore
    teamsingroup_q = TeamInGroup.select()
    teams_q = Team.select()

    groups_with_teams = pw.prefetch(groups_q, teamsingroup_q, teams_q)

    groups = [
        MatchGroupResponse(
            id=g.id,
            name=g.name,
            teams=[
                TeamResponse(**model_to_dict(t_in_g.team))
                for t_in_g in g.teams
            ]
        )
        for g in groups_with_teams
    ]

    return SeasonResponse(id=season.id, name=season.name, match_groups=groups)


@validate_call
@auth.requires_admin()
@audit.log_call(description='{season_data}')
async def create_season(season_data: NewSeasonData, author: auth.User) -> SeasonResponse:
    """create a new season"""
    with db.proxy.atomic() as txn:
        s = Season(name=season_data.name)
        s.save()

    return SeasonResponse(**model_to_dict(s, backrefs=True))


@validate_call
async def get_match_group(group_id: int) -> MatchGroupResponse:
    """get the details of a selected match group"""
    group_with_teams = pw.prefetch(
        MatchGroup.select().where(MatchGroup.id == group_id), # type: ignore
        TeamInGroup.select(),
        Team.select()
    )
    assert len(group_with_teams) == 1
    group = group_with_teams[0]
    return MatchGroupResponse(
        id=group.id,
        name=group.name,
        teams=[
            TeamResponse(**model_to_dict(t_in_g.team))
            for t_in_g in group.teams
        ]
    )


@validate_call
@auth.requires_admin()
@audit.log_call(description='{group_data}')
async def create_match_group(group_data: NewMatchGroupData, author: auth.User) -> MatchGroupResponse:
    """create a new match group"""
    with db.proxy.atomic() as txn:
        season = Season.get_by_id(group_data.season_id)
        group = MatchGroup(name=group_data.name, season=season)
        group.save()

    return MatchGroupResponse(**model_to_dict(group), teams=[])


@validate_call
@auth.requires_admin()
@audit.log_call(description='{group_id}: {group_data}')
async def update_match_group(group_id: int, group_data: UpdateMatchGroupData, author: auth.User) -> MatchGroupResponse:
    """update an existing match group"""
    with db.proxy.atomic() as txn:
        group = MatchGroup.get_by_id(group_id)

        if group_data.name is not None:
            group.name = group_data.name

        if group_data.teams is not None:
            # simplify: remove all, then add all
            TeamInGroup.delete().where(TeamInGroup.group==group).execute()
            TeamInGroup.bulk_create([TeamInGroup(group=group, team_id=tid) for tid in group_data.teams])

        group.save()

    return MatchGroupResponse(id=group.id, name=group.name, teams=[TeamResponse(**model_to_dict(t.team)) for t in group.teams])


@validate_call
@auth.requires_admin()
@audit.log_call(description='{group_id}')
async def delete_match_group(group_id: int, author: auth.User) -> None:
    """delete an existing match group"""
    MatchGroup.delete_by_id(group_id)
