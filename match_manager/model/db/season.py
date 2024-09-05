"""
Database models to manage seasons and their match-groups; these could be stages of a tournament
like "Round <N>", "Semifinals", "Finals"; or divisions of a league system.
"""

import peewee as pw
from ._proxy import db_proxy
from .team import Team


class Season(pw.Model):
    class Meta:
        database = db_proxy

    name = pw.CharField()


class MatchGroup(pw.Model):
    class Meta:
        database = db_proxy

    name = pw.CharField()
    season = pw.ForeignKeyField(Season, on_delete="CASCADE", backref="match_groups")


class TeamInGroup(pw.Model):
    """
    Many-to-many relationship between teams and the groups (potentially multiple, spanning different seasons)
    they play in.
    """
    class Meta:
        database = db_proxy

    group = pw.ForeignKeyField(MatchGroup, on_delete="CASCADE", backref="teams")
    team = pw.ForeignKeyField(Team, on_delete="CASCADE")
