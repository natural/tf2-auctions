#!/usr/bin/env python
# -*- coding: utf-8 -*-
from logging import warn
from tf2bay.models import Listing, ListingItem
from tf2bay.utils import json
from tf2bay.views import PageHandler


class PublicApi(PageHandler):
    methods = {
	'get-listings' : 'get_listings',
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
	return json.dumps([listing.native_repr() for listing in listings], indent=4)

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
	warn('AuctionApi %s', method)
	self.response.out.write('{"auction-method": %s}' % (method.__name__, ))

    def add_listing(self):
	pass

    def cancel_listing(self):
	pass

    def add_bid(self):
	pass
