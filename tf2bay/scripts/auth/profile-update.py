#!/usr/bin/env python
# -*- coding: utf-8 -*-
from logging import exception
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
	    self.redirect('/profile/'+user.nickname())


main = View.make_main(ProfileLogin)


if __name__ == '__main__':
    main()
