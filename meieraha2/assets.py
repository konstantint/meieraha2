# -*- coding: UTF-8 -*-
"""
Meieraha 2: Flask-Assets integration

See: http://flask-assets.readthedocs.org/

Copyright 2015, Konstantin Tretyakov
License: MIT
"""
from flask_assets import Bundle, Environment


css_main = Bundle(
    "libs/normalize.css/normalize.css",
    "css/BubbleVisualization.css",
    "css/main.css",
    filters="cssmin",
    output="public/css/main.css"
)

# At the moment the difference in CSS between "Estonia" installation and "Gyumri" are
# only due to the font files that are used.
css_skin_estonia = Bundle(
    "css/meierahaicons-estonia.css",
    filters="cssmin",
    output="public/css/skin-estonia.css"
)

css_skin_gyumri = Bundle(
    "css/meierahaicons-gyumri.css",
    filters="cssmin",
    output="public/css/skin-gyumri.css"
)

# The "head" part of JS will be loaded in the head,
# the "main" part - at the end of the body tag.
js_head = Bundle(
    "libs/jQuery/dist/jquery.min.js",
    filters="jsmin",
    output="public/js/head.js"
)

js_main = Bundle(
    "libs/nouislider/distribute/jquery.nouislider.min.js",
    "libs/d3/d3.min.js",
    "js/Localization.js",
    "js/BubbleUtil.js",
    "js/BubbleLayout.js",
    "js/BubbleLayout.js",
    "js/BubbleDataMapper.js",
    "js/BubbleVisualization.js",
    "js/BubbleTooltip.js",
    "js/BubbleDisqusUtil.js",
    "js/MeieRahaVisualization.js",
    "js/BackendConnector.js",
    "js/IndexPage.js",
    filters="jsmin",
    output="public/js/main.js"
)

js_html5shiv = Bundle(
    "libs/html5shiv/dist/html5shiv.min.js",
    output="public/js/html5shiv.min.js"
)

scss_admin = Bundle(
    "sass/admin.scss",
    filters="compass",
    output="public/css/admin.css"
)

css_codemirror = Bundle(
    "libs/codemirror/lib/codemirror.css",
    filters='cssmin',
    output="public/css/codemirror.css"
)

js_codemirror = Bundle(
    "libs/codemirror/lib/codemirror.js",
    "libs/codemirror/mode/javascript/javascript.js",
    filters='jsmin',
    output="public/js/codemirror.js"
)

js_tinymce = Bundle(
    "libs/tinymce/tinymce.min.js",
    output="libs/tinymce/tinymce.min.js"
)

assets = Environment()
assets.register("js_head", js_head)
assets.register("js_main", js_main)
assets.register("js_html5shiv", js_html5shiv)
assets.register("css_main", css_main)
assets.register("css_skin_estonia", css_skin_estonia)
assets.register("css_skin_gyumri", css_skin_gyumri)
assets.register("scss_admin", scss_admin)
assets.register("js_codemirror", js_codemirror)
assets.register("js_tinymce", js_tinymce)
assets.register("css_codemirror", css_codemirror)

def init_app(app):
    assets.init_app(app)