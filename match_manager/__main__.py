"""main entry point"""
# pylint: disable=wrong-import-position

import asyncio
import logging
logging.basicConfig(level=logging.DEBUG)

import os

import peewee as pw
import peeweedbevolve  # pylint: disable=unused-import

from . import model

def connect_database():
    """establish the connection to the postgresql database"""
    database = pw.PostgresqlDatabase(
        database=os.getenv('POSTGRES_DB'),
        user=os.getenv('POSTGRES_USER'),
        password=os.getenv('POSTGRES_PASSWORD'),
        host='database',
        port=5432,
        connect_timeout=2,
    )

    model.team.db_proxy.initialize(database)

    database.connect()
    database.evolve()


def main():
    """configure and start the application"""
    # import custom modules late, to ensure logging has been configured
    # pylint: disable=import-outside-toplevel
    from . import web

    logger = logging.getLogger(__name__)
    loop = asyncio.new_event_loop()

    connect_database()

    # start discord bot: bot_task = loop.create_task(bot.start(...))

    logger.info('starting webserver')
    web.app.run(loop=loop, host='0.0.0.0', port=5000)


if __name__ == '__main__':
    main()
