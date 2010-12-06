#!/usr/bin/env python
# -*- coding: utf-8 -*-
from logging import warn
from wsgiref.util import application_uri

from tf2auctions.api.public.search import buildSearch
from tf2auctions.lib import RssView, make_main, json_loads
from tf2auctions.lib.proxyutils import fetch
from tf2auctions.lib.schematools import def_map

class FrontRss(RssView):
    title = 'TF2 Auctions New Listings'
    description = 'A small sample of the newest listings from tf2auctions.com'

    @property
    def url(self):
	return self.request.url

    def items(self):
	search = buildSearch('?limit=3')
	try:
	    schema_defs = def_map(json_loads(fetch.schema()))
	except:
	    schema_defs = {}
	listings, next_qs, more = search.run(encoded=False)
	prefix = application_uri(self.request.environ)
	def inner():
	    for listing in listings:
		listing_items_desc = '<br />'.join(i.simple_desc(schema_defs) for i in listing.items())
		listing_id = listing.key().id()
		desc = '%s<br />%s' % (listing.description, listing_items_desc)
		yield {'title' : 'TF2 Auctions Listing %s' % listing_id,
		       'link' : '%slistings/%s' % (prefix, listing_id),
		       'description' : listing_items_desc,
		       'pub_date' : listing.created,
		       'guid' : listing.key()
		       }

	return list(inner())


main = make_main(FrontRss)


if __name__ == '__main__':
    main()
