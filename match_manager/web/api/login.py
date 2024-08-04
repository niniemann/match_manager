from quart import Blueprint

blue = Blueprint('login', __name__)

@blue.route('/login')
async def login():
    return 'login ' * 15
