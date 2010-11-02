#!/usr/bin/env python
# -*- coding: utf-8 -*-
from datetime import datetime, timedelta
from logging import exception, info

from google.appengine.api import users
from google.appengine.api.labs import taskqueue
from google.appengine.ext import db
from google.appengine.ext.db import polymodel

from tf2bay.lib import json, user_steam_id, schematools, js_datetime, devel
from tf2bay.models.feedback import Feedback
from tf2bay.models.profile import PlayerProfile
from tf2bay.models.proxyutils import fetch


class Listing(db.Model):
    """ Listing -> records of items up for trade.

    There's still some work to be done on, well, reading, writing,
    updating and deleting.
    """
    owner = db.StringProperty('Owner', required=True, indexed=True)
    created = db.DateTimeProperty('Created', required=True, auto_now_add=True)
    expires = db.DateTimeProperty('Expires', required=True)
    min_bid = db.ListProperty(long, 'Minimum Bid')
    description = db.StringProperty('Description', default='', multiline=True)

    ## non-normalized:  listing status and reason
    status = db.StringProperty('Status', required=True, default='active', indexed=True)
    status_reason = db.StringProperty('Status Reason', required=True, default='Created by system.')

    ## non-normalized: specific categories for fast searches
    categories = db.StringListProperty(indexed=True)

    #category_craft_bar = db.BooleanProperty(indexed=True, default=False)
    #category_craft_token = db.BooleanProperty(indexed=True, default=False)
    #category_hat = db.BooleanProperty(indexed=True, default=False)
    #category_supply_crate = db.BooleanProperty(indexed=True, default=False)
    #category_tool = db.BooleanProperty(indexed=True, default=False)
    #category_weapon = db.BooleanProperty(indexed=True, default=False)

    ## non-normalized: bid counter
    bid_count = db.IntegerProperty('Bid Count', default=0)

    @classmethod
    def build(cls, **kwds):
	## 0.  verify the owner, duration and description before
	## we do anything else (to prevent needless expensive checks).
        ## like the listing item, we need to get the profile before
	## we run the transaction.
	owner = users.get_current_user()
	if not owner:
	    raise ValueError('No owner specified.')
	kwds['owner'] = user_steam_id(owner)
	kwds['profile'] = PlayerProfile.get_by_user(user_steam_id(owner))

	## this check has to be performed outside of the transaction
	## because its against items outside the new listing ancestry:

	item_ids = kwds['item_ids']
	for uid, item in item_ids:
	    q = ListingItem.all(keys_only=True)
	    if q.filter('uniqueid', uid).filter('status', 'active').get():
		raise TypeError('Item already in an active auction.')
	    q = BidItem.all(keys_only=True)
	    if q.filter('uniqueid', uid).filter('status', 'active').get():
		raise TypeError('Item already in an active bid.')

	return db.run_in_transaction(cls.build_transaction, **kwds)

    @classmethod
    def build_transaction(cls, owner, profile, item_ids, desc, days, min_bid=None):
	## 1.  check the user, get their backpack and verify the
	## inidicated items belong to them.
	if not profile.owns_all(uid for uid, item in item_ids):
	    ## TODO: re-fetch backpack.  will probably need to move
	    ## backpack feed into this site for that to work.
	    raise ValueError('Incorrect ownership.')

	## 2. check the date
	if days not in cls.valid_days:
	    raise ValueError('Invalid number of days until expiration.')

	## regulation 46a:
	delta = timedelta(minutes=days) if devel else timedelta(days=days)
	expires = datetime.now() + delta

	## 3.  extract and create categories for the ListingItem
	## item types and for the min_bid defindex checks.
	schema = json.loads(fetch.schema())

	## 4. verify the min_bid values are present in the schema.
	min_bid = min_bid or []
	min_bid_defs = set(min_bid)
        valid_defs = set(i['defindex'] for i in schema['result']['items']['item'])
	if not (min_bid_defs & valid_defs == min_bid_defs):
	    raise TypeError('Invalid minimum bid items.')

	## 4.  create.  note that we're not setting a parent entity so
	## that we can query for the listing by id.
	listing = cls(
	    owner=owner,
	    expires=expires,
	    min_bid=min_bid,
	    description=desc)

	## 4a.  derive categories
	cats = schematools.item_categories([i for u, i in item_ids], schema)
	listing.categories =\
	    [cat for cat, ttl in schematools.known_categories if cat in cats]
	key = listing.put()
	info('created new listing at: %s', listing.created)

	# 5. assign the items
	item_types = schematools.item_type_map(schema)
	for uid, item in item_ids:
	    listing_item = ListingItem(
		parent=listing,
		uniqueid=uid,
		defindex=item['defindex'],
		source=json.dumps(item),
		item_type_name=item_types[item['defindex']],
		listing=listing)
	    listing_item.put()

	## 6.  submit an item to the expiration task queue.
	taskqueue.add(
	    url='/api/v1/admin/queue/expire-listing',
	    transactional=True,
	    queue_name='expiration',
	    eta=expires,
	    params={'key':key})
	taskqueue.add(
	    url='/api/v1/admin/queue/bang-counters',
	    transactional=True,
	    queue_name='counters',
	    params={'listings':1, 'listing_items':len(item_ids)})
	return key

    valid_days = range(1, 31) # 1-30

    def set_status(self, status, reason, set_items=True, set_bids=True):
	self.status = status
	self.status_reason = reason
	self.put()
	if set_items:
	    for item in self.items():
		item.status = status
		item.put()
	if set_bids:
	    for bid in self.bids():
		bid.set_status(status, reason)
		bid.put()

    def cancel(self, reason):
	status = self.status
	if status == 'active':
	    self.set_status('cancelled', reason, set_items=True, set_bids=True)

    def expire(self, reason):
	status = self.status
	if status == 'active':
	    if self.bid_count:
		## can't release the listing items or bid items yet
		## because no winner has been choosen:
		self.set_status('ended', reason, set_items=False, set_bids=False)
	    else:
		## release the listing items because there aren't any bids:
		self.set_status('ended', reason, set_items=True, set_bids=False)
	    ## TODO:  add task to move from 'expired' to 'ended'

	elif status == 'cancelled':
	    ## there is nothing to do.
	    pass

    def winner(self, bid_details):
	status = self.status
	if status == 'ended':
	    k = bid_details['key']
	    bid = Bid.get(k)
	    bid.set_status('awarded', 'Bid chosen as winner.')
	    for other in [b for b in self.bids() if str(b.key()) != k]:
		other.set_status('lost', 'Bid not chosen as winner.')
	    self.set_status('awarded', 'Listing awarded to chosen bid.', set_items=True, set_bids=False)

    def items(self):
	""" Returns the player items for this listing.

	Clients can't use self.listingitem_set because it returns the
	bid items, too.
	"""
	return ListingItem.all().filter('listing =', self).fetch(limit=100)

    def bids(self):
	""" Returns the bids for this listing.

	Clients can't use self.biditem_set because it returns the
	listing items, too.
	"""
	return Bid.all().filter('listing =', self).fetch(limit=100)

    def owner_profile(self):
	""" Returns the player profile for this listing. """
	return PlayerProfile.get_by_user(self.owner)

    def encode_builtin(self, bids=False, items=True):
	""" Encode this instance using only built-in types. """
	return {
	    'id' : self.key().id(),
	    'owner' : PlayerProfile.get_by_user(self.owner).encode_builtin(),
	    'created' : js_datetime(self.created),
	    'expires' : js_datetime(self.expires),
	    'description' : self.description,
	    'bid_count' : self.bid_count,
	    'min_bid' : self.min_bid,
	    'items' : [i.encode_builtin() for i in self.items()] if items else (),
	    'status' : self.status,
	    'status_reason' : self.status_reason,
	    'bids' : [b.encode_builtin() for b in self.bids()] if bids else (),
	}


