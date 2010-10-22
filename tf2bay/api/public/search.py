#!/usr/bin/env python
# -*- coding: utf-8 -*-
from cgi import parse_qs
from tf2bay.lib import ApiHandler
from tf2bay.models import Listing, category_filters



class Search(ApiHandler):
    def get(self):
	qs = parse_qs(self.request.query_string)
	q = Listing.all().filter('status = ', 'active').order('-created')

	for key, title, filt in category_filters:
	    if qs.get(key, [''])[0] == 'on':
		filt(q)

	## get offset, count, etc
	listings = q.fetch(limit=100)
	results = {
	    'listings' : [n.encode_builtin() for n in listings],
	    'cursor' : q.cursor(),
	    'count' : q.count(101),
	    }
	self.write_json(results)


main = ApiHandler.make_main(Search)


if __name__ == '__main__':
    main()
