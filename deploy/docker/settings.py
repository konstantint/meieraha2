# -*- coding: utf-8 -*-
import os
from flask.ext.babel import lazy_gettext

DEBUG = False
SQLALCHEMY_ECHO = False
DEBUG_SERVER_HOST = '0.0.0.0'
DEBUG_SERVER_PORT = 5000

# Database connection: default is to use a db.sqlite file in the package root.
SQLALCHEMY_DATABASE_URI = 'sqlite:////meieraha/db.sqlite'

# Secret key for session authentication.
SECRET_KEY = "This must be changed to random stuff"

# Visuals
TITLE = lazy_gettext("Our Money")
LANGS = [ ('en', 'English'), ('et', 'Eesti') ]
DEFAULT_LANG = 'en'

# This should be the official URL of the service - the "share view" links will use this as a prefix. No slash at the end.
# This is also used as the root of DISQUS urls
BASE_URL = 'http://localhost:5000'
SHARE_MESSAGE = lazy_gettext('Our Money')  # This is used in the "Share" buttons as the accompanying message

# If you want to mount the application to a non-root URL, enable this setting (and set BASE_URL appropriately as well!)
APPLICATION_ROOT = ''

# DISQUS integration
DISQUS_SHORTNAME = ''

# Google Analytics ID, when empty GA is not used.
GA_ID = ''

# Extra HTML in the head (before the closing head tag)
EXTRA_HTML_HEAD = ''

# Extra HTML in the body (before the closing body tag)
EXTRA_HTML_BODY = ''
