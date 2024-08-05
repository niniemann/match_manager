"""everything for the web application"""

import os

from quart import Quart, url_for, render_template


from .. import config
from .api import login

# serve the react application, built with `npm run build` in `client/`, as static files
app = Quart(__name__, static_url_path='', static_folder='client/build')

# configure secrets for oauth2 -- login with discord
app.secret_key = config.webserver.secret
app.config['DISCORD_CLIENT_ID'] = config.discord.client_id
app.config['DISCORD_CLIENT_SECRET'] = config.discord.client_secret
app.config['DISCORD_BOT_TOKEN'] = config.discord.bot_token
app.config['DISCORD_REDIRECT_URI'] = \
    f'http://{config.webserver.host}:{config.webserver.port}/discord-oauth-callback'

# for local development, allow insecure transport (no https configured)
if config.webserver.host == 'localhost':
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

# register the different routes from their blueprints
app.register_blueprint(login.blue)

@app.route('/')
async def index():
    """the initial landing page"""
    return await app.send_static_file('index.html')
