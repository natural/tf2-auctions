#!/usr/bin/env python
# -*- coding: utf-8 -*-
from cgi import parse_qs

from google.appengine.api import users

from tf2auctions.lib import ApiHandler, user_steam_id
from tf2auctions.models import Bid


class PlayerBids(ApiHandler):
    def get(self):
	try:
	    id64 = self.path_tail()

	    q = Bid.all()
	    q.filter('owner = ', id64)
	    qs = parse_qs(self.request.query_string)
	    #if (user_steam_id(users.get_current_user()) == id64) and 'ext' in qs:
            if not 'ext' in qs:
		q.filter('status = ', 'active')
	    q.order('-created')
	    rs = [r.encode_builtin() for r in q.fetch(limit=100)]
	    self.write_json(rs)
	except (Exception, ), exc:
	    self.error(500)
	    self.write_json({'exception':str(exc)})


main = ApiHandler.make_main(PlayerBids)


if __name__ == '__main__':
    main()
