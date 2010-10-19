#!/usr/bin/env python
# -*- coding: utf-8 -*-
from google.appengine.api import users

from tf2bay.lib import ApiHandler
from tf2bay.models import PlayerProfile


class CurrentUserProfile(ApiHandler):
    def get(self):
	try:
	    profile = PlayerProfile.get_by_user(users.get_current_user())
	    self.write_json(profile.encode_builtin())
	except (Exception, ), exc:
	    self.error(500)
	    self.write_json({'exception':str(exc)})


main = ApiHandler.make_main(CurrentUserProfile)


if __name__ == '__main__':
    main()
