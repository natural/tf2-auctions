#!/usr/bin/env python
# -*- coding: utf-8 -*-
from datetime import datetime, timedelta
from logging import exception, info

from google.appengine.api import users
from google.appengine.api.labs import taskqueue
from google.appengine.ext import db
from google.appengine.ext.db import polymodel

from tf2bay.lib import json, user_steam_id, schematools, js_datetime
from tf2bay.models.proxyutils import fetch


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


class PlayerProfile(db.Expando):
    """ PlayerProfile -> persistent, server-side storage of player
        information and backpack contents.

    We don't maintain users directly, but we do need to display some
    of their attributes and we need to verify their backpack contents
    (we can't trust them to specify their backpack contents).  Objects
    of this model can be viewed as cache entries.

    This model is an Expando so we can copy all of the attributes from
    the steam profile feed.  Note that we also store the keys we copy
    so that the values can be later extracted.

    The key name of a PlayerProfile is the players id64.
    """
    owner = db.UserProperty(required=True, indexed=True)
    keys = db.StringListProperty('Profile Keys')
    backpack = db.TextProperty('Backpack Items')

    def __str__(self):
	return '<PlayerProfile id64=%s>' % (self.id64(), )

    @classmethod
    def get_by_id64(cls, id64):
	""" Returns the PlayerProfile for the given id64. """
	return cls.get_by_key_name(id64)

    @classmethod
    def get_by_user(cls, user):
	""" Returns the PlayerProfile for the given user. """
	return cls.all().filter('owner =', user).get()

    @classmethod
    def build(cls, owner, id64=None):
	""" Returns the PlayerProfile for the given user, creating it if necessary. """
	if id64 is None:
	    id64 = user_steam_id(owner)
	def get_or_insert(): ## equiv to get_or_insert, copied from sdk docs.
	    profile = cls.get_by_key_name(id64)
	    if profile is None:
		profile = cls(key_name=id64, owner=owner)
		profile.put()
		taskqueue.add(
		    url='/api/v1/admin/queue/bang-counters',
		    transactional=True,
		    queue_name='counters',
		    params={'players':1})
	    return profile
	return db.run_in_transaction(get_or_insert)

    def owns_all(self, item_ids):
	""" True if this profile owns all of the specified items. """
	ids = [item['id'] for item in self.items()]
	return all(item_id in ids for item_id in item_ids)

    def id64(self):
	try:
	    return self.key().name()
    	except (AttributeError, db.NotSavedError, ):
	    return ''

    def items(self):
	try:
	    return json.loads(self.backpack)
	except:
	    return []

    def refresh(self, put=False):
	try:
	    steam_profile = json.loads(fetch.profile(self.id64()))
	except (Exception, ), exc:
	    exception('PlayerProfile.refresh(): %s %s', self, exc)
	else:
	    for key in steam_profile:
		setattr(self, key, steam_profile[key])
	    self.keys = [k for k in steam_profile]
	try:
	    self.backpack = fetch.items(self.id64())
	except:
	    exception('PlayerProfile.refresh(): %s %s', self, exc)
	if put:
	    self.put()
	return self

    def encode_builtin(self):
	""" Encode this instance using only built-in types. """
	res = {'id64':self.id64()}
	for key in self.keys:
	    res[key] = getattr(self, key)
	return res


def future_expires(value):
    future, now = timedelta(minutes=5), datetime.now()
    if value < (now + future):
	raise TypeError('Must expire more than 5 minutes in the future.')


class Listing(db.Model):
    """ Listing -> records of items up for trade.

    There's still some work to be done on, well, reading, writing,
    updating and deleting.
    """
    owner = db.UserProperty('Owner', required=True, indexed=True)
    created = db.DateTimeProperty('Created', required=True, auto_now_add=True)
    expires = db.DateTimeProperty('Expires', required=True) #, validator=future_expires)
    min_bid = db.ListProperty(long, 'Minimum Bid')
    description = db.StringProperty('Description', default='', multiline=True)

    ## non-normalized:  listing status and reason
    status = db.CategoryProperty('Status', required=True, default=db.Category('active'), indexed=True)
    status_reason = db.StringProperty('Status Reason', required=True, default='Created by system.')

    ## non-normalized: specific categories for fast searches
    category_craft_bar = db.BooleanProperty(indexed=True, default=False)
    category_craft_token = db.BooleanProperty(indexed=True, default=False)
    category_hat = db.BooleanProperty(indexed=True, default=False)
    category_supply_crate = db.BooleanProperty(indexed=True, default=False)
    category_tool = db.BooleanProperty(indexed=True, default=False)
    category_weapon = db.BooleanProperty(indexed=True, default=False)

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
	kwds['owner'] = owner
	kwds['profile'] = PlayerProfile.get_by_id64(user_steam_id(owner))

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
	expires = datetime.now() + timedelta(days=days)

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
	for cat in schematools.known_categories:
	    if cat in cats:
		setattr(listing, 'category_%s' % cat, True)
	key = listing.put()

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

    def set_status(self, status, reason):
	self.status = status
	self.status_reason = reason
	self.put()
	for item in self.items():
	    item.status = status
	    item.put()
	for bid in self.bids():
	    bid.set_status(status, reason)
	    bid.put()

    def cancel(self, reason):
	self.set_status('cancelled', reason)

    def time_left(self):
	return self.expires - datetime.now()

    def users_other_listings(self):
	## query for other listings by the owner of this listing.
	pass

    def items(self):
	""" Returns the player items for this listing. """
	return ListingItem.all().filter('listing =', self).fetch(limit=100)

    def bids(self):
	""" Returns the bids for this listing. """
	return Bid.all().filter('listing =', self).fetch(limit=100)

    def owner_profile(self):
	""" Returns the player profile for this listing. """
	return PlayerProfile.get_by_id64(self.owner.nickname())

    def encode_builtin(self, bids=False):
	""" Encode this instance using only built-in types. """
	return {
	    'id' : self.key().id(),
	    'owner' : PlayerProfile.get_by_user(self.owner).encode_builtin(),
	    'created' : js_datetime(self.created),
	    'expires' : js_datetime(self.expires),
	    'description' : self.description,
	    'bid_count' : self.bid_count,
	    'min_bid' : self.min_bid,
	    'items' : [i.encode_builtin() for i in self.items()],
	    'status' : self.status,
	    'status_reason' : self.status_reason,
	    'bids' : [b.encode_builtin() for b in self.bids()] if bids else (),
	}


