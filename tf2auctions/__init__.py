#!/usr/bin/env python
# -*- coding: utf-8 -*-
import logging
import os
import yaml


class features:
    app_dir = os.path.abspath(os.path.join(os.path.split(__file__)[0], '../'))
    devel = os.environ.get('SERVER_SOFTWARE', '').startswith('Dev')
    local_static_files = True
    log_level = logging.INFO if devel else logging.WARN
    log_level = logging.ERROR
    template_dir = os.path.join(app_dir, 'htviews')
    version = yaml.load(open(os.path.join(app_dir, 'app.yaml')))['version']



def init():
    logging.root.setLevel(features.log_level)
    for k in sorted(k for k in dir(features) if not k.startswith('_')):
	logging.info('features.%s = %s', k, getattr(features, k))
    if not features.devel:
	from tf2auctions.ext.autoretry import autoretry_datastore_timeouts
	autoretry_datastore_timeouts()
	logging.warn('Datastore automatic retry enabled')


init()
