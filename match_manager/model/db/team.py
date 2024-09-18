"""
The raw team database models, without logic
"""

import peewee as pw

from ._proxy import db_proxy


class Team(pw.Model):
    class Meta:
        database = db_proxy

    name = pw.CharField()
    tag = pw.CharField()
    description = pw.TextField(default="")
    logo_filename = pw.CharField(null=True)

class TeamManager(pw.Model):
    class Meta:
        database = db_proxy

    discord_user_id = pw.CharField()
    team = pw.ForeignKeyField(Team, on_delete='CASCADE', backref='managers', index=True)
