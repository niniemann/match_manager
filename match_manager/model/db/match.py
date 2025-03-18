import enum
from enum import auto

import peewee as pw

from ._proxy import db_proxy
from . import team, map as game_map, season
from .db_utils import EnumField, AutoNameEnum

@enum.unique
class Faction(AutoNameEnum):
    """
    We only differ between allies and axis forces.
    Displaying the correct nation is a responsibility of the UI.

    NOTE: The faction & match stuff is built upon the assumption that there are
          exactly 2 factions. Don't try to extend this.
    """
    ALLIES = auto()  # enums are stored by the names, no point in checking the values
    AXIS = auto()


@enum.unique
class MatchCapScore(enum.Enum):
    """
    Winner is stored separately, no need for symmetry here.
    Integer value of the enum entries correspond to the caps held by the winner.
    """
    WIN_5_0 = 5
    WIN_4_1 = 4
    WIN_3_2 = 3


@enum.unique
class MatchState(AutoNameEnum):
    """The state of the match/match-planning. May influence allowed actions and presentation."""
    DRAFT = auto()       # not intended to be acted upon, yet (not even for team managers to schedule a date etc.)
    PLANNING = auto()    # details to be defined -- e.g. map, date & time
    ACTIVE = auto()      # waiting for the match to take place and the result to be recorded
    COMPLETED = auto()   # match has been fought, and the result been recorded
    CANCELLED = auto()   # match has been cancelled -- may or may not have a score attached to count in stats


@enum.unique
class MatchSchedulingState(AutoNameEnum):
    """The state of the match date/time scheduling."""
    FIXED = auto()                  # date/time has been fixed by an admin
    OPEN_FOR_SUGGESTIONS = auto()   # team managers may propose a day & time -- no date/time suggested, yet
    A_CONFIRMED = auto()            # current entry was confirmed by team_a
    B_CONFIRMED = auto()            # current entry was confirmed by team_b
    BOTH_CONFIRMED = auto()         # date/time has been confirmed by both teams


@enum.unique
class MapSelectionMode(AutoNameEnum):
    """How the map (and faction) to play will be determined."""
    FIXED = auto()                  # map and faction fixed by admin
    BAN_MAP_FIXED_FACTION = auto()  # map will be banned, faction fixed by admin
    BAN_MAP_AND_FACTION = auto()    # map and faction will be banned



class Match(pw.Model):
    class Meta:
        database = db_proxy

    id: int  # make pylance happy.

    # matches belong to a specific match-group/division and are thus part of a season
    group = pw.ForeignKeyField(season.MatchGroup, backref='matches')

    # the two opponents, mandatory fields -- no point in having a match instance without oppents, right?
    team_a = pw.ForeignKeyField(team.Team)
    team_b = pw.ForeignKeyField(team.Team)

    # the date/time of the match, and the current state of the scheduling
    match_time = pw.TimestampField(utc=True, null=True, default=None)
    match_time_state = EnumField(MatchSchedulingState, default=MatchSchedulingState.FIXED)

    # the map and faction being played
    game_map = pw.ForeignKeyField(game_map.Map, null=True)
    team_a_faction = EnumField(Faction, null=True)  # team_b_faction is implicit
    map_selection_mode = EnumField(MapSelectionMode, default=MapSelectionMode.FIXED)

    # the winning team and how they scored
    winner = pw.ForeignKeyField(team.Team, null=True)
    winner_caps = EnumField(MatchCapScore, null=True)

    # the overall state of this match,
    state = EnumField(MatchState, default=MatchState.DRAFT)

    # TODO: midcap? -> add as info to a map, and index here, or copy value?
