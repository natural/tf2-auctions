#!/usr/bin/env python
# -*- coding: utf-8 -*-
from google.appengine.api import users

from tf2bay.lib import ApiHandler
from tf2bay.models import Bid


class PlayerBids(ApiHandler):
    def get(self):
	try:
	    id64 = self.path_tail()
	    q = Bid.all()
	    q.filter('owner = ', users.User(id64)).filter('status = ', 'active')
	    rs = [r.encode_builtin() for r in q.fetch(limit=100)]
	    self.write_json(rs)
	except (Exception, ), exc:
	    self.error(500)
	    self.write_json({'exception':str(exc)})


main = ApiHandler.make_main(PlayerBids)


if __name__ == '__main__':
    main()
