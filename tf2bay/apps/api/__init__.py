#!/usr/bin/env python
# -*- coding: utf-8 -*-
from logging import warn
from google.appengine.api import users

from tf2bay.apps import View
from tf2bay.models import Bid, Listing, ListingItem, PlayerProfile
from tf2bay.utils import json




class ListingDetail(View):
    def get(self, listing_id):
	listing_id = int(listing_id)
	listing = Listing.get_by_id(listing_id)
	if not listing:
	    self.error(404)
	    return
	self.response.out.write( json.dumps(listing.encode_builtin(), indent=4))


class ListingEditor(View):
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
	    min_bid = [b+0 for b in listing['min_bid']] # again, force an exception
	    key = Listing.build(item_ids=item_ids, desc=desc, days=days, min_bid=min_bid)
	except (Exception, ), exc:
	    self.error(500)
	    exc = exc.message if hasattr(exc, 'message') else str(exc)
	    result = {'msg':'error', 'description':exc}
	else:
	    result = {'msg':'success', 'key':key.id_or_name(), }
	return json.dumps(result)

    def cancel_listing(self):
	pass

    def add_bid(self):
	pass


class PublicQ(View):
    def get(self, kind, id64):
	q = None
	if kind == 'player-listings':
	    q = Listing.all()
	elif kind == 'player-bids':
	    q = Bid.all()
	if q is not None:
	    q.filter('owner = ', users.User(id64))
	    rs = [r.encode_builtin() for r in q.fetch(limit=100)]
	else:
	    rs = ()
	self.response.out.write(json.dumps(rs, indent=4))


class Expire(View):
    pass



class Profile(View):
    def get(self):
	try:
	    profile = PlayerProfile.get_by_user(users.get_current_user())
	    self.response.out.write(json.dumps(profile.encode_builtin()))
	except (Exception, ), exc:
	    self.error(500)
	    self.response.out.write(json.dumps({'exception':str(exc)}))



class Search(View):
    def get(self):
	from logging import warn
	q = Listing.all()
	warn('%s', q)
	listings = q.fetch(limit=10)
	warn('%s', listings)
	self.response.out.write(json.dumps([n.encode_builtin() for n in listings], indent=4))


