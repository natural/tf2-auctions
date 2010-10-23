#!/usr/bin/env python
# -*- coding: utf-8 -*-
from cgi import parse_qs
from logging import exception, warn
from urllib import quote as quote_url
from google.appengine.api import users
from tf2bay.lib import View
from tf2bay.models import PlayerProfile


class ProfileLogin(View):
    def get(self):
	user = users.get_current_user()
	try:
	    profile = PlayerProfile.build(user)
	    profile.refresh().put()
	except (Exception, ), exc:
    	    exception('player profile refresh: %s', exc)
	    self.error(500)
	else:
	    paths = self.request.environ['PATH_INFO'].split('/')
	    redirect_url = '/profile/' + user.nickname()
	    if len(paths) == 3:
		try:
		    redirect_url = paths[-1].decode('base64')
		except (Exception, ), exc:
		    exception('player profile redirect decoding exception: %s', exc)
	    self.redirect(redirect_url)


main = View.make_main(ProfileLogin)


if __name__ == '__main__':
    main()
