#!/usr/bin/env python
# -*- coding: utf-8 -*-
from datetime import datetime, timedelta
from logging import exception, info

from google.appengine.api import users
from google.appengine.ext import db
from google.appengine.ext.db import polymodel

from tf2auctions import features
from tf2auctions.lib import json_dumps, json_loads, js_datetime, user_steam_id, currency_types
from tf2auctions.lib.proxyutils import fetch
from tf2auctions.lib.schematools import item_categories, item_type_map, known_categories
from tf2auctions.models.profile import PlayerProfile
from tf2auctions.models.utils import add_filters, queue_tool


class Listing(db.Model):
    """ Listing -> records of items up for trade.

    """
    valid_days = range(1, 31) # 1-30
    lazy_verify = True

    ## member fields:
    owner = db.StringProperty('Owner', required=True, indexed=True)
    created = db.DateTimeProperty('Created', required=True, auto_now_add=True)
    expires = db.DateTimeProperty('Expires', required=True)
    min_bid = db.ListProperty(long, 'Minimum Bid')
    description = db.StringProperty('Description', default='', multiline=True)
    status = db.StringProperty('Status', required=True, default='active', indexed=True)
    status_reason = db.StringProperty('Status Reason', required=True, default='Created by system.')
    categories = db.StringListProperty(indexed=True)
    bid_count = db.IntegerProperty('Bid Count', default=0)

    ## subscriber fields:
    bid_currency_use = db.BooleanProperty('Bids as Currency', default=False)
    bid_currency_start = db.FloatProperty('Currency Bids Start Amount', default=0.0)
    bid_currency_type = db.StringProperty('Bid Currency Type', default='')
    bid_currency_top = db.FloatProperty('Current Top Bid', default=0.0)

    featured = db.BooleanProperty('Featured Listing', indexed=True, default=False)

    @classmethod
    def build(cls, **kwds):
	## 0.  verify the owner, duration and description before
	## we do anything else (to prevent needless expensive checks).
        ## like the listing item, we need to get the profile before
	## we run the transaction.
	owner = users.get_current_user()
	if not owner:
	    raise ValueError('No owner specified.')
	kwds['owner'] = id64 = user_steam_id(owner)
	if not cls.lazy_verify:
	    kwds['profile'] = profile = PlayerProfile.get_by_user(user_steam_id(owner))
	    profile.refresh()
	else:
	    kwds['profile'] = None
	kwds['is_subscriber'] = PlayerProfile.is_subscriber_id64(id64)

	## this check has to be performed outside of the transaction
	## because its against items outside the new listing ancestry.
	## this whole check should move to a
	## "maybe-cancel-invalid-new-listing" queue:
	verify_items_inactive(uid for uid, item in kwds['item_ids'])
	return db.run_in_transaction(cls.build_transaction, **kwds)

    @classmethod
    def build_transaction(cls, owner, profile, item_ids, desc, days, min_bid=None,
			  is_subscriber=False,
			  bid_currency_use=False,
			  bid_currency_start=0,
			  bid_currency_type='',
			  feature_listing=False):
	## 1.  check the user, get their backpack and verify the
	## inidicated items belong to them.
	if not cls.lazy_verify:
	    if not profile.owns_all(uid for uid, item in item_ids):
		raise ValueError('Incorrect ownership.')

	## 2. check the date
	if days not in cls.valid_days:
	    raise ValueError('Invalid number of days until expiration.')

	## regulation 46a:
	delta = timedelta(minutes=days*4) if features.devel else timedelta(days=days)
	expires = datetime.now() + delta

	## 3.  extract and create categories for the ListingItem
	## item types and for the min_bid defindex checks.
	schema = json_loads(fetch.schema())

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
	cats = item_categories([i for u, i in item_ids], schema)
	listing.categories =\
	    [cat for cat, ttl in known_categories if cat in cats]

	## 4b.  set subscriber features:
	if is_subscriber:
	    listing.bid_currency_use = bid_currency_use
	    listing.bid_currency_start = float(bid_currency_start)
	    listing.bid_currency_type = bid_currency_type
            ## listing.bid_currency_top == 0 by default
	    listing.featured = feature_listing

	key = listing.put()
	info('created new listing at: %s', listing.created)

	# 5. assign the items
	item_types = item_type_map(schema)
	for uid, item in item_ids:
	    uid = str(uid)
	    listing_item = ListingItem(
		parent=listing,
		uniqueid=uid,
		defindex=item['defindex'],
		source=json_dumps(item),
		item_type_name=item_types[item['defindex']],
		listing=listing)
	    listing_item.put()

	## 6.  submit an item to the expiration task queue.
	queue_tool.end_listing(key, expires, transactional=True)

	## 7.  submit an item to the re-verification task queue.
	queue_tool.reverify_items({'key':key, 'action':'init', 'type':'listing'}, transactional=True)

	## 8.  submit an item to the counter banging task queue.
	queue_tool.bang_counters({'listings':1, 'listing_items':len(item_ids)}, transactional=True)

	## 9. submit an item to the subscriber notification queue
	queue_tool.notify_listing(subscription_key=None, listing_key=key, transactional=True)

        ## 10. submit an item to the external share queue
        if not features.devel:
            queue_tool.external_share(listing_key=key, transactional=True)
	return key

    @classmethod
    def basic_query(cls, status='active'):
	return cls.all().filter('status = ', status)

    def cancel(self, reason=''):
	""" Workflow function to cancel a listing.  Called by the user
	    via a script.

	"""
	status = self.status
	if status == 'active':
	    self.set_status('cancelled', reason, set_items=True, set_bids=True)

    def end(self, reason):
	""" Workflow function to end a listing.  Called by the task
	    queue when the listing goes past it's expiration time.

	"""
	status = self.status
	if status == 'active':
	    if self.bid_count:
		## can't release the listing items or bid items yet
		## because no winner has been choosen:
		## FIXED (now releases items and bid items)
		self.set_status('ended', reason, set_items=True, set_bids=True)
		queue_tool.expire_listing(str(self.key()), datetime.now() + timedelta(days=1))
	    else:
		self.status = 'ended'
		self.expire('Expired with no bids')

    def expire(self, reason):
	""" Workflow function to expire a listing.  Called by the task
	    queue sometime after the auction has ended.
	"""
	status = self.status
	if status == 'ended':
	    if self.bid_count:
		self.set_status('expired', reason, set_items=True, set_bids=True)
	    else:
		## release the listing items because there aren't any bids:
		self.set_status('expired', reason, set_items=True, set_bids=False)

    def winner(self, bid_details):
	""" Workflow function to award a listing.  Called by the user
	    via a script.

	"""
	status = self.status
	if status == 'ended' or status == 'active':
	    k = bid_details['key']
	    bid = Bid.get(k)
	    bid.set_status('awarded', 'Bid chosen as winner.')
	    for other in [b for b in self.bids() if str(b.key()) != k]:
		other.set_status('lost', 'Bid not chosen as winner.')
	    self.set_status('awarded', 'Listing awarded to chosen bid.', set_items=True, set_bids=False)
            queue_tool.notify_win({'bid':k})

    def set_status(self, status, reason, set_items=True, set_bids=True):
	""" Common workflow transition routine.

	"""
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
	""" Returns the player profile for this listing.

	"""
	return PlayerProfile.get_by_user(self.owner)

    def update_top(self, put=True):
        bids = self.bids()
        top = max(bid.currency_val for bid in bids) if bids else 0
        self.bid_currency_top = float(top)
        if put:
            self.put()

    def url(self):
	return 'http://www.tf2auctions.com/listing/%s' % (self.key().id(), )

    def encode_builtin(self, bids=False, items=True, feedback=True, currency_type_map=dict(currency_types())):
	""" Encode this instance using only built-in types.

	"""
	key = self.key()
	bids = self.bids() if bids else ()
	wins = [b for b in bids if b.status == 'awarded']
        bfb = Feedback.get_by_listing(self) if feedback else ()
	user = users.get_current_user()
	private = False
	if bids and user and user_steam_id(user) == self.owner:
	    private = True
        try:
            currency_type = currency_type_map[self.bid_currency_type]
        except (KeyError, ):
            currency_type = None
	return {
	    'id' : key.id(),
	    'key': str(key),
	    'owner' : PlayerProfile.get_by_user(self.owner).encode_builtin(subscription=False),
	    'created' : js_datetime(self.created),
	    'expires' : js_datetime(self.expires),
	    'description' : self.description,
	    'bid_count' : self.bid_count,
	    'min_bid' : self.min_bid,
	    'items' : [i.encode_builtin() for i in self.items()] if items else (),
	    'status' : self.status,
	    'status_reason' : self.status_reason,
	    'bids' : [b.encode_builtin(listing=False, private=private) for b in bids],
	    'feedback' : [fb.encode_builtin() for fb in bfb],
	    'featured' : self.featured,
	    'bid_currency_use' : self.bid_currency_use,
	    'bid_currency_start' : self.bid_currency_start,
	    'bid_currency_type' : currency_type,
            'bid_currency_top' : self.bid_currency_top,
	}


