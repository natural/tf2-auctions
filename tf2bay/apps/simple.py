#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2bay.apps import PageHandler


class FrontView(PageHandler):
    template_name = 'front.pt'


class LoginView(PageHandler):
    template_name = 'login.pt'
    related_css = ('login.css', )
    related_js = ('login.js', )


class EchoView(PageHandler):
    template_name = 'echo.pt'


class NotFound(PageHandler):
    template_name = '404.pt'

    def get(self, groups):
	self.error(404)
	self.render()

