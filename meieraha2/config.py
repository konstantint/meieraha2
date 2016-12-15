# -*- coding: UTF-8 -*-
"""
Meieraha 2: Config module

Copyright 2015, Konstantin Tretyakov
License: MIT
"""
import logging, os
from flask.ext.babel import lazy_gettext
log = logging.getLogger('meieraha2.config')


def init_app(app):
    '''
    Configuration initialization logic.
    The default values are first loaded from config.Config.
    Those are then overridden with the values stored in the file pointed by the $CONFIG environment variable.

    For testing, set os.environ['CONFIG'] to 'meieraha2.config.TestConfig' before calling create_app.
    '''

    # First load the default values
    app.config.from_object('meieraha2.config.Config')

    # Then override with ${CONFIG}, if specified
    if 'CONFIG' in os.environ:
        log.debug('Loading settings from %s' % os.environ['CONFIG'])
        try:
            # Assume CONFIG is a name of a class
            app.config.from_object(os.environ['CONFIG'])
        except:
            # No, perhaps it's a filename then?
            app.config.from_envvar('CONFIG')


class Config(object):
    DEBUG = False
    ASSETS_DEBUG = False
    ASSETS_AUTO_BUILD = False
    SQLALCHEMY_ECHO = False
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    DEBUG_SERVER_HOST = '0.0.0.0'
    DEBUG_SERVER_PORT = 5000

    # Database connection: default is to use a db.sqlite file in the package root.
    SQLALCHEMY_DATABASE_URI = 'sqlite:///%s' % os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'db.sqlite')

    # Secret key for session authentication.
    # Make sure to set it to something different than the default in your local config
    SECRET_KEY = "<set this to something properly secret>"

    # See assets.py
    COMPASS_CONFIG = {'images_dir': 'img',
                      'http_images_dir': 'img',
                      'output_style': ':compressed'} # :expanded or :nested or :compact or :compressed

    # Visuals
    SKIN = "estonia"    # Has to be either "gyumri" or "estonia" - influences some visuals and menu items.
    TITLE = lazy_gettext("Our Money")
    LANGS = [ ('en', 'English'), ('et', 'Eesti'), ('hy', u'հայերեն')]
    DEFAULT_LANG = 'en'
    INFOPANEL_BUTTON_TEXT = lazy_gettext("Info")            # In Armenian setup this is "Info and polls"
    REVISION_SLIDER_TEXT = lazy_gettext("Budget revisions") # For multiyear setup this may be different

    # This should be the official URL of the service - the "share view" links will use this as a prefix. No slash at the end.
    # This is also used as the root of DISQUS urls
    BASE_URL = 'http://meieraha.ee'
    SHARE_MESSAGE = lazy_gettext('Our Money')  # This is used in the "Share" buttons as the accompanying message

    # DISQUS integration
    DISQUS_SHORTNAME = 'meieraha'

    # Google Analytics ID, when empty GA is not used.
    GA_ID = ''

    # Extra HTML in the head (before the closing head tag)
    EXTRA_HTML_HEAD = ''

    # Extra HTML in the body (before the closing body tag)
    EXTRA_HTML_BODY = ''


class DevConfig(Config):
    DEBUG = True
    ASSETS_DEBUG = True
    ASSETS_AUTO_BUILD = True
    SQLALCHEMY_ECHO = False
    DEBUG_SERVER_HOST = '0.0.0.0'
    DEBUG_SERVER_PORT = 5000
    COMPASS_CONFIG = {'images_dir': 'img',
                      'http_images_dir': 'img',
                      'output_style': ':expanded'}
    BASE_URL = 'http://localhost:5000'
    GA_ID = ''

class TestConfig(Config):
    DEBUG = False
    ASSETS_DEBUG = False
    SQLALCHEMY_ECHO = False
    DEBUG_SERVER_HOST = '0.0.0.0'
    DEBUG_SERVER_PORT = 5001
    SQLALCHEMY_DATABASE_URI = 'sqlite://'  # In-memory database
    SECRET_KEY = "does not matter"
    WTF_CSRF_ENABLED = False  # Allows form testing