class PlayerItem(polymodel.PolyModel):
    """ PlayerItem -> simple junction of player item unique ids and the
        corresponding schema defindex.

    The 'defindex' attribute is indexed for query speed.  This class
    is a PolyModel so it can be subclassed (see below).
    """
    uniqueid = db.StringProperty('Item uniqueid', required=True, indexed=True)
    defindex = db.IntegerProperty('Item defindex', required=True, indexed=True)
    source = db.StringProperty('Item source data (JSON decodable)')

    def __str__(self):
	args = (self.uniqueid, self.defindex, )
	return '<PlayerItem uniqueid=%s, defindex=%s>' % args

    def encode_builtin(self):
	""" Encode this instance using only built-in types. """
	item = json_loads(self.source)
	this = {'uniqueid':self.uniqueid, 'defindex':self.defindex}
	this.update((k, item.get(k)) for k in
		    ('attributes', 'level', 'quantity', 'quality', 'inventory', 'custom_name', 'custom_desc'))
	return this

    @classmethod
    def get_by_uid(cls, uniqueid):
	""" Returns an item by uniqueid. """
	return cls.all().filter('uniqueid =', str(uniqueid)).get()

    @classmethod
    def build(cls, uniqueid, defindex, **kwds):
	""" Returns an item by uniqueid. """
	return cls.get_or_insert(uniqueid=str(uniqueid), defindex=defindex, **kwds)


