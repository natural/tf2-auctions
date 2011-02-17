#!/usr/bin/env python
# -*- coding: utf-8 -*-
from google.appengine.api import users

from tf2auctions.lib import ApiHandler
from tf2auctions.models import Feedback


class ProfileFeedback(ApiHandler):
    def get(self):
	fbs = Feedback.get_by_target(self.path_tail())
	if not fbs:
	    self.error(404)
	    return
	self.write_json([fb.encode_builtin() for fb in fbs])


main = ApiHandler.make_main(ProfileFeedback)


if __name__ == '__main__':
    main()
