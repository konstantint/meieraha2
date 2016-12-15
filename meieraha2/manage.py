# -*- coding: UTF-8 -*-
"""
Meieraha 2: Flask-Script manager script

See: http://flask-script.readthedocs.org/

Copyright 2015, Konstantin Tretyakov
License: MIT
"""
import logging, os, pkg_resources
from flask.ext.script import Manager
from meieraha2.app import create_app
from meieraha2.model import db, Dataset, MeieRahaVisualization, ConfigParameter

app = create_app()
manager = Manager(app)


@manager.shell
def shell_context():
    from meieraha2 import model
    return dict(app=app, model=model, db=model.db)


@manager.command
def runserver(log_config=None):
    'Launch a debug server.'
    if log_config is not None:
        logging.config.fileConfig(log_config)
    else:
        logging.basicConfig(level=logging.DEBUG)
    app.run(host=app.config['DEBUG_SERVER_HOST'], port=app.config['DEBUG_SERVER_PORT'])


@manager.command
def createdb():
    'Initialize a new database, creating tables and data.'
    from .model import init_db_tables, init_db_data
    init_db_tables(app)
    init_db_data(app)


@manager.command
def loaddata():
    '''
    Import old MeieRaha data into the database.
    '''
    import collections, csv, json

    def read_data(filename):
        with open(filename) as f:
            reader = csv.reader(f, delimiter='\t')
            rows = [r for r in reader]
        RowType = collections.namedtuple('RowType', ['dataset_id', 'id', 'parent_id', 'amount', 'title_et', 'title', 'description_et', 'description', 'color'])
        return map(lambda x: RowType(*x), rows)

    def split_datasets(rows):
        datasets = []
        cur_dataset_start = 0
        while cur_dataset_start < len(rows):
            i = cur_dataset_start + 1
            while i < len(rows) and int(rows[i].dataset_id) != 0:
                i += 1
            datasets.append((cur_dataset_start, i))
            cur_dataset_start = i
        return datasets

    def convert_dataset(rows):
        assert rows[0].dataset_id == '0'
        assert rows[1].dataset_id != '0'
        assert len(set([r.dataset_id for r in rows[1:]])) == 1
        print len(rows), rows[0].title_et
        record_by_id = {int(r.id): r for r in rows}
        children = collections.defaultdict(list)

        for r in rows:
            if int(r.id) != 0:
                children[record_by_id[int(r.parent_id)]].append(r)

        cur_id = [1]        # http://stackoverflow.com/questions/8447947/is-it-possible-to-modify-variable-in-python-that-is-in-outer-but-not-global-sc
        def hierarchize(root):
            rec = collections.OrderedDict(id=cur_id[0], label=unicode(root.title, 'utf8'))
            cur_id[0] += 1
            if root.title == '':
                rec['label'] = unicode(root.title_et, 'utf8')
            if root.title_et != rec['label'] and root.title_et != '':
                rec['label_et'] = unicode(root.title_et, 'utf8')
            rec['amount'] = int(root.amount)
            if root.description != '':
                rec['description'] = unicode(root.description, 'utf8')
            if root.description_et != '':
                rec['description_et'] = unicode(root.description_et, 'utf8')
            if root.description == '' and not root.description_et == '':
                rec['description'] = rec['description_et']
                del rec['description_et']
            if root.color != '':
                rec['color'] = "rgb("+root.color+")"

            if children[root] != []:
                rec['children'] = [hierarchize(r) for r in children[root]]
                if root.id != '0':
                    validate_amount = sum([r['amount'] for r in rec['children']])
                    if validate_amount != rec['amount'] and root.id != '0':
                        print "Invalid amount in record %s" % rec['label']
                        print "Expected %d, actual %d" % (validate_amount, rec['amount'])
                del rec['amount']
            return rec

        return hierarchize(rows[0])

    rows = read_data(pkg_resources.resource_filename('meieraha2', 'data/all_records_2014.txt'))
    datasets = split_datasets(rows)
    datasets = map(lambda (i, j): convert_dataset(rows[i:j]), datasets)

    visualizations = [(2, 3, 1, "Estonian State Budget 2011", "Eesti Eelarve 2011"),
                      (4, 5, 1, "Estonian State Budget 2012", "Eesti Eelarve 2012"),
                      (6, 7, 1, "Estonian State Budget 2013", "Eesti Eelarve 2013"),
                      (8, 9 ,1, "Estonian Government Sector Budget 2013", "Eesti Valitsussektori Eelarve 2013"),
                      (10, 11, 1, "Tallinn City Budget 2013", "Tallinna Eelarve 2013"),
                      (12, 13, 1, "Estonian State Budget 2014", "Eesti Eelarve 2014"),
                      (14, 15, 1, "Tallinn City Budget 2014", "Tallinna Eelarve 2014")]

    with app.app_context():
        for d in datasets:
            ds = Dataset(title = d['label'], data = json.dumps(d))
            db.session.add(ds)
        for left, right, co, en, et in visualizations:
            mdata = {'title': en, 'title_et': et}
            v = MeieRahaVisualization(title=en,
                                     left_pane_id=left,
                                     right_pane_id=right,
                                     comparison_pane_id=co,
                                     meta_data=json.dumps(mdata))
            db.session.add(v)
        db.session.query(ConfigParameter).get('DEFAULT_VISUALIZATION_ID').value=str(len(visualizations)-1)

        # Finally, import sample_dataset.json
        ds = json.loads
        db.session.commit()

