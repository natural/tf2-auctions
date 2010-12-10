#!/usr/bin/env python
# -*- coding: utf-8 -*-
from logging import error, warn
from google.appengine.api import users

from tf2auctions.lib import ApiHandler, user_steam_id
from tf2auctions.models import Bid


class CancelBid(ApiHandler):
    def post(self):
	try:
	    key = self.body_json()['key']
	    bid = Bid.get(key)
	    if not bid:
		self.error(404)
	    elif user_steam_id(users.get_current_user()) != bid.owner:
		self.error(401)
	    else:
		bid.cancel()
	except (Exception, ), exc:
	    self.error(500)
	    error('cancel bid exception: %s', exc)
	return self.write_json({})


main = ApiHandler.make_main(CancelBid)


if __name__ == '__main__':
    main()
