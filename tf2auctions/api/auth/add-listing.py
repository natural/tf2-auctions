#!/usr/bin/env python
# -*- coding: utf-8 -*-
from logging import error

from tf2auctions.lib import ApiHandler
from tf2auctions.models import Listing


class AddListing(ApiHandler):
    def post(self):
	try:
	    data = self.body_json()
	    items = data['items']
	    item_ids = [(i['id'], i) for i in items]
	    if len(item_ids) != len(items):
		raise TypeError('Missing item identifiers.')
	    desc = data['desc'][0:400]
	    days = data['days'] + 0 # force exception
	    if days < 0 or days > 30:
		raise TypeError('Invalid duration.')
	    min_bid = [b+0 for b in data['min_bid']] # again, force an exception
	    key = Listing.build(item_ids=item_ids, desc=desc, days=days, min_bid=min_bid,
				min_bid_dollar_use=data.get('min_bid_dollar_use'),
				min_bid_dollar_amount=data.get('min_bid_dollar_amount'),
				feature_listing=data.get('feature_listing'))
	except (Exception, ), exc:
	    error('add listing: %s', exc)
	    self.error(500)
	    exc = exc.message if hasattr(exc, 'message') else str(exc)
	    result = {'msg':'error', 'description':exc}
	else:
	    result = {'msg':'success', 'key':key.id()}
	return self.write_json(result)


main = ApiHandler.make_main(AddListing)


if __name__ == '__main__':
    main()