@manager.command
def sampleconfig():
    '''Creates sample configuration file and Paste configuration file in the current directory.'''
    if os.path.exists('sample_settings.py') or os.path.exists('sample_pasteconfig.ini'):
        print "Before creating a new sample configuration file, please remove the existing files sample_settings.py and sample_pasteconfig.ini"
        return
    import shutil
    shutil.copy(pkg_resources.resource_filename('meieraha2', 'data/sample_settings.py'), 'sample_settings.py')
    shutil.copy(pkg_resources.resource_filename('meieraha2', 'data/sample_pasteconfig.ini'), 'sample_pasteconfig.ini')

    print '''
The files sample_settings.py and sample_pasteconfig.ini were created in the current directory
Edit them as necessary. Once you are done, you should proceed as follows:
  - Set the CONFIG environment variable to point to your settings.py configuration file:
        export CONFIG=$PWD/sample_settings.py
        (in Windows: set CONFIG=%CD%\\sample_settings.py
  - Create the database and load initial data
        meieraha2-manage createdb
        meieraha2-manage loaddata
  - You can now serve the app in debug mode as follows:
        meieraha2-manage runserver
  - To serve the app in production, install a WSGI container, e.g.:
        pip install gunicorn pastedeploy pastescript
  - .. and use it to serve the application:
        gunicorn --paste sample_pasteconfig.ini
        (alternatively: paster serve sample_pasteconfig.ini)
    '''



# --------------------- Localization management --------------------- #
babel_manager = Manager(usage="Perform localization operations.")

@babel_manager.command
def init(lang):
    '''Initialize translations for a new language'''
    os.system('pybabel init -i meieraha2/translations/messages.pot -d meieraha2/translations -l %s' % lang)

@babel_manager.command
def update():
    '''Update translation files with new messages from code'''
    os.system('pybabel extract -F babel.cfg -k lazy_gettext -o meieraha2/translations/messages.pot meieraha2')
    os.system('pybabel update -i meieraha2/translations/messages.pot -d meieraha2/translations')

@babel_manager.command
def compile():
    '''Compile all translations'''
    os.system('pybabel compile -d meieraha2/translations')


# --------------------- Asset management --------------------- #
from flask.ext.assets import ManageAssets
# https://github.com/miracle2k/flask-assets/pull/78
app.jinja_env.assets_environment.environment = app.jinja_env.assets_environment
manager.add_command("assets", ManageAssets())
manager.add_command("babel", babel_manager)


def main():
    manager.run()
