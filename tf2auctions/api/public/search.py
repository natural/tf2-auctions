#!/usr/bin/env python
# -*- coding: utf-8 -*-
from cgi import parse_qs

from tf2auctions.lib import ApiHandler
from tf2auctions.lib.schematools import known_categories
from tf2auctions.models import Listing, ListingItem


class ListingSearch(object):
    limit = 5
    orders = {
	'created' : ('New', lambda q:q.order('-created')),
	'expires' : ('Expires', lambda q:q.order('expires')),
    }
    __filters = (
	('hat', 'Hats', lambda q: q.filter('category_hat = ', True)),
	('weapon', 'Weapons',  lambda q: q.filter('category_weapon = ', True)),
	('tool', 'Tools', lambda q: q.filter('category_tool = ', True)),
	('craft_bar', 'Metal', lambda q: q.filter('category_craft_bar = ', True)),
	('craft_token', 'Tokens', lambda q: q.filter('category_craft_token = ', True)),
	('supply_crate', 'Crates', lambda q: q.filter('category_supply_crate = ', True)),
    )

    def __init__(self, query_string):
	self.qs = query_string

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
	for key, title in self.filter_items():
	    if qs.get(key, [''])[0] == 'on':
		q.filter('categories =', key)
	sort = qs.get('sort', ['created'])[0]
	title, order = self.orders.get(sort, self.orders['created'])
	if order:
	    order(q)
	if 'c' in qs:
	    q.with_cursor(qs['c'][0])
	listings = [lst.encode_builtin() for lst in q.fetch(self.limit)]
	return listings, self.next_qs(q, qs), self.more(q)


class AdvancedSearch(ListingSearch):
    limit = 100
    max_defs = 3

    def run(self):
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


def buildSearch(raw_qs):
    qs = parse_qs(raw_qs)
    return AdvancedSearch(qs) if 'di' in qs else BasicSearch(qs)


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
