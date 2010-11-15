#!/usr/bin/env python
# -*- coding: utf-8 -*-
from cgi import parse_qs
from google.appengine.api import users

from tf2auctions.lib import ApiHandler
from tf2auctions.models import PlayerProfile


class CurrentUserProfile(ApiHandler):
    def get(self):
	try:
	    user = users.get_current_user()
	    if not user:
		self.error(401)
		return
	    profile = PlayerProfile.get_by_user(user)
	    if not profile:
		self.error(401)
		return
	    profile.refresh()
	    qs = parse_qs(self.request.query_string)
	    self.write_json(
		profile.encode_builtin(
		    settings='settings' in qs,
		    complete='complete' in qs,
		)
	    )
	except (Exception, ), exc:
	    self.error(500)
	    raise
	    self.write_json({'exception':str(exc)})


main = ApiHandler.make_main(CurrentUserProfile)


if __name__ == '__main__':
    main()
