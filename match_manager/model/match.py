
from datetime import datetime
from playhouse.shortcuts import model_to_dict

from match_manager.model.season import MatchGroup
from match_manager.model.validation import UtcAwareBaseModel
from .db import match as model, map as game_map, game_match, season

from pydantic import validate_call

from match_manager.model import db, auth, audit


"""
pydantic models for validation
"""

class NewMatchData(UtcAwareBaseModel):
    """
    Data required to create a new match.
    """
    group_id: int
    team_a_id: int
    team_b_id: int

    match_time: datetime | None = None
    match_time_state: model.MatchSchedulingState = model.MatchSchedulingState.FIXED

    game_map: int | None = None
    team_a_faction: model.Faction | None = None
    map_selection_mode: model.MapSelectionMode = model.MapSelectionMode.FIXED


class MatchResponse(UtcAwareBaseModel):
    """
    Full data about a match, but references are not resolved and are returned as ids.
    """
    id: int
    group: int  # note: model_to_dict omits the '_id' suffix...
    team_a: int
    team_b: int


    match_time: datetime | None
    match_time_state: model.MatchSchedulingState

    game_map: int | None
    team_a_faction: model.Faction | None
    map_selection_mode: model.MapSelectionMode

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
async def get_match(match_id: int) -> MatchResponse:
    """get a single match, shallow!"""
    m = model.Match.get_by_id(match_id)
    return MatchResponse(**model_to_dict(m, recurse=False))


@validate_call
@auth.requires_admin()
@audit.log_call('{data}')
async def create_match(data: NewMatchData, author: auth.User) -> MatchResponse:
    """creates a new match entry in DRAFT state and returns """

    # check for teams
    if data.team_a_id == data.team_b_id:
        raise ValueError("A team cannot play against itself. Well, at least not here, the rest is discord-drama.")

    # check for valid schedule state
    schedule_mode: model.MatchSchedulingState = data.match_time_state
    match schedule_mode:
        case model.MatchSchedulingState.FIXED | model.MatchSchedulingState.OPEN_FOR_SUGGESTIONS:
            pass  # all is fine
        case _:
            raise ValueError("The state of scheduling for a new match can only be FIXED or OPEN_FOR_SUGGESTIONS.")

    # TODO: should this be part of the "NewMatchData" validation with pydantic?

    # check for map selection modes
    if data.map_selection_mode != model.MapSelectionMode.FIXED:
        if data.game_map is not None:
            raise ValueError("Cannot combine map-ban with a fixed map.")

        # TODO implement and create the map-ban here as well
        raise ValueError("Map bans are not implemented, yet. Sorry.")

    if data.map_selection_mode == model.MapSelectionMode.BAN_MAP_AND_FACTION:
        raise ValueError("Cannot set a fixed faction when banning it as well.")

    with db.proxy.atomic() as txn:
        m = model.Match(
            group=data.group_id,
            team_a=data.team_a_id,
            team_b=data.team_b_id,
            match_time=data.match_time,
            match_time_state=data.match_time_state,
            game_map=data.game_map,
            team_a_faction=data.team_a_faction,
            map_selection_mode=data.map_selection_mode,
        )
        m.save()
    return MatchResponse(**model_to_dict(m, recurse=False))


@validate_call
@auth.requires_admin()
@audit.log_call('{match_id}')
async def delete_match(match_id: int, author: auth.User) -> None:
    """deletes a match -- might affect other stuff, e.g. predictions"""
    model.Match.delete_by_id(match_id)
