# -*- coding: UTF-8 
"""
Meieraha 2: Flask-SQLAlchemy models

See: https://pythonhosted.org/Flask-SQLAlchemy/
NB: For larger projects it may make sense to split model into several modules under a .model/ subpackage.

Copyright 2015, Konstantin Tretyakov
License: MIT
"""
from sqlalchemy import *
from sqlalchemy.orm import relationship
from flask.ext.sqlalchemy import SQLAlchemy
from flask.ext.login import UserMixin

db = SQLAlchemy()
Base = db.Model


# Flask-Login compatible user table
class User(Base, UserMixin):
    id = Column(Integer, primary_key=True)
    login = Column(String(80), unique=True)
    password = Column(String(80))


class ConfigParameter(Base):
    name = Column(Unicode(32), primary_key=True)
    value = Column(Unicode)
    comment = Column(Unicode)


class Dataset(Base):
    '''
    This entity is meant to keep the hierarchical dataset that is used in the BubbleVisualization logic,
    however as we are storing the data in JSON here, we are fairly free in what we can represent.
    In particular, the "comparison bubble data" can also be represented here.
    '''
    id = Column(Integer, primary_key=True)
    title = Column(Unicode)                  # Name/title/comment for database browsing convenience. The actual title shown in the web is given in the metadata field.
    data = Column(Unicode)                   # JSON representation of the complete hierarchical dataset of the bubbles in the format supported by the JS widget
    meta_data = Column(Unicode)              # Metadata, also JSON. Not used currently. In principle might be needed to specify Dataset-specific "revision" information.

    def __unicode__(self):
        return self.title


class MeieRahaVisualization(Base):
    id = Column(Integer, primary_key=True)
    title = Column(Unicode)                  # Name/title/comment for database browsing convenience. The actual title shown in the web is given in the metadata field.
    meta_data = Column(Unicode)              # Metadata in JSON as accepted by the JS widget. Specifies the title and revision information
    left_pane_id = Column(Integer, ForeignKey('dataset.id'))    # Datasets for the Left, Right, and Comparison panes
    right_pane_id = Column(Integer, ForeignKey('dataset.id'))
    comparison_pane_id = Column(Integer, ForeignKey('dataset.id'))

    left_pane = relationship('Dataset', foreign_keys=[left_pane_id])
    right_pane = relationship('Dataset', foreign_keys=[right_pane_id])
    comparison_pane = relationship('Dataset', foreign_keys=[comparison_pane_id])


class SavedVisualization(Base):
    '''Saved visualization state'''
    id = Column(Integer, primary_key=True)
    visualization_id = Column(Integer, ForeignKey('meie_raha_visualization.id'))
    data = Column(Unicode)


class DisqusCommentStat(Base):
    '''
    We use this table to track comment counts on the bubbles.
    Note that we can safely update those statistics whenever someone comments from within our site,
    however users may also send comments via Disqus main site. In this case we won't know of the new comments.
    '''
    visualization_id = Column(Integer, primary_key=True)  # It is also a foreign key onto a MeieRahaVisualization object,
                                                          # but we won't set this as a constraint to simplify admin interface.
    thread_id = Column(String, primary_key=True)          # e.g. <vis_id>/left/<bubble_id>
    last_comment_time = Column(DateTime)                  # Time when last comment was added to this thread
    comment_count = Column(Integer, default=0)            # Number of comments. Note that we can only update this when comments are sent
                                                          # through our site, not through Disqus. This may introduce discrepancies.


# Create database
def init_db_tables(app):
    with app.app_context():
        db.create_all()


# Initialize core db data
def init_db_data(app):
    from werkzeug.security import generate_password_hash
    import pkg_resources, json

    with app.app_context():
        db.session.add(User(id = 0, login='admin', password=generate_password_hash('admin')))
        db.session.add(ConfigParameter(name='DEFAULT_VISUALIZATION_ID',
                                       comment='The id of the MeieRahaVisualization instance that is shown on the index page',
                                       value='0'))

        infopage_text = '''<h2>Our Money</h2>
        <p>A budget is a quantitative expression of a plan for a defined period of time. It may include planned sales volumes and revenues, resource quantities, costs and expenses, assets, liabilities and cash flows. It expresses strategic plans of business units, organizations, activities or events in measurable terms.</p>
        <p>Budget helps to aid the planning of actual operations by forcing managers to consider how the conditions might change and what steps should be taken now and by encouraging managers to consider problems before they arise. It also helps co-ordinate the activities of the organization by compelling managers to examine relationships between their own operation and those of other departments.</p>
        <p><a href="http://en.wikipedia.org/wiki/Budget" target="_blank">From Wikipedia, the free encyclopedia</a></p>'''

        infopage_text_et = '''<h2>Meie raha</h2>
        <p>A budget is a quantitative expression of a plan for a defined period of time. It may include planned sales volumes and revenues, resource quantities, costs and expenses, assets, liabilities and cash flows. It expresses strategic plans of business units, organizations, activities or events in measurable terms.</p>
        <p>Budget helps to aid the planning of actual operations by forcing managers to consider how the conditions might change and what steps should be taken now and by encouraging managers to consider problems before they arise. It also helps co-ordinate the activities of the organization by compelling managers to examine relationships between their own operation and those of other departments.</p>
        <p><a href="http://en.wikipedia.org/wiki/Budget" target="_blank">From Wikipedia, the free encyclopedia</a></p>'''

        db.session.add(ConfigParameter(name='INFO', comment='The text of the information page', value=infopage_text))
        db.session.add(ConfigParameter(name='INFO_et', comment='The text of the information page, in Estonian', value=infopage_text_et))

        with open(pkg_resources.resource_filename('meieraha2', 'data/sample_dataset.json')) as f:
            d = json.load(f)
            meta = d['meta']
            del d['meta']
            db.session.add(Dataset(id=0, title=d['label'], data=json.dumps(d)))
            db.session.add(MeieRahaVisualization(id=0, title=meta['title'], meta_data=json.dumps(meta),
                                                 left_pane_id=0, right_pane_id=0, comparison_pane_id=0))
        db.session.commit()


def init_app(app):
    db.init_app(app)