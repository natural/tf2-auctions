#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2bay.lib import ApiHandler
from tf2bay.models import Bid


class AddBid(ApiHandler):
    def post(self):
	try:
	    bid = self.body_json()
	    items = bid['items']
	    item_ids = [(i['id'], i) for i in items]
	    if len(item_ids) != len(items):
		raise TypeError('Missing item identifiers.')
	    public_msg = bid['public_msg'][0:400]
	    private_msg = bid['private_msg'][0:400]
	    key = Bid.build(item_ids=item_ids, public_msg=public_msg, private_msg=private_msg, listing_id=bid['id'])
	except (Exception, ), exc:
	    self.error(500)
	    exc = exc.message if hasattr(exc, 'message') else str(exc)
	    result = {'msg':'error', 'description':exc}
	else:
	    result = {'msg':'success', 'key':key.id()}
	return self.write_json(result)


main = ApiHandler.make_main(AddBid)


if __name__ == '__main__':
    main()
