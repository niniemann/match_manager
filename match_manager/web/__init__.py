"""everything for the web application"""

from quart import Quart, url_for

from .. import config
from .api import login

app = Quart(__name__)
app.secret_key = config.webserver.secret

app.register_blueprint(login.blue)

@app.route('/')
async def index():
    """the initial landing page"""
    return 'hello. please login: <br> ' + url_for('login.login')
