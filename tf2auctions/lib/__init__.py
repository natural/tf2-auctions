#!/usr/bin/env python
# -*- coding: utf-8 -*-
import os
import itertools

from cgi import parse_qs
from logging import info, warn
from re import search
from time import time

from google.appengine.api import memcache
from google.appengine.api import users
from google.appengine.ext.webapp import RequestHandler, Request, Response
from google.appengine.ext.webapp.util import run_wsgi_app

from simplejson import dumps as json_dumps, loads as json_loads
from chameleon.zpt.loader import TemplateLoader

from tf2auctions import features


def js_datetime(dt):
    ## NB: the timezone is hardcoded because (a) that's what is always
    ## used on the server and (b) %Z returns ''
    fmt = '%a, %d %b %Y %H:%M:%S GMT'
    return dt.strftime(fmt)


def search_id64(value):
    value = value.strip()
    match = search('\d{17}$', value)
    return value[match.start():match.end()]


def user_steam_id(user):
    ## TODO:  make user optional and default it to users.get_current_user()
    if hasattr(user, 'nickname'):
	name = user.nickname()
    else:
	name = user
    try:
	return search_id64(name)
    except (Exception, ), exc:
	pass


def cache(key, ttl=60, verbose=False):
    def deco(func):
	def wrapper(*args, **kwds):
	    mkey = key(*args, **kwds) if callable(key) else key
	    value = memcache.get(mkey)
	    if value is not None:
		if verbose:
		    info('cache hit: %s', mkey)
		return value
	    start = time()
	    value = func(*args, **kwds)
	    finish = time()
	    try:
		memcache.set(mkey, value, ttl)
	    except (Exception, ), exc:
		error('%s', exc)
	    else:
		if verbose:
		    info('cache miss: %s; %2.2fs to compute', mkey, finish-start)
	    return value
	return wrapper if (features.always_cache or not features.devel) else func
    return deco


def render_body_cache_key(request, template, **params):
    return 'template(uri=%s, filename=%s)' % (request.uri, template.filename, )


@cache(render_body_cache_key, ttl=60*60)
def render_body(request, template, **kwds):
    return template.render(**kwds)


class ContextLoader(object):
    def __init__(self, loader):
	self.load = loader.load

    def __getitem__(self, key):
	return self.load(key + '.pt')

    @classmethod
    def build(cls, template_prefix, auto_reload=features.devel):
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
    def make_main(app, debug=features.devel):
	return make_main(app, debug)


class ApiHandler(LocalHandler):
    def write_json(self, value, indent=4):
	self.response.out.write(json_dumps(value, indent=indent))

    def body_json(self):
	return json_loads(self.request.body)


class View(LocalHandler):
    context_loader, template_loader = ContextLoader.build(features.template_dir)
    default_css = ('site.css', )
    default_js = ('jquery.json-2.2.js', 'tools.js')
    related_css = ()
    related_js = ()

    def default_context(self):
	return (
	    ('context', self.context_loader),
	    ('controller', self),
	    ('environ', self.request.environ),
	    ('features', features),
	    ('errors', {}),
    	    ('itertools', itertools),
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
        tb = traceback.format_exc() if features.devel else None
	self.render(self.template_loader.load('500.pt'), traceback=tb, stack='')

    def login_url_key(self):
	return 'login-url:%s?%s' % (self.request.uri, self.request.query_string, )

    @cache(lambda self, **kwds:self.login_url_key(), ttl=60*60, verbose=True)
    def login_url(self, dest='/profile-update', provider='steamcommunity.com/openid'):
	next_url = parse_qs(self.request.query_string).get('next', [''])[0]
	if next_url:
	    ## we're not encoding for for security, just ease of
	    ## transmission -- the base64 slug is more easily
	    ## recognized by the login redirector.
	    dest += '/' + next_url.encode('base64')
	return users.create_login_url(dest_url=dest, federated_identity=provider)

    def logout_url_key(self):
	return 'logout-url:%s' % (self.request.uri, )

    @cache(lambda self:self.logout_url_key(), ttl=60*60, verbose=True)
    def logout_url(self):
	return users.create_logout_url(self.request.uri)

    def render(self, template=None, **kwds):
	template = self.template() if template is None else template
	params = {}
	params.update(self.default_context())
	params.update(self.extra_context())
	params.update(kwds)
	self.response.out.write(render_body(self.request, template, **params))

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


def make_main(app, debug=features.devel):
    def main():
	run_wsgi_app(wsgi_local(app, debug))
    return main


def template_main(template_name, related_css=None, related_js=None, debug=features.devel):
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
