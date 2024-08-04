"""everything for the web application"""

import os

from quart import Quart, url_for


from .. import config
from .api import login

app = Quart(__name__)
app.secret_key = config.webserver.secret
app.config['DISCORD_CLIENT_ID'] = config.discord.client_id
app.config['DISCORD_CLIENT_SECRET'] = config.discord.client_secret
app.config['DISCORD_BOT_TOKEN'] = config.discord.bot_token
app.config['DISCORD_REDIRECT_URI'] = \
    f'http://{config.webserver.host}:{config.webserver.port}/discord-oauth-callback'

if config.webserver.host == 'localhost':
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

app.register_blueprint(login.blue)

@app.route('/')
async def index():
    """the initial landing page"""
    return f'hello. please login: <br> <a href="{url_for("login.login")}">with discord</a>'
