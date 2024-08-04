"""login with discord (oauth)"""
import logging
from quart import Blueprint, redirect, session, request, url_for
from quart.json import jsonify
from async_oauthlib import OAuth2Session

from match_manager import config

blue = Blueprint('login', __name__)

logger = logging.getLogger(__name__)

authorization_base_url='https://discord.com/oauth2/authorize'
token_url='https://discord.com/api/oauth2/token'


@blue.route('/login')
async def login():
    """redirect to discord for login"""
    async with OAuth2Session(config.discord.client_id, scope=['identify']) as discord:
        auth_url, state = discord.authorization_url(authorization_base_url)

    logger.info('redirecting to discord for login')
    session['oauth_state'] = state
    return redirect(auth_url)


@blue.route('/discord-oauth-callback')
async def callback():
    """get token info from discord"""
    async with OAuth2Session(config.discord.client_id,
                             state=session['oauth_state'],
                             scope=['identify']) as discord:
        token = await discord.fetch_token(
            token_url,
            client_secret=config.discord.client_secret,
            authorization_response=request.url
        )

    logger.info(token)
    session['oauth_token'] = token
    return redirect(url_for('.profile'))


@blue.route('/profile')
async def profile():
    """dummy page, depending on user login"""
    logger.info("loading profile, with token")
    logger.info(session['oauth_token'])

    async with OAuth2Session(config.discord.client_id, token=session['oauth_token']) as discord:
        logger.info('auth: %s', discord.authorized)
        logger.info('headers: %s', discord.headers)

        # OAuth2Session doesn't set the token auth header! :(
        discord.headers['authorization'] = f"Bearer {session['oauth_token']['access_token']}"

        data = await (await discord.get('https://discord.com/api/users/@me')).json()
        logger.info(data)
    return jsonify(data)
