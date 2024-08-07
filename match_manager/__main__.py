"""main entry point"""

import asyncio
import logging
logging.basicConfig(level=logging.DEBUG)

def main():
    """configure and start the application"""
    # import custom modules late, to ensure logging has been configured
    # pylint: disable=import-outside-toplevel
    from . import web

    logger = logging.getLogger(__name__)
    loop = asyncio.new_event_loop()

    # start discord bot: bot_task = loop.create_task(bot.start(...))

    logger.info('starting webserver')
    web.app.run(loop=loop, host='0.0.0.0', port=5000)


if __name__ == '__main__':
    main()
