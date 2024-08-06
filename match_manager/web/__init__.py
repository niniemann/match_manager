"""everything for the web application"""

import os

from quart import Quart, url_for, render_template, send_file


from .. import config
from .api import login

# serve the react application, built with `npm run build` in `client/`, as static files
app = Quart(__name__, static_url_path='/', static_folder='client/build')

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

# The react app does client-side routing for different component pages.
# This works fine when starting from the index page '/', as the react router will catch links to
# '/teams', '/scoreboard', and the like, and not issue a call to the webserver for this.
# However, when loading (e.g. bookmarking) those links, the initial request to the webserver would result in a 404,
# as no static file '/teams' etc exist. To handle this, register routes that just lead to the react app (index.html)

@app.route('/')
@app.route('/teams')
@app.route('/rules')
async def react_app():
    """just let the react app handle these routes on the client side"""
    return await app.send_static_file('index.html')
