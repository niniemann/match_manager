
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


class UpdateMatchData(UtcAwareBaseModel):
    """
    For basic match data updates -- date/time, map, scheduling/ban modes.
    """
    match_time: datetime | None = None
    match_time_state: model.MatchSchedulingState | None = None

    game_map: int | None = None
    team_a_faction: model.Faction | None = None
    map_selection_mode: model.MapSelectionMode | None = None


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
    return sorted([
        MatchResponse(**model_to_dict(m, recurse=False))
        for m in group.matches
    ], key=lambda x: x.id)


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
@audit.log_call('{match_id}: {data}')
async def update_match(match_id: int, data: UpdateMatchData, author: auth.User) -> MatchResponse:
    """updates a match"""

    match data.match_time_state:
        case model.MatchSchedulingState.FIXED | model.MatchSchedulingState.OPEN_FOR_SUGGESTIONS | None:
            pass  # this is fine
        case _:
            # everything else implies confirmation of one of the teams, which must be given through other means,
            # by the team managers, not through an admin
            raise ValueError('Invalid match scheduling mode.')


    with db.proxy.atomic():
        m: model.Match
        m = model.Match.get_by_id(match_id)

        if m.state == model.MatchState.COMPLETED:
            raise ValueError('Completed matches cannot be edited.')

        # --- handle scheduling changes ---
        if 'match_time' in data.model_fields_set:  # None is a valid value, so check for "is set" instead of "not None"
            m.match_time = data.match_time # type: ignore
            # an admin actively set a match date/time -- this resets any confirmation-state of the teams
            if data.match_time_state is not None:
                # okay, already checked before, just set it.
                m.match_time_state = data.match_time_state # type: ignore
            else:
                # need to reset all confirmations, unless it is just a fixed date
                if m.match_time_state != model.MatchSchedulingState.FIXED:
                    m.match_time_state = model.MatchSchedulingState.OPEN_FOR_SUGGESTIONS # type: ignore
        else:
            # without giving a time, switching the mode should reset the previous value.
            if data.match_time_state is not None:
                m.match_time = None # type: ignore


        # --- handle map and faction selection changes ---
        MapMode = model.MapSelectionMode

        if data.map_selection_mode is not None and data.map_selection_mode != MapMode.FIXED:
            raise ValueError('Map bans are not supported, yet.')


        new_map_mode = data.map_selection_mode or m.map_selection_mode
        new_map = data.game_map if 'game_map' in data.model_fields_set else m.game_map  # "None" is valid for the map

        if new_map_mode != m.map_selection_mode:
            # The mode changed! Settings for map and faction in {data} may be ignored.
            # TODO: if ban exists: remove ban.

            match new_map_mode:
                case MapMode.BAN_MAP_AND_FACTION:
                    m.game_map = None # type: ignore
                    m.team_a_faction = None # type: ignore
                    # TODO: create new ban
                case MapMode.BAN_MAP_FIXED_FACTION:
                    m.game_map = None # type: ignore
                    m.team_a_faction = data.team_a_faction or m.team_a_faction # type: ignore
                    # TODO: create new ban
                case MapMode.FIXED:
                    m.game_map = data.game_map # type: ignore
                    m.team_a_faction = data.team_a_faction # type: ignore

            m.map_selection_mode = new_map_mode # type: ignore
        else:
            # the mode did not change, so check if setting map/faction is even allowed
            if data.game_map and m.map_selection_mode != MapMode.FIXED:
                raise ValueError('A map cannot be set together with Map-Ban-Modes.')

            m.game_map = new_map # type: ignore

            if data.team_a_faction and m.map_selection_mode == MapMode.BAN_MAP_AND_FACTION:
                raise ValueError('Cannot set faction when it is part of the ban.')

            m.team_a_faction = data.team_a_faction if 'team_a_faction' in data.model_fields_set else m.team_a_faction # type: ignore


        # --- consider state changes due to finalized or revoked planning information ---
        ScheduleState = model.MatchSchedulingState
        time_set = m.match_time and m.match_time_state in [ScheduleState.FIXED, ScheduleState.BOTH_CONFIRMED]
        map_set = m.game_map
        faction_set = m.team_a_faction

        match m.state:
            case model.MatchState.DRAFT:
                pass  # no automatic changes in DRAFT state.
            case model.MatchState.PLANNING:
                # maybe all relevant data is set and we are just waiting now?
                if time_set and map_set and faction_set:
                    m.state = model.MatchState.ACTIVE # type: ignore
            case model.MatchState.ACTIVE:
                # maybe some info has been reset and we are back in planning?
                if not (time_set and map_set and faction_set):
                    m.state = model.MatchState.PLANNING # type: ignore
            case model.MatchState.CANCELLED:
                pass # just like DRAFT, no automatic state change
            case model.MatchState.COMPLETED:
                pass # WOOPS -- should not get here, but reject editing completed matches early.

        m.save()

    return MatchResponse(**model_to_dict(m, recurse=False))


@validate_call
@auth.requires_admin()
@audit.log_call('{match_id}')
async def delete_match(match_id: int, author: auth.User) -> None:
    """deletes a match -- might affect other stuff, e.g. predictions"""
    model.Match.delete_by_id(match_id)
