
from datetime import datetime
from playhouse.shortcuts import model_to_dict
import logging

from match_manager.model.season import MatchGroup
from match_manager.model.validation import UtcAwareBaseModel
from .db import match as model, map as game_map, game_match, season

from pydantic import validate_call

from match_manager.model import db, auth, audit

logger = logging.getLogger(__name__)

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
    result_state: model.MatchResultState

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
async def list_matches_in_planning() -> list[MatchResponse]:
    """
    Returns all matches that are currently in planning.
    These are all matches that have not all basic details set -- map, faction, time/date --
    and thus may require team manager participation (either direct through interactive
    scheduling/map bans, or indirect through communication with admins).
    """
    query = model.Match.select().where(model.Match.state == model.MatchState.PLANNING)
    return [MatchResponse(**model_to_dict(m, recurse=False)) for m in query]


@validate_call
async def list_matches_waiting_for_result() -> list[MatchResponse]:
    """
    Returns all matches that are fully planned and active but do not have a result.
    This includes matches which have not been fought yet.
    """
    query = model.Match.select().where(model.Match.state == model.MatchState.ACTIVE)
    return [MatchResponse(**model_to_dict(m, recurse=False)) for m in query]


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


def __auto_update_match_state(m: model.Match):
    """inspect the match data and transition states if necessary (does not save)"""

    time_set = (
        m.match_time and
        m.match_time_state in [model.MatchSchedulingState.FIXED, model.MatchSchedulingState.BOTH_CONFIRMED]
    )
    map_set = m.game_map
    faction_set = m.team_a_faction

    State = model.MatchState
    match m.state:
        case State.DRAFT:
            pass  # no automatic changes in DRAFT state.
        case State.COMPLETED:
            logger.error("What the hell? Calling __auto_update_match_state on a completed match? (id: %s)", m.id)
            # but don't raise an actual error, just ignore the state change for now.
        case State.PLANNING:
            # maybe all relevant data is set and we are just waiting now?
            if time_set and map_set and faction_set:
                m.state = State.ACTIVE # type: ignore
        case State.ACTIVE:
            # maybe some info has been reset and we are back in planning?
            if not (time_set and map_set and faction_set):
                m.state = State.PLANNING # type: ignore
        case State.CANCELLED:
            pass # just like DRAFT, no automatic state change
        case _:
            raise ValueError('invalid match state')


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

        if m.state == model.MatchState.CANCELLED:
            raise ValueError('Why would you want to edit a cancelled match?')

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
        __auto_update_match_state(m)

        m.save()

    return MatchResponse(**model_to_dict(m, recurse=False))


@validate_call
@auth.requires_admin()
@audit.log_call('{match_id}')
async def set_active(match_id, author: auth.User) -> None:
    """activate the match, i.e. set it from 'draft' to planning or active"""
    with model.db_proxy.atomic() as txn:
        m = model.Match.get_by_id(match_id)

        State = model.MatchState
        match m.state:
            case State.DRAFT:
                m.state = State.PLANNING
                __auto_update_match_state(m)  # for a potential transition to active
            case State.PLANNING | State.ACTIVE:
                pass # nothing to do, already active
            case State.COMPLETED:
                pass # should this be reported as an error?
            case _:
                raise ValueError("Invalid match state")
        m.save()


@validate_call
@auth.requires_admin()
@audit.log_call('{match_id}')
async def set_draft(match_id, author: auth.User) -> None:
    """deactivate a match, i.e. putting it back into draft mode"""
    with model.db_proxy.atomic() as txn:
        m = model.Match.get_by_id(match_id)

        State = model.MatchState
        match m.state:
            case State.DRAFT:
                pass  # nothing to do
            case State.PLANNING | State.ACTIVE | State.CANCELLED:
                m.state = State.DRAFT
            case State.COMPLETED:
                raise ValueError("No going back on completed matches")
            case _:
                raise ValueError("Invalid match state")

        m.save()


