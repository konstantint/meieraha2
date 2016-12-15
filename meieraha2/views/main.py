# -*- coding: UTF-8 -*-
"""
Meieraha 2: Main views

Copyright 2015, Konstantin Tretyakov
License: MIT
"""
from collections import namedtuple
from datetime import datetime
import json
from flask import Blueprint, render_template, session, jsonify, Response, redirect, url_for, request, current_app
from werkzeug.exceptions import abort
from sqlalchemy import desc
import meieraha2
from meieraha2.model import db, Dataset, MeieRahaVisualization, ConfigParameter, SavedVisualization, DisqusCommentStat
from meieraha2.i18n import get_locale
blueprint = Blueprint('main', __name__, url_prefix='')


# ----------------------------------- Utility code ------------------------------------- #
Visualization = namedtuple('Visualization', ['id', 'title', 'metadata'])


def get_localized(d, key):
    '''If key_lang is present in d, returns that, otherwise returns d[key]'''
    lkey = key + '_' + get_locale()
    return d.get(lkey, d[key])


def load_visualizations():
    res = []
    for v in db.session.query(MeieRahaVisualization).all():
        meta = json.loads(v.meta_data)
        res.append(Visualization(v.id, get_localized(meta, 'title'), meta))
    return res


# ----------------------------------- Views ------------------------------------- #
@blueprint.route('/')
def index():
    id = int(db.session.query(ConfigParameter).get('DEFAULT_VISUALIZATION_ID').value)
    return redirect(url_for('main.view', id=id))

@blueprint.route('/view/<int:id>')
def view(id):
    vs = load_visualizations()
    vis = [v for v in vs if v.id == id]
    if len(vis) == 0:
        abort(404)
    else:
        vis = vis[0]
    vs = [v for v in vs if not v.metadata.get('hide', False)]

    # Load infopanel text
    info_text = db.session.query(ConfigParameter).get('INFO_' + get_locale())
    if info_text is None:
        info_text = db.session.query(ConfigParameter).get('INFO')
        if info_text is None:
            info_text = ''
        else:
            info_text = info_text.value
    else:
        info_text = info_text.value

    # Load discussion count
    discussion_count = db.session.query(DisqusCommentStat).filter_by(visualization_id=id).count();
    return render_template('index.html', vis=vis, visualizations=vs, info_text=info_text, discussion_count=discussion_count)


@blueprint.route('/set_lang/<lang>')
def set_lang(lang):
    if len(lang) != 2:
        if 'lang' in session:
            del session['lang']
    else:
        session['lang'] = lang
    return redirect(request.args.get('prev', url_for('main.index')))


@blueprint.route('/dataset/<int:id>')
def dataset(id):
    ds = db.session.query(Dataset).get(id)
    return Response(response=ds.data, status=200, mimetype="application/json; charset=UTF-8")


@blueprint.route('/visualization/<int:id>')
def visualization(id):
    if request.args.get('s', '') != '':
        # Load a saved visualization state with state id s
        ds = db.session.query(SavedVisualization).get(int(request.args['s']))
        if (ds.visualization_id != id):
            abort(404)
        else:
            return Response(response=ds.data, status=200, mimetype="application/json; charset=UTF-8")
    else:
        # Load a visualization initial
        ds = db.session.query(MeieRahaVisualization).get(id)
        data = {'left': json.loads(ds.left_pane.data),
                'right': json.loads(ds.right_pane.data),
                'comparison': json.loads(ds.comparison_pane.data),
                'meta': json.loads(ds.meta_data),
                'id': id
                }
    return jsonify(data)


@blueprint.route('/save_visualization/<int:id>', methods=('POST',))
def save_visualization(id):
    if len(request.get_data()) > 500000:    # That's obviously too much
        abort(500)
    sv = SavedVisualization(visualization_id=id, data=unicode(request.get_data(), 'utf-8'))
    db.session.add(sv)
    db.session.commit()
    return jsonify({'vis_id': id,
                    'state_id': sv.id,
                    'share_url': current_app.config['BASE_URL'] + url_for('main.view', id=id) + '?s=%d' % sv.id})

# ----------------------------------- Comment tracking & discussion list ------------------------------------- #

@blueprint.route('/discussion_list/<int:vis_id>')
def discussion_list(vis_id):
    stats = db.session.query(DisqusCommentStat).filter_by(visualization_id=vis_id).order_by(desc(DisqusCommentStat.last_comment_time)).all()
    # Split into "Incomes", "Expenditures" and "Comparison" threads
    incomes, expenditures, comparisons = [], [], []
    for s in stats:
        v = (s.thread_id, s.comment_count, s.last_comment_time.strftime("%d.%m.%Y %H:%m"))
        if 'left' in s.thread_id:
            incomes.append(v)
        elif 'right' in s.thread_id:
            expenditures.append(v)
        else:
            comparisons.append(v)
    data = dict(total=len(stats), incomes=incomes, expenditures=expenditures, comparisons=comparisons)
    return jsonify(data)


@blueprint.route('/report_comment/<thread_id>')
def report_comment(thread_id):
    if len(thread_id) > 1000:
        return
    vis_id, role, bubble_id = thread_id.split('|')
    vis_id = int(vis_id)
    c = db.session.query(DisqusCommentStat).get((vis_id, thread_id))
    if c is None:
        c = DisqusCommentStat(visualization_id=vis_id,
                              thread_id=thread_id,
                              last_comment_time=datetime.now(),
                              comment_count = 0)
        db.session.add(c)
    c.comment_count = c.comment_count + 1
    db.session.commit()
    return 'OK'

# ----------------------------------- Templates ------------------------------------- #
@blueprint.context_processor
def inject_lang_and_version():
    lang = get_locale()
    lang_name = [n for i, n in current_app.config['LANGS'] if i == lang][0]
    return dict(lang=lang, lang_name=lang_name, version=meieraha2.__version__)
