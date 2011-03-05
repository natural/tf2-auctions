#!/usr/bin/env python
# -*- coding: utf-8 -*-
from google.appengine.api import users

from tf2auctions.lib import ApiHandler, user_steam_id
from tf2auctions.models import Bid, Feedback, Listing


class SaveFeedback(ApiHandler):
    def post(self):
	try:
	    vs = self.body_json()
	    source, bid, listing, rating, text = \
		    vs['source'], vs['bid'], vs['listing'], int(vs['rating']), vs['text'][0:400]
	    user = users.get_current_user()
	    bid = Bid.get(bid)
	    listing = Listing.get(listing)
	    fb = Feedback.get_by_source(bid, listing, user_steam_id(user))
	    if rating > 100 or rating < -100:
		raise TypeError('Invalid feedback rating')
	    if source == 'lister':
		## lister is adding feedback for bidder; target is bid owner
		target = bid.owner
	    elif source == 'bidder':
		## bidder is adding feedback for lister; target is listing owner
		target = listing.owner
	    else:
		raise TypeError('Invalid feedback source')
	    source = user_steam_id(user)
            if fb:
		#raise TypeError('Feedback exists')
                fb.rating = rating
                fb.comment = text
                fb.put()
            else:
                fb = Feedback.build(bid, listing, source, target, rating, text)
	except (Exception, ), exc:
	    self.error(500)
	    raise
	    exc = exc.message if hasattr(exc, 'message') else str(exc)
	    result = {'msg':'error', 'description':exc}
	else:
	    result = fb.encode_builtin()
	return self.write_json(result)


main = ApiHandler.make_main(SaveFeedback)


if __name__ == '__main__':
    main()

