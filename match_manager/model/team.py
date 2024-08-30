"""representation of data revolving around teams"""
# pylint: disable=missing-class-docstring,too-few-public-methods

import peewee as pw

db_proxy = pw.DatabaseProxy()


class Team(pw.Model):
    class Meta:
        database = db_proxy

    name = pw.CharField()
    description = pw.TextField(null=True)

class TeamManager(pw.Model):
    class Meta:
        database = db_proxy

    discord_user_id = pw.BigIntegerField()
    team = pw.ForeignKeyField(Team, on_delete='CASCADE', backref='managers')
