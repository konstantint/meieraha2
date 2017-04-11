#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Meieraha 2: setup script

Copyright 2015, Konstantin Tretyakov, Tanel Kärp
License: MIT
"""
import sys
import os
import meieraha2
from setuptools import setup, find_packages, Command
from setuptools.command.test import test as TestCommand

# This is a plug-in for setuptools that will invoke py.test
# when you run python setup.py test
class PyTest(TestCommand):
    def finalize_options(self):
        TestCommand.finalize_options(self)
        self.test_args = []
        self.test_suite = True

    def run_tests(self):
        import pytest  # import here, because outside the required eggs aren't loaded yet
        sys.exit(pytest.main(self.test_args))

setup(
    name='meieraha2',
    version=meieraha2.__version__,
    description="Meieraha version 2",
    long_description=open("README.rst").read(),
    author='Konstantin Tretyakov, Tanel Kärp',
    author_email='kt@ut.ee',
    url="http://meieraha.ee",
    license='MIT',
    classifiers=[ # Get strings from http://pypi.python.org/pypi?%3Aaction=list_classifiers
        'Development Status :: 5 - Production/Stable',
        'Framework :: Flask',
        'Programming Language :: Python'
    ],
    zip_safe=False,
    packages=find_packages(exclude=['ez_setup', 'examples', 'tests']),
    include_package_data=True,
    install_requires=[
      "Flask", "Flask-SQLAlchemy", "Flask-Login >= 0.3", "Flask-WTF", "Flask-Babel", "Flask-Admin",
      "Flask-Script", "Flask-Assets", "jsmin", "cssmin"
    ],
    tests_require=["pytest", "webtest"],
    cmdclass={'test': PyTest},
    entry_points={
        "console_scripts": ["meieraha2-manage = meieraha2.manage:main"],
        "paste.app_factory": ["main = meieraha2.app:app_factory"]
    },
)
