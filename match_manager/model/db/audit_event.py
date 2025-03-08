"""
The raw audit log database models, without logic
"""

import peewee as pw

from ._proxy import db_proxy


class AuditEvent(pw.Model):
    class Meta:
        database = db_proxy

    author = pw.CharField()  # the discord user id of the author of the event
    # TODO: Should we log the users name as well? Might be useful if a user leaves the discord?

    timestamp = pw.TimestampField(utc=True)  # time of audit-event-creation
    event_type = pw.CharField()  # a short type/name of the event
    event_description = pw.TextField()  # a detailed description of the event
