#!/usr/bin/env python
# -*- coding: utf-8 -*-
from logging import info
from os import environ
from re import match

from google.appengine.api import users
from google.appengine.ext.webapp import RequestHandler, WSGIApplication, Request, Response
from google.appengine.ext.webapp.util import run_wsgi_app

from django.utils import simplejson as json
from chameleon.zpt.loader import TemplateLoader
from tf2bay import template_dir


def is_devel(environ):
    return environ['SERVER_SOFTWARE'].startswith('Dev')


def is_prod(environ):
    return not is_devel(environ)


debug = is_devel(environ)
info('tf2bay.lib.__init__.debug=%s', debug)


def environ_extras_middleware(app, factory):
    def environ_extras_app(environ, start_response):
	environ.update(factory())
	return app(environ, start_response)
    return environ_extras_app


def user_steam_id(user):
    try:
	nick = user.nickname().strip()
	m = match('\d{17}$', nick)
	return nick[m.start():m.end()]
    except (Exception, ), exc:
	pass


class ContextLoader(object):
    def __init__(self, loader):
	self.load = loader.load

    def __getitem__(self, key):
	return self.load(key + '.pt')

    @classmethod
    def build(cls, template_prefix, auto_reload=True):
	tpl = TemplateLoader(template_prefix, auto_reload=auto_reload)
	return cls(tpl), tpl


class LocalHandler(RequestHandler):
    def path_tail(self):
	return self.request.environ['PATH_INFO'].split('/')[-1]

    @staticmethod
    def make_main(app, debug=debug):
	return make_main(app, debug)


class ApiHandler(LocalHandler):
    def write_json(self, value, indent=4):
	self.response.out.write(json.dumps(value, indent=indent))

    def body_json(self):
	return json.loads(self.request.body)


class View(LocalHandler):
    context_loader, template_loader = ContextLoader.build(template_dir)
    default_css = ('site.css', )
    default_js = ('jquery.json-2.2.js', 'tools.js', )
    related_css = ()
    related_js = ()

    def default_context(self):
	return (
	    ('context', self.context_loader),
	    ('controller', self),
	    ('environ', self.request.environ),
	    ('errors', {}),
	    ('user', users.get_current_user()),
	)

    def extra_context(self):
	return ()

    def get(self):
	self.render()

    def handle_exception(self, exc, debug):
	import logging, traceback
	logging.exception(exc)
	self.error(500)
	self.response.clear()
        tb = traceback.format_exc() if self.is_devel() else None
	self.render(self.template_loader.load('500.pt'), traceback=tb, stack='')

    def is_devel(self):
	return is_devel(self.request.environ)

    def login_url(self, dest='/profile-update?ref=steam', provider='steamcommunity.com/openid'):
	return users.create_login_url(dest_url=dest, federated_identity=provider)

    def logout_url(self):
	return users.create_logout_url(self.request.uri)

    def render(self, template=None, **kwds):
	template = self.template() if template is None else template
	params = {}
	params.update(self.default_context())
	params.update(self.extra_context())
	params.update(kwds)
	self.response.out.write(template.render(**params))

    def template(self, name=None):
	return self.template_loader.load(self.template_name if name is None else name)


def wsgi_local(app, debug):
    def local(environ, start_response):
	req, res = Request(environ), Response()
	handler, groups = app(), ()
	handler.initialize(req, res)
	try:
	    method = environ['REQUEST_METHOD']
	    if method == 'GET':
		handler.get(*groups)
	    elif method == 'POST':
		handler.post(*groups)
	    elif method == 'HEAD':
		handler.head(*groups)
	    elif method == 'OPTIONS':
		handler.options(*groups)
	    elif method == 'PUT':
		handler.put(*groups)
	    elif method == 'DELETE':
		handler.delete(*groups)
	    elif method == 'TRACE':
		handler.trace(*groups)
	    else:
		handler.error(501)
	except Exception, e:
	    handler.handle_exception(e, debug)
	res.wsgi_write(start_response)
	return ['']
    return local


def run_app(app, debug=debug):
    run_wsgi_app(wsgi_local(app, debug))


def make_main(app, debug=debug):
    def main():
	run_wsgi_app(wsgi_local(app, debug))
    return main


def template_main(template_name, related_css=None, related_js=None, debug=debug):
    return make_main(basic_view(template_name, related_css, related_js), debug)


def basic_view(template_name, related_css=None, related_js=None):
    class Basic(View):
	pass
    Basic.template_name = template_name
    if related_css is not None:
	if isinstance(related_css, (basestring, )):
	    related_css = (related_css, )
        Basic.related_css = related_css
    if related_js is not None:
	if isinstance(related_js, (basestring, )):
	    related_js = (related_js, )
        Basic.related_js = related_js
    return Basic

