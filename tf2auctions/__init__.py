#!/usr/bin/env python
# -*- coding: utf-8 -*-
import logging
import os
import yaml


class features:
    always_cache = False
    app_dir = os.path.abspath(os.path.join(os.path.split(__file__)[0], '../'))
    devel = os.environ.get('SERVER_SOFTWARE', '').startswith('Dev')
    profile_settings = False #devel # True later when ready
    subscriber_accounts = devel # True later when ready
    template_dir = os.path.join(app_dir, 'htviews')
    version = yaml.load(open(os.path.join(app_dir, 'app.yaml')))['version']


def init():
    for k in sorted(k for k in dir(features) if not k.startswith('_')):
	logging.info('features.%s = %s', k, getattr(features, k))

    if not features.devel:
	from tf2auctions.ext.autoretry import autoretry_datastore_timeouts
	autoretry_datastore_timeouts()
	logging.warn('Datastore automatic retry enabled')


init()