@validate_call
@auth.requires_team_manager()
@audit.log_call('match: {match_id} / team: {team_id} / {match_time}')
async def manager_suggest_match_time(match_id: int, team_id: int, match_time: datetime, author: auth.User) -> None:
    """
    Suggestion of a team-manager for a date and time for a match.
    Also used for confirmation if the it matches a date/time suggested by the opponent before,
    or for refusal and counter-suggestion if it differs.
    """
    with model.db_proxy.atomic() as txn:
        m = model.Match.get_by_id(match_id)

        if not author.is_manager_for(team_id):
            raise auth.PermissionDenied("You are not a manager of this team. Shame on you for trying!")

        if team_id != m.team_a_id and team_id != m.team_b_id:
            raise ValueError("This team does not participate in this match.")

        State = model.MatchSchedulingState
        match m.match_time_state:
            case State.FIXED | State.BOTH_CONFIRMED:
                raise ValueError("The match time has been fixed, no more editing!")
            case State.OPEN_FOR_SUGGESTIONS:
                m.match_time = match_time
                if team_id == m.team_a_id:
                    m.match_time_state = State.A_CONFIRMED
                else:
                    m.match_time_state = State.B_CONFIRMED
            case State.A_CONFIRMED | State.B_CONFIRMED:
                if m.match_time == match_time:
                    # confirmation?
                    if (m.match_time_state == State.A_CONFIRMED and team_id == m.team_b_id) or \
                       (m.match_time_state == State.B_CONFIRMED and team_id == m.team_a_id):
                        m.match_time_state = State.BOTH_CONFIRMED
                    else:
                        # .. it was just a repeat, a duplicate - whatever.
                        pass
                else:
                    # whoops, change of mind or refusal
                    if (m.match_time_state == State.A_CONFIRMED and team_id == m.team_b_id) or \
                       (m.match_time_state == State.B_CONFIRMED and team_id == m.team_a_id):
                        # rejection -- take the new suggestion and toggle the confirmation info
                        m.match_time = match_time
                        m.match_time_state = State.A_CONFIRMED if m.match_time_state == State.B_CONFIRMED else State.B_CONFIRMED
                    else:
                        # change of mind.
                        # TODO: People make mistakes, so change of mind is fine.
                        #       But people are also abusive fucks and spam things if they think they get an advantage.
                        #       ... forbid "change of mind", let them commit? .. yeah. Admin can always change.
                        raise auth.PermissionDenied("Nope, you committed to this. No takesies backsies!")
            case _:
                raise ValueError("Invalid state")

        # after updating the schedule, maybe the match data are now complete and we transition from panning to active?
        __auto_update_match_state(m)
        m.save()


@validate_call
@auth.requires_admin()
@audit.log_call('{match_id}: winner {winner_id} result {result}')
async def set_result(match_id: int, winner_id: int, result: model.MatchCapScore, author: auth.User) -> None:
    """set a fixed match result which cannot be changed by team managers"""
    with model.db_proxy.atomic() as txn:
        m = model.Match.get_by_id(match_id)

        # only allow to set a result if the match has all the details and is thus either
        # active or completed (when making a correction of a previously submitted result)
        if m.state not in (model.MatchState.ACTIVE, model.MatchState.COMPLETED):
            raise ValueError("The match is in an invalid state for submitting a result. Any match-details missing?")


        if not winner_id in (m.team_a_id, m.team_b_id):
            raise ValueError("Selected team did not participate in this match.")

        m.winner = winner_id
        m.winner_caps = result
        m.result_state = model.MatchResultState.FIXED
        m.state = model.MatchState.COMPLETED
        m.save()


@validate_call
@auth.requires_admin()
@audit.log_call('{match_id}')
async def reset_result(match_id: int, author: auth.User) -> None:
    """resets the result of a match"""
    with model.db_proxy.atomic() as txn:
        m = model.Match.get_by_id(match_id)

        m.winner = None
        m.winner_caps = None
        m.result_state = model.MatchResultState.WAITING

        State = model.MatchState
        match m.state:
            case State.DRAFT | State.PLANNING | State.ACTIVE | State.CANCELLED:
                pass  # no state change needed
            case State.COMPLETED:
                # we only accept result submissions if the match state is ACTIVE, i.e. has all info.
                # so we can safely drop back to ACTIVE as well, no need to check for "planning"
                m.state = State.ACTIVE
            case _:
                raise ValueError("invalid state")
        m.save()


@validate_call
@auth.requires_admin()
@audit.log_call('{match_id}')
async def delete_match(match_id: int, author: auth.User) -> None:
    """deletes a match -- might affect other stuff, e.g. predictions"""
    model.Match.delete_by_id(match_id)