class ListingItem(PlayerItem):
    """ ListingItem -> player items associated with a Listing.

    """
    listing = db.ReferenceProperty(Listing, 'Parent Listing', required=True, indexed=True)
    status = db.StringProperty('Status', required=True, default='active', indexed=True)
    item_type_name = db.StringProperty('Item type name (schema value)', required=True, indexed=True)

    def __str__(self):
	args = (self.listing, self.uniqueid, self.defindex, )
	return '<ListingItem listing=%s, uniqueid=%s, defindex=%s>' % args

    def simple_desc(self, lookup=None):
	defindex = self.defindex
	if lookup:
	    item = lookup[defindex]
	else:
	    item = str(defindex)
	return str(item)


class Bid(db.Model):
    """ Bid -> a bid on a listing.

    """
    lazy_verify = True

    owner = db.StringProperty('Owner', required=True)
    created = db.DateTimeProperty('Created', required=True, auto_now_add=True)
    listing = db.ReferenceProperty(Listing, 'Parent Listing', required=True)
    message_private = db.StringProperty('Private message', multiline=True)
    message_public = db.StringProperty('Public message', multiline=True)
    status = db.StringProperty('Status', required=True, default='active', indexed=True)
    status_reason = db.StringProperty('Status Reason', required=True, default='Created by system.')
    currency_val = db.FloatProperty('Bid currency value', default=0.0)

    @classmethod
    def build(cls, **kwds):
	owner = users.get_current_user()
	if not owner:
	    raise ValueError('No owner specified.')
	kwds['owner'] = user_steam_id(owner)

	if not cls.lazy_verify:
	    kwds['profile'] = profile = PlayerProfile.get_by_user(owner)
	    profile.refresh()
	else:
	    kwds['profile'] = None

	verify_items_inactive(uid for uid, item in kwds['item_ids'])
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
        listing.update_top(put=False)
	listing.put()
	return key


    @classmethod
    def build_transaction(cls, owner, profile, listing, item_ids, public_msg, private_msg, currency_val):
	if not cls.lazy_verify:
	    if not profile.owns_all(uid for uid, item in item_ids):
		raise ValueError('Incorrect ownership.')
	schema = json_loads(fetch.schema())
	bid = cls(owner=owner, listing=listing, message_private=private_msg, message_public=public_msg, currency_val=currency_val)
	key = bid.put()
	item_types = item_type_map(schema)
	for uid, item in item_ids:
	    uid = str(uid)
	    bid_item = BidItem(
		parent=bid,
		uniqueid=uid,
		defindex=item['defindex'],
		source=json_dumps(item),
		item_type_name=item_types[item['defindex']],
		listing=listing,
		bid=bid)
	    bid_item.put()
	queue_tool.bang_counters({'bids':1, 'bid_items':len(item_ids)}, transactional=True)
	queue_tool.reverify_items({'key':key, 'action':'init', 'type':'bid'}, transactional=True)
	queue_tool.notify_bid({'bid':key, 'update':False}, transactional=True)
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
	if listing.status != 'active':
	    raise TypeError('Invalid listing status.')
	bid = kwds['bid'] = cls.all().filter('owner =', user_steam_id(owner)).filter('listing =', listing).get()
	if not bid:
	    raise ValueError('No existing bid to update.')
	kwds['owner'] = user_steam_id(owner)
	kwds['profile'] = PlayerProfile.get_by_user(owner)
	verify_items_inactive(uid for uid, item in kwds['item_ids'])
	key = db.run_in_transaction(cls.build_update_transaction, **kwds)
        listing.update_top(put=True)
	return key

    @classmethod
    def build_update_transaction(cls, owner, profile, listing, bid, item_ids, public_msg, private_msg, currency_val=0):
	if not profile.owns_all(uid for uid, item in item_ids):
	    raise ValueError('Incorrect ownership.')
	schema = json_loads(fetch.schema())
	bid.message_public = public_msg
	bid.message_private = private_msg
        bid.currency_val = currency_val
	bid.put()
	item_types = item_type_map(schema)
	for uid, item in item_ids:
	    uid = str(uid)
	    bid_item = BidItem(
		parent=bid,
		uniqueid=uid,
		defindex=item['defindex'],
		source=json_dumps(item),
		item_type_name=item_types[item['defindex']],
		listing=listing,
		bid=bid)
	    bid_item.put()
	key = bid.key()
	queue_tool.bang_counters({'bid_items':len(item_ids)}, transactional=True)
	## we don't re-queue the bid verification because the
	## verification script will pick up all of the items when it
	## runs.
	queue_tool.notify_bid({'bid':key, 'update':True}, transactional=True)
	return key

    def encode_builtin(self, listing=True, private=False):
	lfb = Feedback.get_by_source(self, self.listing, self.listing.owner)
	if not private:
	    user = users.get_current_user()
	    if user and user_steam_id(user) == self.owner:
		private = True
	return {
	    'owner' : self.owner_profile().encode_builtin(),
	    'created' : js_datetime(self.created),
	    'message_public' : self.message_public,
	    'message_private' : self.message_private if private else None,
	    'status' : self.status,
	    'items' : [i.encode_builtin() for i in self.items()],
	    'listing' : self.listing.encode_builtin(bids=False, items=False) if listing else None,
	    'key' : str(self.key()),
	    'feedback': lfb.encode_builtin() if lfb else None,
            'currency_val' : self.currency_val
	    }

    def owner_profile(self):
	""" Returns the player profile for this bid.

	"""
	return PlayerProfile.get_by_user(self.owner)

    def items(self):
	return BidItem.all().filter('bid = ', self).fetch(limit=10)

    def set_status(self, status, reason, **kwds):
	self.status = status
	self.put()
	for bid_item in self.items():
	    bid_item.status = status
	    bid_item.put()

    def cancel(self, reason=''):
	self.listing.bid_count = max(0, self.listing.bid_count-1)
	self.listing.put()
	for item in self.items():
	    item.delete()
	self.delete()
        self.listing.update_top(put=True)


