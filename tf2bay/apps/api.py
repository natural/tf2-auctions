#!/usr/bin/env python
# -*- coding: utf-8 -*-
from logging import warn
from google.appengine.api import users

from tf2bay.apps import PageHandler
from tf2bay.models import Bid, Listing, ListingItem, build_listing
from tf2bay.utils import json



class PublicApi(PageHandler):
    methods = {
	'browse-listings' : 'get_listings',
        'search-listings' : 'search_listings',
    }

    def get(self, method=None, **kwds):
	method = self.methods.get(method)
	if not method:
	    self.error(404)
	    return
	method = getattr(self, method)
	warn('PublicApi %s', method)
	self.response.out.write(method(**kwds))

    def post(self, *args, **kwds):
	self.error(404)

    def get_listings(self, **kwds):
	q = Listing.all()
	listings = q.fetch(limit=10)
	return json.dumps([n.encode_builtin() for n in listings], indent=4)

    def search_listings(self, **kwds):
	pass



class AuctionApi(PageHandler):
    methods = {
	'add-bid' : 'add_bid',
	'add-listing' : 'add_listing',
        'cancel-listing' : 'cancel_listing',
    }

    def get(self, *args, **kwds):
	self.error(404)

    def post(self, method=None):
	method = self.methods.get(method)
	if not method:
	    self.error(404)
	    return
	method = getattr(self, method)
	self.response.out.write(method())

    def add_listing(self):
	try:
	    listing = json.loads(self.request.body)

	    items = listing['items']
	    item_ids = [(i['id'], i) for i in items]
	    if len(item_ids) != len(items):
		raise TypeError('Missing item identifiers.')
	    desc = listing['desc'][0:400]
	    days = listing['days'] + 0 # force exception
	    if days < 0 or days > 30:
		raise TypeError('Invalid duration.')
	    minbid = [b+0 for b in listing['minbid']] # again, force an exception
	    key, listing = build_listing(item_ids=item_ids, desc=desc, days=days, minbid=minbid)
	except (Exception, ), exc:
	    self.error(500)
	    raise
	    exc = exc.message if hasattr(exc, 'message') else str(exc)
	    result = {'msg':'error', 'description':exc}
	else:
	    warn('add listing: \n%s\n', json.dumps(listing.encode_builtin(), indent=4))
	    result = {'msg':'success', 'key':key.id_or_name(), }
	return json.dumps(result)

    def cancel_listing(self):
	pass

    def add_bid(self):
	pass


class PublicQueryApi(PageHandler):
    def get(self, kind, id64):
	q = None
	if kind == 'listings':
	    q = Listing.all()
	elif kind == 'bids':
	    q = Bid.all()
	if q is not None:
	    q.filter('owner = ', users.User(id64))
	    rs = [r.encode_builtin() for r in q.fetch(limit=100)]
	else:
	    rs = ()
	self.response.out.write(json.dumps(rs, indent=4))
