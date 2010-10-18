#!/usr/bin/env python
# -*- coding: utf-8 -*-
from cgi import parse_qs
from logging import exception

from google.appengine.api import users

from tf2bay.apps import View
from tf2bay.models import PlayerProfile
from tf2bay.utils import json



class ProfileView(View):
    template_name = 'profile.pt'
    related_js = ('profile.js', )

    def get(self, id64):
	self.render()


class ProfileLogin(View):
    def get(self):
	user = users.get_current_user()
	try:
	    update = parse_qs(self.request.query_string).get('ref', [''])[0]
	    if update == 'steam':
		profile = PlayerProfile.build(user)
		profile.refresh().put()
	except (Exception, ), exc:
	    exception('player profile refresh: %s', exc)
	self.redirect('/profile/'+user.nickname())
