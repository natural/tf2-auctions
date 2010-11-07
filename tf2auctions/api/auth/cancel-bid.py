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

    def ___post(self):
	try:
	    post = self.body_json()
	    listing_id = int(post['id'])
	    listing = Bid.get_by_id(listing_id)
	    if not listing:
		self.error(404)
		return
	    current_user = users.get_current_user()
	    if current_user and (listing.owner == user_steam_id(current_user.nickname())):
		db_result = listing.cancel('Cancelled by user.')
	    else:
		import logging
		logging.warn('wtf %s %s %s', user_steam_id(current_user.nickname()), listing.owner, current_user.nickname()==listing.owner)
		self.error(401)
		return
	    result = {'msg':'okay', 'result':db_result}
	except (Exception, ), exc:
	    self.error(500)
	    exc = exc.message if hasattr(exc, 'message') else str(exc)
	    result = {'msg':'error', 'description':exc}
	return self.write_json(result)


main = ApiHandler.make_main(CancelBid)


if __name__ == '__main__':
    main()
