# -*- coding: UTF-8 -*-
"""
Meieraha 2: PyTest configuration

See https://pytest.org/latest/plugins.html

Copyright 2015, Konstantin Tretyakov
License: MIT
"""

import pytest, os
from webtest import TestApp

from meieraha2.app import create_app
from meieraha2 import model


@pytest.yield_fixture
def app():
    os.environ['CONFIG'] = 'meieraha2.config.TestConfig'
    app = create_app()
    model.init_db_tables(app)
    model.init_db_data(app)
    ctx = app.test_request_context()
    ctx.push()
    yield app
    ctx.pop()


@pytest.fixture
def testapp(app):
    return TestApp(app)
