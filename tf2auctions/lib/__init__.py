#!/usr/bin/env python
# -*- coding: utf-8 -*-
from cgi import parse_qs
from logging import info
from re import search
from time import time

from chameleon.zpt.loader import TemplateLoader as BaseTemplateLoader
from google.appengine.api import memcache, users
from google.appengine.ext.webapp import RequestHandler, Request, Response
from google.appengine.ext.webapp.util import run_wsgi_app
from simplejson import dumps as json_dumps, loads as json_loads

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
    if hasattr(user, 'nickname'):
	name = user.nickname()
    else:
	name = user
    try:
	return search_id64(name)
    except (Exception, ), exc:
	pass


def cache(key, ttl=60, verbose=False, always=False):
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
	return wrapper if (always or not features.devel) else func
    return deco


def render_body_cache_key(request, template, **params):
    return 'template(uri=%s, filename=%s)' % (request.uri, template.filename, )


@cache(render_body_cache_key, ttl=60*60)
def render_body(request, template, **kwds):
    return template.render(**kwds)


class TemplateLoader(BaseTemplateLoader):
    cache = {}

    def load(self, filename, format='xml'):
	key = (filename, format)
	if key in self.cache and not features.devel:
	    return self.cache[key]
	info('DebugTemplateLoader(%s, %s)', filename, format)
	tmpl = self.cache[key] = super(TemplateLoader, self).load(filename, format)
	return tmpl


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

    jq_ui_css = 'http://ajax.googleapis.com/ajax/libs/jqueryui/1.8/themes/base/jquery-ui.css'
    media_css_path = '/media/css'
    default_css = ('site.css', )
    related_css = ()

    jq_min = 'http://ajax.googleapis.com/ajax/libs/jquery/1.5.1/jquery.min.js'
    jq_ui = 'http://ajax.googleapis.com/ajax/libs/jqueryui/1.8.10/jquery-ui.min.js'
    media_js_path = '/media/js'
    link_js = ('LAB.min.js', )
    related_js = ()
    if features.devel:
        block_js = (
            ('ga.js', None),
            (jq_min, ''),
            ('jquery.json-2.2.js', None),
            ('dateformat.js', None),
            ('core.js', ''),
            )
    else:
        block_js = (
            ('ga.js', None),
            (jq_min, ''),
            ('core.min.js', ''),
            )

    ## rss feeds for the view
    related_rss = ()

    def default_context(self):
	import itertools
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

    def iter_head_css(self, css_path=None):
	prefix = self.media_css_path if css_path is None else css_path
	devel, version = features.devel, features.version
        for css in self.default_css + self.related_css:
            if not css.startswith('http:'):
                css = '%s/%s?v=%s' % (prefix, css, int(time()) if devel else version)
            yield css

    def iter_link_js(self, js_path=None):
	prefix = self.media_js_path if js_path is None else js_path
	for js in self.link_js:
	    yield js if js.startswith('http:') else '%s/%s' % (prefix, js)

    def iter_tag_js(self, js_path=None):
        calls = []
	prefix = self.media_js_path if js_path is None else js_path
	devel, version = features.devel, features.version
        for js, wait in self.block_js + tuple((js, 'function() {init(); core()}') for js in self.related_js):
            if not js.startswith('http:'):
                js = '%s/%s?v=%s' % (prefix, js, int(time()) if devel else version)
            calls.append('.script("%s")%s' % (js, ('.wait(%s)' % wait if wait is not None else '')))
        yield '$LAB\n%s'% ('\n'.join(calls))

    def iter_rss(self, prefix_path=''):
	for rss in self.related_rss:
	    yield rss

    def login_url_key(self):
	return 'login-url:%s?%s' % (self.request.uri, self.request.query_string, )

    def currency_types_encoded(self):
        spaces = (160, 160, 160)
        for key, (ents, label) in currency_types():
            sym = ''.join('&#%s;' % e for e in (ents + spaces)[0:4])
            yield (key, '%s - %s' % (sym, label))

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


class RssView(View):
    template_name = 'rss.pt'
    description = 'RSS Description'
    title = 'RSS Title'
    ttl = 60 * 3 # minutes
    url = '/rss'

    def pub_date(self):
	return 'Sat, 07 Sep 2002 00:00:01 GMT'

    def extra_context(self):
	return ()

    def get(self):
	self.render()

    def items(self):
	return ()


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


def template_main(template_name, related_css=None, related_js=None, related_rss=None, debug=features.devel):
    return make_main(basic_view(template_name, related_css, related_js, related_rss), debug)


def basic_view(template_name, related_css=None, related_js=None, related_rss=None):

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
    if related_rss is not None:
	if isinstance(related_rss, (basestring, )):
	    related_rss = (related_rss, )
        Basic.related_rss = related_rss
    return Basic


##
# copied from django.
def slugify(val):
    import re, unicodedata
    val = unicodedata.normalize('NFKD', unicode(val)).encode('ascii', 'ignore')
    val = unicode(re.sub('[^\w\s-]', '', val).strip().lower())
    return re.sub('[-\s]+', '-', val)


def currency_types():
    return [
        ('USD', ((36, ),           'U.S. Dollars')),
        ('AUD', ((36, ),           'Australian Dollars')), 
        ('BRL', ((82, 36, ),       'Brazilian Reais')), 
        ('GBP', ((163, ),          'British Pounds')), 
        ('CAD', ((36, ),           'Canadian Dollars')), 
        ('CZK', ((75, 269, ),      'Czech Koruny')), 
        ('DKK', ((107, 114, ),     'Danish Kroner')), 
        ('EUR', ((8364, ),         'Euros')), 
        ('HKD', ((36, ),           'Hong Kong Dollars')), 
        ('HUF', ((70, 116, ),      'Hungarian Forints')), 
        ('ILS', ((8362, ),         'Israeli New Shekels')), 
        ('JPY', ((165, ),          'Japanese Yen')), 
        ('MYR', ((82, 77, ),       'Malaysian Ringgit')), 
        ('MXN', ((36, ),           'Mexican Pesos')), 
        ('TWD', ((78, 84, 36, ),   'New Taiwan Dollars')), 
        ('NZD', ((36, ),           'New Zealand Dollars')), 
        ('NOK', ((107, 114, ),     'Norwegian Kroner')), 
        ('PHP', ((80, 104, 112, ), 'Philippine Pesos')), 
        ('PLN', ((122, 322, ),     'Polish Zlotys')), 
        ('SGD', ((36, ),           'Singapore Dollars')), 
        ('SEK', ((107, 114, ),     'Swedish Kronor')), 
        ('CHF', ((67, 72, 70, ),   'Swiss Francs')), 
        ('THB', ((3647, ),         'Thai Baht')), 
        ('TRY', ((8356, ),         'Turkish Liras')),
     ]
