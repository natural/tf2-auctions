#!/usr/bin/env python
# -*- coding: utf-8 -*-
from google.appengine.api import users

from tf2bay.lib import ApiHandler
from tf2bay.models import Listing


class ListingDetail(ApiHandler):
    def get(self):
	listing_id = int(self.path_tail())
	listing = Listing.get_by_id(listing_id)
	if not listing:
	    self.error(404)
	    return
	self.write_json(listing.encode_builtin())


main = ApiHandler.make_main(ListingDetail)


if __name__ == '__main__':
    main()