class ListingItem(PlayerItem):
    """ ListingItem -> player items associated with a Listing.

    """
    listing = db.ReferenceProperty(Listing, 'Parent Listing', required=True, indexed=True)
    ## non-normalized:
    status = db.CategoryProperty('Status', required=True, default=db.Category('active'), indexed=True)
    ## non-normalized:
    item_type_name = db.StringProperty('Item type name (schema value)', required=True, indexed=True)

    def __str__(self):
	args = (self.listing, self.uniqueid, self.defindex, )
	return '<ListingItem listing=%s, uniqueid=%s, defindex=%s>' % args



class Bid(db.Model):
    """ Bid -> a bid on a listing.

    """
    owner = db.UserProperty('Owner', required=True)
    created = db.DateTimeProperty('Created', required=True, auto_now_add=True)
    listing = db.ReferenceProperty(Listing, 'Parent Listing', required=True)
    message_private = db.StringProperty('Private message', multiline=True)
    message_public = db.StringProperty('Public message', multiline=True)
    status = db.CategoryProperty('Status', required=True, default=db.Category('active'), indexed=True)
    status_reason = db.StringProperty('Status Reason', required=True, default='Created by system.')


    @classmethod
    def build(cls, **kwds):
	owner = users.get_current_user()
	if not owner:
	    raise ValueError('No owner specified.')
	kwds['owner'] = owner
	kwds['profile'] = PlayerProfile.get_by_id64(user_steam_id(owner))
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

    def encode_builtin(self):
	return {
	    'owner' : self.owner.nickname(),
	    'created' : js_datetime(self.created),
	    'message_public' : self.message_public,
	    'status' : self.status,
	    'items' : [i.encode_builtin() for i in self.items()],
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
    status = db.CategoryProperty('Status', required=True, default=db.Category('active'), indexed=True)

    def __str__(self):
	return '<BidItem listing=%s, uniqueid=%s, defindex=%s>' % (self.bid, self.uniqueid, self.defindex)


class Feedback(db.Model):
    """ Feedback -> a record of one users rating of another.

    """
    source = db.UserProperty('Source user (the one rating)', required=True)
    target = db.UserProperty('Target user (the one rated)', required=True)
    rating = db.RatingProperty('Rating', required=True)
    comment = db.StringProperty('Comment', multiline=True)
    as_bidder = db.BooleanProperty('Rating user as a bidder', required=True)
    as_lister = db.BooleanProperty('Rating user as a lister', required=True)

    @classmethod
    def for_user(cls, user):
	## sum of rating properties for user div. count of ratings for user
	## return dict {'bidder' :bidder_rating, 'lister' :lister_rating}
	pass


#    ('new', 'New',
#     lambda q: q.filter('created > ', datetime.now() - timedelta(hours=24)).order('-created')
#     ),

#    ('ending-soon', 'Ending Soon',
#     lambda q: q.filter('expires < ', datetime.now() - timedelta(hours=24))
#    ),


class ListingSearch(object):
    limit = 3
    orders = {
	'created' : ('Recently Added', lambda q:q.order('created')),
	'expires' : ('Expiring Soon', lambda q:q.order('-expires')),
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
	order = self.orders.get('sort', None)
	if order:
	    order(self.q)
	if 'c' in qs:
	    self.q.with_cursor(qs['c'][0])

    def __call__(self):
	results = self.q.fetch(self.limit)
	cursor = self.q.cursor()
	return results, cursor, self.next_qs(self.qs, cursor)

    def next_qs(self, query_string, cursor):
	parts = ['%s=%s' % (k, vs[0]) for k, vs in query_string.items() if k != 'c']
	parts.append('c=%s' % cursor)
	return str.join('&', parts)

    def more(self):
	return bool(self.q.fetch(1, self.limit+1))
