#!/usr/bin/env python
# -*- coding: utf-8 -*-
from sys import path as sys_path
from functools import partial
from os.path import abspath, join, dirname, realpath
from google import __file__ as ginitmod


DIR_PATH = abspath(join(dirname(realpath(ginitmod)), '..'))

EXTRA_PATHS = (
    DIR_PATH,
    join(DIR_PATH, 'ext', 'antlr3'),
    join(DIR_PATH, 'ext', 'django'),
    join(DIR_PATH, 'ext', 'ipaddr'),
    join(DIR_PATH, 'ext', 'webob'),
    join(DIR_PATH, 'ext', 'yaml', 'lib'),
    join(DIR_PATH, 'ext', 'simplejson'),
    join(DIR_PATH, 'ext', 'graphy'),
    join(DIR_PATH, 'ext', 'firepython'),
)


def add_sys_paths(paths):
    for p in [p for p in paths if p not in sys_path]:
	sys_path.insert(0, p)


add_extra_paths = partial(add_sys_paths, EXTRA_PATHS)
add_local_paths = partial(add_sys_paths, ('./ext', ))
