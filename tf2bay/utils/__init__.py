#!/usr/bin/env python
# -*- coding: utf-8 -*-
import re
import django.utils.simplejson as json
import yaml


def environ_extras_middleware(app, factory):
    def environ_extras_app(environ, start_response):
	environ.update(factory())
	return app(environ, start_response)
    return environ_extras_app


def ident(x):
    return x


def is_devel(environ):
    return environ['SERVER_SOFTWARE'].startswith('Dev')


def is_prod(environ):
    return not is_devel(environ)



def user_steam_id(user):
    try:
	nick = user.nickname().strip()
	m = re.match('\d{17}$', nick)
	return nick[m.start():m.end()]
    except (Exception, ), exc:
	pass
