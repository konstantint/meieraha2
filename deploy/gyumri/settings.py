# -*- coding: utf-8 -*-
import os
from flask.ext.babel import lazy_gettext

DEBUG = False
SQLALCHEMY_ECHO = False
DEBUG_SERVER_HOST = '0.0.0.0'
DEBUG_SERVER_PORT = 5000

# Database connection: default is to use a db.sqlite file in the package root.
SQLALCHEMY_DATABASE_URI = 'sqlite:///%s' % os.path.join(os.path.dirname(os.path.abspath(__file__)), 'db.sqlite')

# Secret key for session authentication.
SECRET_KEY = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'secret_key'), 'rb').read()

# Visuals
SKIN = 'gyumri'
TITLE = lazy_gettext("Our Money")  # actually that's already translated, so no need to change.
DEFAULT_LANG = 'hy'
LANGS = [('hy', u'հայերեն'),('en', 'English')] 


# This should be the official URL of the service - the "share view" links will use this as a prefix. No slash at the end.
# This is also used as the root of DISQUS urls
BASE_URL = 'http://gyumribudget.am'
SHARE_MESSAGE = lazy_gettext('Our Money')  # This is used in the "Share" buttons as the accompanying message

# DISQUS integration
DISQUS_SHORTNAME = 'gyumribudget'  # You want to register your own DISQUS account and set it here


# Google Analytics ID, when empty GA is not used.
GA_ID = 'UA-68416847-1'

# Extra HTML in the head (before the closing head tag)
EXTRA_HTML_HEAD = """
<style>
/* Custom style or script commands here. */
</style>
"""

# Extra HTML in the body (before the closing body tag)
EXTRA_HTML_BODY = """
<!-- -->
"""


