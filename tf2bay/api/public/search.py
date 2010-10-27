#!/usr/bin/env python
# -*- coding: utf-8 -*-
from cgi import parse_qs
from tf2bay.lib import ApiHandler
from tf2bay.models import Listing


class ListingSearch(object):
    limit = 5
    orders = {
	'created' : ('New', lambda q:q.order('-created')),
	'expires' : ('Expires', lambda q:q.order('expires')),
    }
    filters = (
	('hat', 'Hats', lambda q: q.filter('category_hat = ', True)),
	('weapon', 'Weapons',  lambda q: q.filter('category_weapon = ', True)),
	('tool', 'Tools', lambda q: q.filter('category_tool = ', True)),
	('craft_bar', 'Metal', lambda q: q.filter('category_craft_bar = ', True)),
	('craft_token', 'Tokens', lambda q: q.filter('category_craft_token = ', True)),
	('supply_crate', 'Crates', lambda q: q.filter('category_supply_crate = ', True)),
    )

    def __init__(self, query_string, status='active'):
	self.qs = query_string
	self.q = Listing.all().filter('status = ', status)
	self.apply_qs(query_string)

    def apply_qs(self, qs):
	for key, title, filt in self.filters:
	    if qs.get(key, [''])[0] == 'on':
		filt(self.q)
	sort = qs.get('sort', ['created'])[0]
	title, order = self.orders.get(sort, self.orders['created'])
	if order:
	    order(self.q)
	if 'c' in qs:
	    self.q.with_cursor(qs['c'][0])

    def run(self):
	listings = [lst.encode_builtin() for lst in self.q.fetch(self.limit)]
	return listings, self.next_qs(), self.more()

    def next_qs(self):
	cursor = self.q.cursor()
	parts = ['%s=%s' % (k, vs[0]) for k, vs in self.qs.items() if k != 'c']
	parts.append('c=%s' % cursor)
	return str.join('&', parts)

    def more(self):
	return bool(self.q.fetch(1, self.limit+1))

    def filter_items(self):
	return [(k, t) for k, t, f in self.filters]

    def order_items(self):
	return [(k, t) for k, (t, f) in sorted(self.orders.items())]


class ListingSearchHandler(ApiHandler):
    def get(self):
	search = ListingSearch(parse_qs(self.request.query_string))
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
