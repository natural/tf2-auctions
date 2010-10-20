#!/usr/bin/env python
# -*- coding: utf-8 -*-
from google.appengine.api import users

from tf2bay.lib import ApiHandler
from tf2bay.models import Listing


class CancelListing(ApiHandler):
    def post(self):
	try:
	    post = self.body_json()
	    listing_id = int(post['id'])
	    listing = Listing.get_by_id(listing_id)
	    if not listing:
		self.error(404)
		return
	    if listing.owner == users.get_current_user():
		db_result = listing.cancel('Cancelled by user.')
	    else:
		self.error(401)
		return
	    result = {'msg':'okay', 'result':db_result}
	except (Exception, ), exc:
	    self.error(500)
	    exc = exc.message if hasattr(exc, 'message') else str(exc)
	    result = {'msg':'error', 'description':exc}
	return self.write_json(result)


main = ApiHandler.make_main(CancelListing)


if __name__ == '__main__':
    main()
