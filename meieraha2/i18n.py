# -*- coding: UTF-8 -*-
"""
Meieraha 2: Flask-Babel integration

The default I18N configuration provided here is fairly useless (and harmless)
See: https://pythonhosted.org/Flask-Babel/

Copyright 2015, Konstantin Tretyakov
License: MIT
"""
from flask.ext.babel import Babel
from flask import session, current_app

def get_locale():
    return session.get('lang', current_app.config['DEFAULT_LANG'])

def init_app(app):
    babel = Babel(app)
    babel.localeselector(get_locale)
