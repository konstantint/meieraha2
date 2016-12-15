# -*- coding: utf-8 -*-
import os
from flask.ext.babel import lazy_gettext

DEBUG = False
SQLALCHEMY_ECHO = False
DEBUG_SERVER_HOST = '0.0.0.0'
DEBUG_SERVER_PORT = 5012

# Database connection: default is to use a db.sqlite file in the package root.
SQLALCHEMY_DATABASE_URI = 'sqlite:///%s' % os.path.expanduser("~/db.sqlite")

# Secret key for session authentication.
SECRET_KEY = "Replace this with something random"

# Visuals
SKIN = 'estonia'
TITLE = lazy_gettext("Our Money")
LANGS = [('et', 'Eesti'), ('en', 'English')]
DEFAULT_LANG = 'et'
REVISION_SLIDER_TEXT = lazy_gettext("Year")

BASE_URL = 'http://meieraha.ee'
SHARE_MESSAGE = lazy_gettext('Our Money')

# DISQUS integration
DISQUS_SHORTNAME = 'meieraha'

# Google Analytics ID, when empty GA is not used.
GA_ID = ''

# Extra HTML in the head (before the closing head tag)
EXTRA_HTML_HEAD = ''

# Extra HTML in the body (before the closing body tag)
EXTRA_HTML_BODY = ''
