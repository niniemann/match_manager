"""login with discord (oauth)"""
import logging
from functools import wraps
from http import HTTPStatus

from async_oauthlib import OAuth2Session
from oauthlib.oauth2 import OAuth2Error
from quart import Blueprint, redirect, request, session, url_for

from match_manager import config

blue = Blueprint('login', __name__)

logger = logging.getLogger(__name__)

AUTHORIZATION_BASE_URL = 'https://discord.com/oauth2/authorize'
FETCH_TOKEN_URL='https://discord.com/api/oauth2/token'


def requires_login(*, redirect_on_failure: bool):
    """
    Route-decorator to require a login. Does not check for special roles/permissions.

    @param redirect_on_failure: If true, redirects to the login page (-> discord); otherwise returns a 401
    """
    def _requires_login(f):
        @wraps(f)
        async def __requires_login(*args, **kwargs):
            if 'discord_user_data' in session:
                return await f(*args, **kwargs)

            if redirect_on_failure:
                return redirect(url_for('.login'))
            return 'login required', HTTPStatus.UNAUTHORIZED

        return __requires_login
    return _requires_login



@blue.route('/login')
async def login():
    """redirect to discord for login"""
    async with OAuth2Session(config.discord.client_id, scope=['identify']) as discord:
        auth_url, state = discord.authorization_url(AUTHORIZATION_BASE_URL)

    logger.debug('redirecting to discord for login')
    logger.debug('original referrer: %s', request.referrer)
    session['oauth_state'] = state
    session['login-referrer'] = request.referrer  # remember where we come from, to redirect back after login
    return redirect(auth_url)


@blue.route('/discord-oauth-callback')
async def callback():
    """get token info from discord and identify the user"""
    async with OAuth2Session(config.discord.client_id,
                             state=session['oauth_state'],
                             scope=['identify']) as discord:

        try:
            # fetch the token
            token = await discord.fetch_token(
                FETCH_TOKEN_URL,
                client_secret=config.discord.client_secret,
                authorization_response=request.url
            )
        except OAuth2Error as e:
            logger.info('user auth failed: %s', e)
             # back to start! (avoid loops if the referrer was a protected resource)
            return redirect('/')

        # use its information to get user-info
        # -- OAuth2Session doesn't set the token auth header! :(
        discord.headers['authorization'] = f"Bearer {token['access_token']}"
        data = await (await discord.get('https://discord.com/api/users/@me')).json()

        # store the token and the discord user data in the session
        # -- technically, the id would suffice, but maybe we want some localization later?
        # or show the users avatar on the website when logged in?
        session['oauth_token'] = token
        session['discord_user_data'] = data
        logger.debug(('user logged in', data))

    if 'login-referrer' in session:
        ref = session['login-referrer']
        logger.debug('after login, refer back to referrer %s', ref)

        del session['login-referrer']
        return redirect(ref)

    logger.debug('after login, but no referrer stored -- back to home')
    return redirect('/')


@blue.route('/logout')
async def logout():
    """just remove the user info from the session, and redirect back"""
    if 'discord_user_data' in session:
        logger.info(('logout', session['discord_user_data']))
        del session['discord_user_data']

    if request.referrer:
        return redirect(request.referrer)
    return redirect('/')

@blue.route('/api/current-user')
async def current_user():
    """returns information about the currently logged in user"""
    if 'discord_user_data' in session:
        return session['discord_user_data']

    # just an empty dict if not logged in
    return {}
