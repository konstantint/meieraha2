# -*- coding: UTF-8 -*-
"""
Meieraha 2: functional web tests

See http://webtest.readthedocs.org/

Copyright 2015, Konstantin Tretyakov
License: MIT
"""


def test_smoke(testapp):
    # Not logged in initially
    res = testapp.get("/").follow()
    assert res.statuscode == 200
