#!/usr/bin/env python
# -*- coding: utf-8 -*-
from logging import error
from google.appengine.api import users
from tf2auctions.lib import View
from tf2auctions.models import PlayerProfile


class ProfileUpdate(View):
    """ After login target.  Refreshes the player profile of the
        current user, creating it first if necessary.  Redirects the
        user to either their profile page or to the page from which
        they came.
    """
    def get(self):
	user = users.get_current_user()
	try:
	    profile = PlayerProfile.build(user)
	    profile.refresh()
	except (Exception, ), exc:
    	    error('player profile refresh: %s', exc)
	    self.error(500)
	else:
	    paths = self.request.environ['PATH_INFO'].split('/')
	    redirect_url = '/profile/%s' % (user.nickname(), )
	    if len(paths) == 3:
		try:
		    redirect_url = paths[-1].decode('base64')
		except (Exception, ), exc:
		    error('player profile redirect decoding exception: %s', exc)
	    self.redirect(redirect_url)


main = View.make_main(ProfileUpdate)


if __name__ == '__main__':
    main()
