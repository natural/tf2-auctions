#!/usr/bin/env python
# -*- coding: utf-8 -*-
from cgi import parse_qs
from logging import warn

from google.appengine.api import users

from tf2bay.models import PlayerProfile
from tf2bay.utils import json, user_steam_id
from tf2bay.views import PageHandler


class ProfileView(PageHandler):
    template_name = 'profile.pt'

    def get(self):
	try:
	    update = parse_qs(self.request.query_string).get('ref', [''])[0]
	    if update == 'steam':
		user = users.get_current_user()
		profile = PlayerProfile.build(user, user_steam_id(user))
		profile.refresh().put()
	except (Exception, ), exc:
	    warn('player profile refresh: %s', exc)
	self.render()

