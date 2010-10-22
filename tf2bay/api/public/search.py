#!/usr/bin/env python
# -*- coding: utf-8 -*-
from cgi import parse_qs
from tf2bay.lib import ApiHandler
from tf2bay.models import Listing, category_filters


class Search(ApiHandler):
    max_fetch = 20

    def get(self):
	qs = parse_qs(self.request.query_string)
	mf = self.max_fetch

	if 'c' in qs:
	    #results = cursor search
	    pass
	else:
	    q = Listing.all().filter('status = ', 'active')
	    for key, title, filt in category_filters:
		if qs.get(key, [''])[0] == 'on':
		    filt(q)
	    listings = q.fetch(limit=mf+1)
	    listings = [n.encode_builtin() for n in listings][0:mf]
	    results = {
		'listings' : listings,
		'cursor' : q.cursor(),
		'more' : len(listings)==mf+1,
	    }
	self.write_json(results)


main = ApiHandler.make_main(Search)


if __name__ == '__main__':
    main()
