"""main entry point"""
# pylint: disable=wrong-import-position

import asyncio
import logging
logging.basicConfig(level=logging.DEBUG)

import os

import peewee as pw
import peeweedbevolve  # pylint: disable=unused-import

# import custom modules late, to ensure logging has been configured
from . import model, config
from . import web, bot

logger = logging.getLogger(__name__)
logging.getLogger('discord').setLevel(logging.INFO)

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

    model.db.proxy.initialize(database)

    database.connect()
    database.evolve()


def main():
    """configure and start the application"""

    logger.info('connect to database..')
    connect_database()

    logger.info('start webserver and bot..')

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    loop.create_task(bot.get().start(config.discord.bot_token))
    web.app.run(loop=loop, host='0.0.0.0', port=5000)


if __name__ == '__main__':
    main()
