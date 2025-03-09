"""
The raw database model to represent a map. No logic.
"""

import peewee as pw

from ._proxy import db_proxy

class Map(pw.Model):
    class Meta:
        database = db_proxy

    short_name = pw.CharField()
    full_name = pw.CharField()
    image_filename: str | None = pw.CharField(null=True) # type: ignore