class PlayerItem(polymodel.PolyModel):
    """ PlayerItem -> simple junction of player item unique ids and the
        corresponding schema defindex.

    The 'defindex' attribute is indexed for query speed.  This class
    is a PolyModel so it can be subclassed (see below).

    The 'uniqueid' is the integer decoded key name.
    """
    uniqueid = db.IntegerProperty('Item uniqueid', required=True, indexed=True)
    defindex = db.IntegerProperty('Item defindex', required=True, indexed=True)
    source = db.StringProperty('Item source data (JSON decodable)')

    def __str__(self):
	args = (self.uniqueid, self.defindex, )
	return '<PlayerItem uniqueid=%s, defindex=%s>' % args

    def encode_builtin(self):
	""" Encode this instance using only built-in types. """
	item = json.loads(self.source)
	this = {'uniqueid':self.uniqueid, 'defindex':self.defindex}
	this.update((k, item.get(k, None)) for k in ('level', 'quantity', 'quality'))
	return this

    @classmethod
    def get_by_uid(cls, uniqueid):
	""" Returns an item by uniqueid. """
	return cls.all().filter('uniqueid =', uniqueid).get()

    @classmethod
    def build(cls, uniqueid, defindex, **kwds):
	""" Returns an item by uniqueid. """
	return cls.get_or_insert(uniqueid=uniqueid, defindex=defindex, **kwds)



