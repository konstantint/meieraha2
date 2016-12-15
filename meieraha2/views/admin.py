# -*- coding: UTF-8 -*-
"""
Meieraha 2: Flask-Admin integration

See: https://flask-admin.readthedocs.org/

NB: Initially configured to interoperate with (and thus depend on) Flask-Login and Flask-SQLAlchemy.

Copyright 2015, Konstantin Tretyakov
License: MIT
"""
import json, collections
from flask import redirect, url_for
from flask.ext.admin import Admin, BaseView, AdminIndexView, expose
from flask.ext.admin.contrib.sqla import ModelView
from flask.ext.login import current_user
from wtforms.fields import TextAreaField
from wtforms.widgets import TextInput
from wtforms.validators import ValidationError
from wtforms.compat import text_type
from meieraha2.model import db, User, Dataset, MeieRahaVisualization, ConfigParameter


# --------------------- Module init --------------------- #
def init_app(app):
    'Set up Flask-Admin views'
    
    admin = Admin(app, name='Site Administration', index_view=LoginFriendlyAdminIndexView())
    admin.add_view(ConfigParameterModelView(ConfigParameter, db.session, name='Settings'))
    admin.add_view(UserModelView(User, db.session, name='Users'))
    admin.add_view(DatasetModelView(Dataset, db.session, name='Datasets'))
    admin.add_view(MeieRahaVisualizationModelView(MeieRahaVisualization, db.session, name='Visualizations'))


# --------------------- General views --------------------- #

class AdminAccessControlMixin(object):
    '''Configure general admin access authorization details here.
    Make sure this class goes first in the parent list of model classes.
    '''

    def is_accessible(self):
        return current_user.is_authenticated() and current_user.login == 'admin'


class LoginFriendlyAdminIndexView(AdminIndexView):
    'We add the automated redirection to login on the home page of this view for convenience.'
    
    @expose('/')
    def index(self):
        if not current_user.is_authenticated():
            return redirect(url_for('auth.login', next=url_for('admin.index')))
        return super(LoginFriendlyAdminIndexView, self).index()


class GenericModelView(AdminAccessControlMixin, ModelView):
    pass

# --------------------- Config Parameter editing page --------------------- #

class ConfigParameterModelView(AdminAccessControlMixin, ModelView):
    column_list = ('name', 'value', 'comment')
    form_columns = ('name', 'value', 'comment')
    form_overrides = {'value': TextAreaField}
    edit_template = 'admin/configparameter_edit.html'
    create_template = 'admin/configparameter_create.html'


# --------------------- User editing page --------------------- #

from werkzeug.security import generate_password_hash
def is_plaintext_password(form, field):
    if field.raw_data[0].startswith('pbkdf2:sha1:'):
        raise ValidationError("Please, enter a password in plaintext!")


class BlindTextInput(TextInput):
    '''TextInput that does not display its own value'''
    def __call__(self, field, **kwargs):
        kwargs['value'] = ''
        return TextInput.__call__(self, field, **kwargs)


class UserModelView(AdminAccessControlMixin, ModelView):
    column_list = ('login',)
    form_args = {'password':
                    {
                        'label': u"Enter new password",
                        'widget': BlindTextInput(),
                        'validators': [is_plaintext_password],
                        'filters': [generate_password_hash]
                    }
                 }
    can_create = False
    can_delete = False

# --------------------- Dataset editing page --------------------- #

class JSONPrettyPrintTextAreaField(TextAreaField):
    '''TextAreaField that formats its contents using JSON pretty-printing'''
    def _value(self):
        try:
            js = json.JSONDecoder(object_pairs_hook=collections.OrderedDict).decode(self.data)
            return json.dumps(js, indent=4, separators=(',', ': '), ensure_ascii=False)
        except:
            return text_type(self.data) if self.data is not None else ''


def is_valid_json(form, field):
    try:
        json.loads(field.data)
    except ValueError, e:
        raise ValidationError(e.message)


def is_valid_dataset(form, field):

    # Helper functions
    def visit(item, visitor):
        if 'children' in item:
            for c in item['children']:
                visit(c, visitor)
        visitor(item)

    ids = set()
    def validate(item):
        if 'id' not in item:
            title = item.get('label', u'<?>')
            raise ValueError(u'ID must be specified for element %s' % title)
        if item['id'] in ids:
            raise ValueError('Repeated ID: %s' % str(item['id']))
        ids.add(item['id'])
        if 'children' in item:
            if 'amount' in item or 'plannedFillAmount' in item:  # or 'actualFillAmount' in item:  # TODO: This is not good but we have one dataset where we need that.
                title = item.get('label', str(item.get('id', u'<?>')))
                raise ValueError(u"Error in item %s. Fields 'amount', 'plannedFillAmount' and 'actualFillAmount' may only be specified in leaf nodes." % title)

    try:
        data = json.loads(field.data)
        visit(data, validate)
    except ValueError, e:
        raise ValidationError(e.message)

DEFAULT_DATASET_DATA = '''{
    "id": 1000,
    "label": "Total income",
    "label_et": "Kogutulu",
    "children": [
        {
            "id": 1100,
            "label": "First subcategory",
            "label_et": "Esimene alamkategooria",
            "amount": 1000000,
            "actualFillAmount": 500000,
            "plannedFillAmount": 400000
        },
        {
            "id": 1200,
            "label": "Second subcategory",
            "label_et": "Teine alamkategooria",
            "amount": 2000000,
            "actualFillAmount": 1000000
        }
    ]
}
'''
class DatasetModelView(AdminAccessControlMixin, ModelView):
    column_list = ('title',)
    edit_template = 'admin/dataset_edit.html'
    create_template = 'admin/dataset_create.html'
    form_overrides = {'data': JSONPrettyPrintTextAreaField,
                      'meta_data': JSONPrettyPrintTextAreaField
                      }
    form_args = {'title': {'default': 'Enter a descriptive title here (e.g. "Tallinn Incomes 2001"). NB: This title is not shown anywhere on the page.'},
                 'data': {'validators': [is_valid_dataset], 'default': DEFAULT_DATASET_DATA},
                 'meta_data': {'validators': [is_valid_json]}
                 }

# --------------------- MeieRahaVisualization editing page --------------------- #

DEFAULT_VISUALIZATION_METADATA = u'''{
    "title": "Sample visualization",
    "title_et": "Näite visualiseering",
    "comment": "Feel free to write anything you want here or drop this field.",
    "hide": false,
    "multiyear": false,
    "revisions": [
        {
            "id": "Q0",
            "label": "Initial budget",
            "label_et": "Esialgne eelarve"
        },
        {
            "id": "Q1",
            "label": "First quarter revision",
            "label_et": "Esimese kvartali revisjon"
        },
        {
            "id": "Q2",
            "label": "Second quarter revision (planned)",
            "label_et": "Teise kvartali revisjon (planeeritud)"
        }
    ]
}
'''
class MeieRahaVisualizationModelView(AdminAccessControlMixin, ModelView):
    column_list = ('id', 'title', 'left_pane', 'right_pane', 'comparison_pane')
    edit_template = 'admin/meierahavisualization_edit.html'
    create_template = 'admin/meierahavisualization_create.html'
    form_overrides = {'meta_data': JSONPrettyPrintTextAreaField}
    form_args = {'meta_data': {'validators': [is_valid_json], 'default': DEFAULT_VISUALIZATION_METADATA},
                 'title': {'default': 'Enter a descriptive title here (e.g. "Tallinn budget 2013"). NB: This is not the title shown on the page.'}}
