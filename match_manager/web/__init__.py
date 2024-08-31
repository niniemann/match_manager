"""everything for the web application"""

import os
from http import HTTPStatus

from quart import Quart, url_for, render_template, send_file, jsonify
from quart_cors import cors
from quart_schema import QuartSchema, hide, RequestSchemaValidationError, ResponseSchemaValidationError
from pydantic import ValidationError

from .. import config
from .api import login, team

from match_manager.model import auth

# serve the react application, built with `npm run build` in `client/`, as static files
app = Quart(__name__, static_url_path='/', static_folder='client/build')
app = cors(app)
QuartSchema(app, swagger_ui_path='/api/docs')

@app.errorhandler(RequestSchemaValidationError)
async def handle_request_validation_error(error: RequestSchemaValidationError):
    val_err: ValidationError = error.validation_error
    return {
        "title": f'{error.code}: ValidationError',
        "errors": val_err.errors(),
    }, HTTPStatus.BAD_REQUEST

@app.errorhandler(ResponseSchemaValidationError)
async def handle_response_validation_error(error: ResponseSchemaValidationError):
    val_err: ValidationError = error.validation_error
    return {
        "title": f'{error.code}: ResponseError (Woops! Internal!)',
        "errors": val_err.errors(),
    }, HTTPStatus.INTERNAL_SERVER_ERROR

@app.errorhandler(auth.PermissionDenied)
async def handle_permission_denied(error: auth.PermissionDenied):
    return {
        "title": "Permission Denied",
        "errors": [
            {
                "msg": str(error)
            }
        ]
    }, HTTPStatus.UNAUTHORIZED


# configure secrets for oauth2 -- login with discord
app.secret_key = config.webserver.secret
app.config['DISCORD_CLIENT_ID'] = config.discord.client_id
app.config['DISCORD_CLIENT_SECRET'] = config.discord.client_secret
app.config['DISCORD_BOT_TOKEN'] = config.discord.bot_token
#app.config['DISCORD_REDIRECT_URI'] = \
#    f'http://{config.webserver.host}:{config.webserver.port}/discord-oauth-callback'

if config.environment.developer_mode:
    # for local development, allow insecure transport (no https configured)
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

    # also, generally allow cross-site-requests from localhost:3000, which is the react app running in node
    # (instead of being served by quart)
    app.config['QUART_CORS_ALLOW_ORIGIN'] = { 'http://localhost:3000' }
    app.config['QUART_CORS_ALLOW_CREDENTIALS'] = True

# register the different routes from their blueprints
app.register_blueprint(login.blue)
app.register_blueprint(team.blue)

# The react app does client-side routing for different component pages.
# This works fine when starting from the index page '/', as the react router will catch links to
# '/teams', '/scoreboard', and the like, and not issue a call to the webserver for this.
# However, when loading (e.g. bookmarking) those links, the initial request to the webserver would result in a 404,
# as no static file '/teams' etc exist. To handle this, register routes that just lead to the react app (index.html)

@app.route('/')
@app.route('/teams')
@app.route('/rules')
@app.route('/admin/all-teams')
@hide
async def react_app():
    """just let the react app handle these routes on the client side"""
    return await app.send_static_file('index.html')
