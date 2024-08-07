"""loads configuration data"""

import logging
import tomllib
from dataclasses import dataclass

import cerberus

logger = logging.getLogger(__name__)

@dataclass
class Environment:
    """general environment configuration"""
    developer_mode: bool  # in developer mode, some relaxations are made, e.g. allowing http in oauth

@dataclass
class Webserver:
    """webserver configuration"""
    secret: bytes  # secret key for the webserver

@dataclass
class Discord:
    """discord related configuration"""
    client_id: int
    client_secret: str
    bot_token: str

# a schema to validate the values before constructing the dataclass instances
schema = {
    'environment' : {
        'type': 'dict',
        'schema': {
            'developer_mode': { 'type': 'boolean' },
        },
    },
    'webserver' : {
        'type': 'dict',
        'schema': {
            'secret': { 'type': 'string' },
        },
    },
    'discord' : {
        'type': 'dict',
        'schema': {
            'client_id': { 'type': 'integer' },
            'client_secret': { 'type': 'string' },
            'bot_token': { 'type': 'string' },
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

environment = Environment(**config['environment'])
webserver = Webserver(**config['webserver'])
discord = Discord(**config['discord'])
