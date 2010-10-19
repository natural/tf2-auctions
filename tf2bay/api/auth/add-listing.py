#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2bay.lib import ApiHandler
from tf2bay.models import Listing


class AddListing(ApiHandler):
    def post(self):
	try:
	    listing = self.body_json()
	    items = listing['items']
	    item_ids = [(i['id'], i) for i in items]
	    if len(item_ids) != len(items):
		raise TypeError('Missing item identifiers.')
	    desc = listing['desc'][0:400]
	    days = listing['days'] + 0 # force exception
	    if days < 0 or days > 30:
		raise TypeError('Invalid duration.')
	    min_bid = [b+0 for b in listing['min_bid']] # again, force an exception
	    key = Listing.build(item_ids=item_ids, desc=desc, days=days, min_bid=min_bid)
	except (Exception, ), exc:
	    self.error(500)
	    exc = exc.message if hasattr(exc, 'message') else str(exc)
	    result = {'msg':'error', 'description':exc}
	else:
	    result = {'msg':'success', 'key':key.id()}
	return self.write_json(result)


main = ApiHandler.make_main(AddListing)


if __name__ == '__main__':
    main()
