"""api to modify maps"""

from http import HTTPStatus
from pathlib import Path
from quart import Blueprint, send_from_directory
from quart_schema import DataSource, validate_request, validate_response


from match_manager import config
from match_manager.model import auth, map as model
from match_manager.model.map import MapResponse, NewMapData, UpdateMapData
from match_manager.model.team import UpdateTeamData
from match_manager.web.api.login import requires_login

blue = Blueprint('maps', __name__, url_prefix='/api/maps')


@blue.route('/', methods=['GET'])
@validate_response(list[MapResponse])
async def list_maps() -> list[MapResponse]:
    """list all maps"""
    return await model.get_maps()


@blue.route('/<int:map_id>', methods=['GET']) # type: ignore
@validate_response(MapResponse)
async def get_map(map_id: int) -> MapResponse:
    """returns info of a single map, by id"""
    return next(filter(lambda m: m.id == map_id, await model.get_maps()))


@blue.route('/', methods=['POST']) # type: ignore
@requires_login()
@validate_request(NewMapData, source=DataSource.FORM_MULTIPART)
@validate_response(MapResponse, HTTPStatus.CREATED)
async def create_new_map(data: NewMapData, author: auth.User) -> MapResponse:
    """create a new map"""
    return await model.create_new_map(data, author)


@blue.route('/<int:map_id>', methods=['PATCH']) # type: ignore
@requires_login()
@validate_request(UpdateMapData, source=DataSource.FORM_MULTIPART)
@validate_response(MapResponse)
async def update_map(map_id: int, data: UpdateMapData, author: auth.User) -> MapResponse:
    """create a new map"""
    return await model.update_map_data(map_id, data, author)


_map_image_folder = Path(config.webserver.upload_folder) / "map_images"

@blue.route('/image/<path:filename>')
async def get_map_image(filename: str):
    """serve files from the map image folder"""
    return await send_from_directory(_map_image_folder, filename)
