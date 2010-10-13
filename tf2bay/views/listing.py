#!/usr/bin/env python
# -*- coding: utf-8 -*-
from cgi import parse_qs
from logging import exception

from google.appengine.api import users

from tf2bay.models import PlayerProfile
from tf2bay.views import PageHandler


class AddListingView(PageHandler):
    template_name = 'newlisting.pt'

    def get(self):
	self.render()

