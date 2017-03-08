#! /bin/bash
export CONFIG=/meieraha/settings.py
meieraha2-manage createdb
meieraha2-manage loaddata