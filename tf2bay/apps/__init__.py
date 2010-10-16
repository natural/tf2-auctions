#!/usr/bin/env python
# -*- coding: utf-8 -*-
from google.appengine.api import users
from google.appengine.ext.webapp import RequestHandler
from chameleon.zpt.loader import TemplateLoader
from tf2bay.utils import is_devel


class ContextLoader(object):
    def __init__(self, loader):
	self.load = loader.load

    def __getitem__(self, key):
	return self.load(key + '.pt')

    @classmethod
    def build(cls, template_prefix, auto_reload=True):
	tpl = TemplateLoader(template_prefix, auto_reload=auto_reload)
	return cls(tpl), tpl


class View(RequestHandler):
    context_loader, template_loader = ContextLoader.build('htviews/')
    default_js = ('jquery.json-2.2.js', 'fixes.js', 'tools.js')
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
        tb = traceback.format_exc() if is_devel(self.request.environ) else None
	self.render(self.template_loader.load('500.pt'), traceback=tb, stack='')

    def login_url(self, dest='/profile?ref=steam', provider='steamcommunity.com/openid'):
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
