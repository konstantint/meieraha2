==================================================================
Meieraha.ee visualization website source
==================================================================

Installation
------------

Depending on how you obtain the package, you may install it in different ways. If the package was obtained as a source distribution,
you should install it using ``pip``::

    $ pip install meieraha2-<version>.zip

If you checked out a development repository, you may install the package by running::

    $ python setup.py install

If you are planning on developing the package, a useful alternative to installation is::

    $ python setup.py develop

or, if you do not have write access to your Python installation and are not using a virtualenv::

    $ python setup.py develop --user

Usage
-----

The package contains a `Flask <http://flask.pocoo.org/>`_-based web application. To launch the application you need to do the following:

    1. Run::

       $ meieraha2-manage sampleconfig

    2. Follow the instructions output by the command.

To create a packaged distribution you need to run the following::

       $ meieraha2-manage assets build
       $ python setup.py sdist

Development
-----------

In order to run the application in development mode you need to have a full repository checked out. You also
should have the ``compass`` tool installed and accessible in your path. The server can then be run in development mode as follows::

    $ export CONFIG=meieraha2.config.DevConfig
    $ meieraha2-manage createdb
    $ meieraha2-manage loaddata
    $ meieraha2-manage runserver

If you edit CSS or Javascript files, you will need to rebuild the assets bundle via

    $ meieraha2-manage assets build

Deployment
-----------

There is a starter Fabric configuration file `fabfile.py` which may help automate deployment. It needs tayloring before used, though. Sample deployment configuration is in `deploy/aws`.

Copyright
-----------
 
 - The code was developed by Konstantin Tretyakov and Tanel Kärp with the help from many other people on the Meieraha team (see http://meieraha.ee)
 - The code is licensed as MIT, feel free to contribute.
 - The repository includes full distributions of some external libraries (to simplify deployment). Those are subject to their own licences. All are open source, though.

 