class BidItem(PlayerItem):
    """ BidItem -> player items associated with a Bid.

    """
    bid = db.ReferenceProperty(Bid, 'Parent Bid', required=True, indexed=True)
    listing = db.ReferenceProperty(Listing, 'Parent Listing', required=True, indexed=True)
    status = db.StringProperty('Status', required=True, default='active', indexed=True)

    def __str__(self):
	return '<BidItem listing=%s, uniqueid=%s, defindex=%s>' % (self.bid, self.uniqueid, self.defindex)


class Feedback(db.Model):
    """ Feedback -> a record of one users rating of another.

    """
    bid = db.ReferenceProperty(Bid, indexed=True, required=False)
    listing = db.ReferenceProperty(Listing, indexed=True, required=False)
    rating = db.IntegerProperty(required=True)
    comment = db.StringProperty(multiline=True)

    source = db.StringProperty(indexed=True, required=True)
    target = db.StringProperty(indexed=True, required=True)

    created = db.DateTimeProperty('Created', required=True, auto_now_add=True)

    @classmethod
    def get_by_source(cls, bid, listing, source):
	q = add_filters(cls.all(), ('bid', 'listing', 'source'), (bid, listing, source))
	return q.get()

    @classmethod
    def get_by_listing(cls, listing):
	q = add_filters(cls.all(), ('listing', ), (listing, ))
	return q

    @classmethod
    def get_by_target(cls, target):
        q = add_filters(cls.all(), ('target', ), (target, ))
        return q

    @classmethod
    def build(cls, bid, listing, source, target, rating, comment):
	obj = cls(bid=bid, listing=listing, source=source, target=target, rating=rating, comment=comment)
	obj.put()
	PlayerProfile.get_by_id64(target).add_rating(rating)
	return obj

    def encode_builtin(self):
        bid = listing = None
        try:
            bid = str(self.bid.key())
        except:
            pass
        try:
            listing = str(self.listing.key())
        except:
            pass
	return {
	    'bid' : bid,
	    'comment' : self.comment,
	    'created' : js_datetime(self.created),
	    'listing' : listing,
	    'rating' : self.rating,
	    'source' : self.source,
	    'target' : self.target,
	}



def verify_items_inactive(uids):
    uids = [str(uid) for uid in uids]
    for klass in (ListingItem, BidItem):
	q = klass.all().filter('uniqueid in', uids).filter('status', 'active')
	if q.get():
	    raise TypeError('Item already in active listing or bid')
