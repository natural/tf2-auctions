#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2bay.apps import View


def basicView(template_name, related_css=None, related_js=None):
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


class NotFound(View):
    template_name = '404.pt'

    def get(self, groups):
	self.error(404)
	self.render()

