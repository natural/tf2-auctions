#!/usr/bin/env python
# -*- coding: utf-8 -*-
from cgi import parse_qs

from tf2auctions.lib import ApiHandler, cache
from tf2auctions.lib.schematools import known_categories
from tf2auctions.models import Listing, ListingItem


class ListingSearch(object):
    limit = 10
    orders = {
	'created' : ('New', lambda q:q.order('-created')),
	'expires' : ('Expires', lambda q:q.order('expires')),
    }

    def __init__(self, query_string, raw_query_string):
	self.qs = query_string
	self.rqs = raw_query_string

    def filter_items(self):
	return known_categories

    def order_items(self):
	return [(k, t) for k, (t, f) in sorted(self.orders.items())]

    def more(self, q):
	return bool(q.fetch(1, self.limit+1))

    def next_qs(self, q, qs):
	parts = ['%s=%s' % (k, vs[0]) for k, vs in qs.items() if k != 'c']
	parts.append('c=%s' % q.cursor())
	return str.join('&', parts)


class BasicSearch(ListingSearch):
    def run(self):
	q = Listing.all().filter('status = ', 'active')
	qs = self.qs
	@cache(self.rqs, ttl=180)
	def inner_search():
	    for key, title in self.filter_items():
		if qs.get(key, [''])[0] == 'on':
		    q.filter('categories =', key)
	    sort = qs.get('sort', ['created'])[0]
	    title, order = self.orders.get(sort, self.orders['created'])
	    if order:
		order(q)
	    if 'c' in qs:
		q.with_cursor(qs['c'][0])
	    try:
		limit = min(self.limit, int(qs['limit'][0]))
	    except (Exception, ), exc:
		limit = self.limit
	    listings = [lst.encode_builtin() for lst in q.fetch(limit)]
	    return listings, self.next_qs(q, qs), self.more(q)

	return inner_search()


class AdvancedSearch(ListingSearch):
    limit = 20
    max_defs = 4

    def run(self):
	@cache(self.rqs, ttl=180)
	def inner_search():
	    listings, qs = [], self.qs
	    for di in qs.get('di', [])[0:self.max_defs]:
		try:
		    di = int(di)
		except (ValueError, ):
		    continue
		q = ListingItem.all(keys_only=True).filter('status = ', 'active')
		q.filter('defindex =', di)
		listings += Listing.get(i.parent() for i in q.fetch(self.limit))
	    listings = dict((lst.key(), lst) for lst in listings).values() ## remove dupes
	    listings.sort(key=lambda o:o.expires) ## TODO:  verify this is desired
	    listings = [lst.encode_builtin() for lst in listings]
	    return listings, '', False
	return inner_search()


def buildSearch(raw_qs):
    qs = parse_qs(raw_qs)
    return AdvancedSearch(qs, raw_qs) if 'di' in qs else BasicSearch(qs, raw_qs)


class ListingSearchHandler(ApiHandler):
    def get(self):
	search = buildSearch(self.request.query_string)
	listings, next_qs, more = search.run()
	self.write_json({
	    'filters' : search.filter_items(),
	    'listings' : listings,
	    'more' : more,
	    'next_qs' : next_qs,
	    'orders' : search.order_items(),
	})


main = ApiHandler.make_main(ListingSearchHandler)


if __name__ == '__main__':
    main()
