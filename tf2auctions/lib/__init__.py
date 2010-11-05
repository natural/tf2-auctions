#!/usr/bin/env python
# -*- coding: utf-8 -*-
from cgi import parse_qs
from logging import info
from os import environ
from re import search
from time import time

from google.appengine.api import memcache
from google.appengine.api import users
from google.appengine.ext.webapp import RequestHandler, Request, Response
from google.appengine.ext.webapp.util import run_wsgi_app

from simplejson import dumps as json_dumps, loads as json_loads
from chameleon.zpt.loader import TemplateLoader
from tf2auctions import template_dir


def is_devel(environ):
    return environ.get('SERVER_SOFTWARE', '').startswith('Dev')


always_cache = False
devel = is_devel(environ)
info('tf2auctions.lib.always_cache = %s', always_cache)
info('tf2auctions.lib.devel = %s', devel)


def js_datetime(dt):
    ## NB: the timezone is hardcoded because (a) that's what is always
    ## used on the server and (b) %Z returns ''
    fmt = '%a, %d %b %Y %H:%M:%S GMT'
    return dt.strftime(fmt)


def user_steam_id(user):
    ## TODO:  make user optional and default it to users.get_current_user()
    if hasattr(user, 'nickname'):
	name = user.nickname()
    else:
	name = user
    try:
	name = name.strip()
	match = search('\d{17}$', name)
	return name[match.start():match.end()]
    except (Exception, ), exc:
	pass


def cache(key, ttl=60):
    def deco(func):
	def wrapper(*args, **kwds):
	    mkey = key(*args, **kwds) if callable(key) else key
	    value = memcache.get(mkey)
	    if value is not None:
		return value
	    start = time()
	    value = func(*args, **kwds)
	    finish = time()
	    try:
		memcache.set(mkey, value, ttl)
	    except (Exception, ), exc:
		error('%s', exc)
	    else:
		info('cache miss: %s; %2.2fs to compute', mkey, finish-start)
	    return value
	return wrapper if (always_cache or not devel) else func
    return deco


@cache(lambda b, **c:b.filename, ttl=60*60)
def render_body(template, **kwds):
    return template.render(**kwds)


class ContextLoader(object):
    def __init__(self, loader):
	self.load = loader.load

    def __getitem__(self, key):
	return self.load(key + '.pt')

    @classmethod
    def build(cls, template_prefix, auto_reload=devel):
	tpl = TemplateLoader(template_prefix, auto_reload=auto_reload)
	return cls(tpl), tpl


class LocalHandler(RequestHandler):
    def __init__(self, request, response):
	super(RequestHandler, self).__init__()
	self.request = request
	self.response = response

    def path_tail(self):
	return self.request.environ['PATH_INFO'].split('/')[-1]

    @staticmethod
    def make_main(app, debug=devel):
	return make_main(app, debug)


class ApiHandler(LocalHandler):
    def write_json(self, value, indent=4):
	self.response.out.write(json_dumps(value, indent=indent))

    def body_json(self):
	return json_loads(self.request.body)


class View(LocalHandler):
    context_loader, template_loader = ContextLoader.build(template_dir)
    default_css = ('site.css', )
    default_js = ('jquery.json-2.2.js', 'tools.js')
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

    def login_url(self, dest='/profile-update', provider='steamcommunity.com/openid'):
	next_url = parse_qs(self.request.query_string).get('next', [''])[0]
	if next_url:
	    ## we're not encoding for for security, just ease of
	    ## transmission -- the base64 slug is more easily
	    ## recognized by the login redirector.
	    dest += '/' + next_url.encode('base64')
	return users.create_login_url(dest_url=dest, federated_identity=provider)

    def logout_url(self):
	return users.create_logout_url(self.request.uri)

    def render(self, template=None, **kwds):
	template = self.template() if template is None else template
	params = {}
	params.update(self.default_context())
	params.update(self.extra_context())
	params.update(kwds)
	self.response.out.write(render_body(template, **params))

    def template(self, name=None):
	return self.template_loader.load(self.template_name if name is None else name)


def wsgi_local(app, debug):
    methods = ('get', 'post', 'head', 'options', 'put', 'delete', 'trace')
    def local(environ, start_response):
	handler = app(Request(environ), Response())
	method = environ['REQUEST_METHOD'].lower()
	if method not in methods:
	    handler.error(405)
	else:
	    call = getattr(handler, method, None)
	    if call is None:
		handler.error(501)
	    else:
		try:
		    call()
		except Exception, e:
		    handler.handle_exception(e, debug)
	handler.response.wsgi_write(start_response)
	return ['']
    return local


def make_main(app, debug=devel):
    def main():
	run_wsgi_app(wsgi_local(app, debug))
    return main


def template_main(template_name, related_css=None, related_js=None, debug=devel):
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


##
# copied from django.
def slugify(val):
    import re, unicodedata
    val = unicodedata.normalize('NFKD', unicode(val)).encode('ascii', 'ignore')
    val = unicode(re.sub('[^\w\s-]', '', val).strip().lower())
    return re.sub('[-\s]+', '-', val)