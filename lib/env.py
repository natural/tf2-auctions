#!/usr/bin/env python
# -*- coding: utf-8 -*-
from sys import path as sys_path
from functools import partial
from os.path import abspath, join, dirname, realpath
from google import __file__ as ginitmod


DIR_PATH = abspath(join(dirname(realpath(ginitmod)), '..'))

EXTRA_PATHS = (
    DIR_PATH,
    join(DIR_PATH, 'lib', 'antlr3'),
    join(DIR_PATH, 'lib', 'django'),
    join(DIR_PATH, 'lib', 'ipaddr'),
    join(DIR_PATH, 'lib', 'webob'),
    join(DIR_PATH, 'lib', 'yaml', 'lib'),
)


def add_sys_paths(paths):
    for p in [p for p in paths if p not in sys_path]:
	sys_path.insert(0, p)


add_extra_paths = partial(add_sys_paths, EXTRA_PATHS)
add_local_paths = partial(add_sys_paths, ('./lib', ))
