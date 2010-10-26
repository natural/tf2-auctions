#!/usr/bin/env python
# -*- coding: utf-8 -*-
from cgi import parse_qs
from tf2bay.lib import ApiHandler
from tf2bay.models import ListingSearch


class Search(ApiHandler):
    def get(self):
	search = ListingSearch(parse_qs(self.request.query_string))
	listings, cursor, next_qs = search()
	self.write_json({
	    'listings' : [lst.encode_builtin() for lst in listings],
	    'more' : search.more(),
	    'filters' : [(key, title) for key, title, func in search.filters],
	    'orders' : [(key, title) for key, (title, func) in sorted(search.orders.items())],
	    'next_qs' : next_qs,
	})


main = ApiHandler.make_main(Search)


if __name__ == '__main__':
    main()
