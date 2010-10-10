#!/usr/bin/env python
# -*- coding: utf-8 -*-
from google.appengine.api import users
from google.appengine.ext.webapp import RequestHandler, Request, Response
from chameleon.zpt.loader import TemplateLoader
from tf2bay.utils import is_devel


login_url = users.create_login_url(
    dest_url='/userdata',
    federated_identity='steamcommunity.com/openid'
)


login_icon_url = \
    'http://steamcommunity.com/public/images/signinthroughsteam/sits_large_border.png'


class ContextLoader(object):
    def __init__(self, loader):
	self.load = loader.load

    def __getitem__(self, key):
	return self.load(key + '.pt')


class LocalRequestHandler(RequestHandler):
    has_rss = False

    @property
    def login_url(self):
	return login_url

    @property
    def logout_url(self):
	return users.create_logout_url(self.request.uri)

    @property
    def user(self):
	return users.get_current_user()

    def is_authen(self):
	user = users.get_current_user()
	return bool(user)

    @staticmethod
    def long_date(date):
	return date.strftime('%A %d-%b-%Y %H:%M %p')

    def is_dev(self):
	return is_devel(self.request.environ)

    def req_get(self, key, default=''):
	return self.request.get(key, default)


class PageHandler(LocalRequestHandler):
    template_loader = TemplateLoader('htviews/', auto_reload=True)
    context_loader = ContextLoader(template_loader)

    def default_context(self):
	return [
	    ('context', self.context_loader),
	    ('controller', self),
	    ('environ', self.request.environ),
	    ('errors', {}),
	    ('user', self.user),
	]

    def extra_context(self):
	return ()

    def get(self):
	self.render()

    def render(self, template=None, **kwds):
	params = {}
	params.update(self.default_context())
	params.update(self.extra_context())
	params.update(kwds)
	template = self.template() if template is None else template
	self.response.out.write(template.render(**params))

    def template(self):
	return self.template_loader.load(self.template_name)

    # overrides RequestHandler.handle_exception to display a nice and
    # friendly error page.
    def handle_exception(self, exc, debug):
	import logging, traceback
	logging.exception(exc)
	self.error(500)
	self.response.clear()
        tb = traceback.format_exc() if self.is_dev() else None
	self.render(self.template_loader.load('500.pt'), traceback=tb, stack='')
