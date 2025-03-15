
from datetime import datetime, timezone, tzinfo

from playhouse.shortcuts import model_to_dict

from match_manager.model.season import MatchGroup
from match_manager.model.validation import UtcAwareBaseModel
from .db import match as model, map as game_map, game_match, season

from pydantic import BaseModel, Field, validate_call, field_validator

from match_manager.model import db, auth, audit


"""
pydantic models for validation
"""

class NewMatchData(BaseModel):
    """
    Data required to create a new match. This is kept minimal, as the match contains quite some state,
    which is updated through individual methods instead of a single "update_match".
    """
    group_id: int
    team_a_id: int
    team_b_id: int


class MatchResponse(UtcAwareBaseModel):
    """
    Full data about a match, but references are not resolved and are returned as ids.
    """
    id: int
    group: int  # note: model_to_dict omits the '_id' suffix...
    team_a: int
    team_b: int

    team_a_faction: model.Faction | None
    match_time: datetime | None
    match_time_state: model.MatchSchedulingState
    game_map: int | None
    winner: int | None
    winner_caps: int | None
    state: model.MatchState


@validate_call
async def list_matches() -> list[MatchResponse]:
    """
    Returns a list of matches.
    TODO: restrict this, the list might get long!
    """
    return list(MatchResponse(**model_to_dict(m, recurse=False))
                 for m in model.Match.select().order_by(model.Match.id))


@validate_call
async def list_matches_in_season(season_id: int) -> list[MatchResponse]:
    """returns all matches in a given season, shallow!"""
    groups = list(season.MatchGroup.select(MatchGroup.id).where(season.MatchGroup.season_id == season_id)) # type: ignore
    matches = list(
        MatchResponse(**model_to_dict(m, recurse=False))
        for m in model.Match.select().where(model.Match.group_id.in_(groups)) # type: ignore
    )
    return matches


@validate_call
async def list_matches_in_group(group_id: int) -> list[MatchResponse]:
    """returns all matches in a given match-group, shallow!"""
    group = MatchGroup.get_by_id(group_id)
    return [
        MatchResponse(**model_to_dict(m, recurse=False))
        for m in group.matches
    ]


@validate_call
@auth.requires_admin()
@audit.log_call('{data}')
async def create_match(data: NewMatchData, author: auth.User) -> MatchResponse:
    """creates a new match entry in DRAFT state and returns """
    with db.proxy.atomic() as txn:
        m = model.Match(
            group=data.group_id,
            team_a=data.team_a_id,
            team_b=data.team_b_id
        )
        m.save()
    return MatchResponse(**model_to_dict(m, recurse=False))


@validate_call
@auth.requires_admin()
@audit.log_call('{match_id}')
async def delete_match(match_id: int, author: auth.User) -> None:
    """deletes a match -- might affect other stuff, e.g. predictions"""
    model.Match.delete_by_id(match_id)
