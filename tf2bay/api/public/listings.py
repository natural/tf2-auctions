#!/usr/bin/env python
# -*- coding: utf-8 -*-
from google.appengine.api import users

from tf2bay.lib import ApiHandler
from tf2bay.models import Listing


class PlayerListings(ApiHandler):
    def get(self):
	try:
	    id64 = self.path_tail()
	    q = Listing.all()
	    q.filter('owner = ', users.User(id64))
	    q.filter('status = ', 'active') ## TODO:  get status from query parameter
	    rs = [r.encode_builtin() for r in q.fetch(limit=100)]
	    self.write_json(rs)
	except (Exception, ), exc:
	    self.error(500)
	    self.write_json({'exception':str(exc)})


main = ApiHandler.make_main(PlayerListings)


if __name__ == '__main__':
    main()
