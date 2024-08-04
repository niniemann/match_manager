"""loads configuration data"""

import logging
import tomllib
from dataclasses import dataclass

import cerberus

logger = logging.getLogger(__name__)

@dataclass
class Webserver:
    """webserver configuration"""
    host: str  # name/ip, e.g. localhost or 0.0.0.0
    port: int  # port, e.g. 5000 or 8080
    secret: bytes  # secret key for the webserver


# a schema to validate the values before constructing the dataclass instances
schema = {
    'webserver' : {
        'type': 'dict',
        'schema': {
            'host': { 'type': 'string' },
            'port': { 'type': 'integer', 'min': 1024, 'max': 49151 },
            'secret': { 'type': 'string' },
        },
    },
}

validator = cerberus.Validator(schema, require_all=True)

logger.info('loading config')
with open('config.toml', 'rb') as f:
    config = tomllib.load(f)

if not validator.validate(config):
    logger.error('invalid config')
    logger.error(validator.errors)
    raise ValueError(validator.errors)


logger.info('loaded config')
logger.info(config)

webserver = Webserver(**config['webserver'])