class ListingItem(PlayerItem):
    """ ListingItem -> player items associated with a Listing.

    """
    listing = db.ReferenceProperty(Listing, 'Parent Listing', required=True, indexed=True)
    ## non-normalized:
    status = db.StringProperty('Status', required=True, default='active', indexed=True)
    ## non-normalized:
    item_type_name = db.StringProperty('Item type name (schema value)', required=True, indexed=True)

    def __str__(self):
	args = (self.listing, self.uniqueid, self.defindex, )
	return '<ListingItem listing=%s, uniqueid=%s, defindex=%s>' % args



class Bid(db.Model):
    """ Bid -> a bid on a listing.

    """
    owner = db.StringProperty('Owner', required=True)
    created = db.DateTimeProperty('Created', required=True, auto_now_add=True)
    listing = db.ReferenceProperty(Listing, 'Parent Listing', required=True)
    message_private = db.StringProperty('Private message', multiline=True)
    message_public = db.StringProperty('Public message', multiline=True)
    status = db.StringProperty('Status', required=True, default='active', indexed=True)
    status_reason = db.StringProperty('Status Reason', required=True, default='Created by system.')

    @classmethod
    def build(cls, **kwds):
	owner = users.get_current_user()
	if not owner:
	    raise ValueError('No owner specified.')
	kwds['owner'] = user_steam_id(owner)
	kwds['profile'] = PlayerProfile.get_by_user(owner)
	item_ids = kwds['item_ids']
	for uid, item in item_ids:
	    q = ListingItem.all(keys_only=True)
	    if q.filter('uniqueid', uid).filter('status', 'active').get():
		raise TypeError('Item already in an active auction.')
	    q = BidItem.all(keys_only=True)
	    if q.filter('uniqueid', uid).filter('status', 'active').get():
		raise TypeError('Item already in an active bid.')
	listing_id = int(kwds.pop('listing_id'))
	listing = kwds['listing'] = Listing.get_by_id(listing_id)
	## TODO: check for existing bid by owner and disallow creating
	## multiple bids.
	if not listing:
	    raise TypeError('Invalid listing.')
	if listing.status != 'active':
	    raise TypeError('Invalid listing status.')
	key = db.run_in_transaction(cls.build_transaction, **kwds)
    	listing.bid_count += 1
	listing.put()
	return key


    @classmethod
    def build_transaction(cls, owner, profile, listing, item_ids, public_msg, private_msg):
	if not profile.owns_all(uid for uid, item in item_ids):
	    ## TODO: re-fetch backpack.  will probably need to move
	    ## backpack feed into this site for that to work.
	    raise ValueError('Incorrect ownership.')
	schema = json.loads(fetch.schema())
	bid = cls(owner=owner, listing=listing, message_private=private_msg, message_public=public_msg)
	key = bid.put()
	item_types = schematools.item_type_map(schema)
	for uid, item in item_ids:
	    bid_item = BidItem(
		parent=bid,
		uniqueid=uid,
		defindex=item['defindex'],
		source=json.dumps(item),
		item_type_name=item_types[item['defindex']],
		listing=listing,
		bid=bid)
	    bid_item.put()
	taskqueue.add(
	    url='/api/v1/admin/queue/bang-counters',
	    transactional=True,
	    queue_name='counters',
	    params={'bids':1, 'bid_items':len(item_ids)})
	return key

    @classmethod
    def build_update(cls, **kwds):
	owner = users.get_current_user()
	if not owner:
	    raise ValueError('No owner specified.')
	listing_id = int(kwds.pop('listing_id'))
	listing = kwds['listing'] = Listing.get_by_id(listing_id)
	if not listing:
	    raise TypeError('Invalid listing.')
	bid = kwds['bid'] = cls.all().filter('owner =', user_steam_id(owner)).filter('listing =', listing).get()
	if not bid:
	    raise ValueError('No existing bid to update.')
	kwds['owner'] = user_steam_id(owner)
	kwds['profile'] = PlayerProfile.get_by_user(owner)
	item_ids = kwds['item_ids']
	for uid, item in item_ids:
	    q = ListingItem.all(keys_only=True)
	    if q.filter('uniqueid', uid).filter('status', 'active').get():
		raise TypeError('Item already in an active auction.')
	    q = BidItem.all(keys_only=True)
	    if q.filter('uniqueid', uid).filter('status', 'active').get():
		raise TypeError('Item already in an active bid.')
	if listing.status != 'active':
	    raise TypeError('Invalid listing status.')
	key = db.run_in_transaction(cls.build_update_transaction, **kwds)
	return key

    @classmethod
    def build_update_transaction(cls, owner, profile, listing, bid, item_ids, public_msg, private_msg):
	if not profile.owns_all(uid for uid, item in item_ids):
	    ## TODO: re-fetch backpack.  will probably need to move
	    ## backpack feed into this site for that to work.
	    raise ValueError('Incorrect ownership.')
	schema = json.loads(fetch.schema())
	bid.message_public = public_msg
	bid.message_private = private_msg
	bid.put()
	item_types = schematools.item_type_map(schema)
	for uid, item in item_ids:
	    bid_item = BidItem(
		parent=bid,
		uniqueid=uid,
		defindex=item['defindex'],
		source=json.dumps(item),
		item_type_name=item_types[item['defindex']],
		listing=listing,
		bid=bid)
	    bid_item.put()
	taskqueue.add(
	    url='/api/v1/admin/queue/bang-counters',
	    transactional=True,
	    queue_name='counters',
	    params={'bid_items':len(item_ids)})
	return bid.key()


    def encode_builtin(self):
	return {
	    'owner' : PlayerProfile.get_by_user(self.owner).encode_builtin(),
	    'created' : js_datetime(self.created),
	    'message_public' : self.message_public,
	    'status' : self.status,
	    'items' : [i.encode_builtin() for i in self.items()],
	    'listing' : self.listing.encode_builtin(bids=False, items=False),
	    'key' : str(self.key()),
	    }

    def items(self):
	return BidItem.all().filter('bid = ', self).fetch(limit=100)

    def set_status(self, status, reason):
	self.status = status
	self.put()
	for bid_item in self.items():
	    bid_item.status = status
	    bid_item.put()


class BidItem(PlayerItem):
    """ BidItem -> player items associated with a Bid.

    """
    bid = db.ReferenceProperty(Bid, 'Parent Bid', required=True, indexed=True)
    ## non-normalized:
    listing = db.ReferenceProperty(Listing, 'Parent Listing', required=True, indexed=True)
    ## non-normalized:
    status = db.StringProperty('Status', required=True, default='active', indexed=True)

    def __str__(self):
	return '<BidItem listing=%s, uniqueid=%s, defindex=%s>' % (self.bid, self.uniqueid, self.defindex)
