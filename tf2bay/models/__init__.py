#!/usr/bin/env python
# -*- coding: utf-8 -*-
from datetime import datetime, timedelta
from logging import exception, info

from google.appengine.api import users
from google.appengine.ext import db
from google.appengine.ext.db import polymodel

from tf2bay.utils import json, user_steam_id
from tf2bay.models.proxyutils import fetch


class PlayerItem(polymodel.PolyModel):
    """ PlayerItem -> simple junction of player item unique ids and the
        corresponding schema defindex.

    The 'defindex' attribute is indexed for query speed.  This class
    is a PolyModel so it can be subclassed (see below).

    The 'uniqueid' is the integer decoded key name.
    """
    defindex = db.IntegerProperty('Item defindex', required=True, indexed=True)
    source = db.StringProperty('Item source data (JSON decodable)')

    def __str__(self):
	args = (self.uniqueid, self.defindex, )
	return '<PlayerItem uniqueid=%s, defindex=%s>' % args

    def encode_builtin(self):
	""" Encode this instance using only built-in types. """
	return {'uniqueid':self.uniqueid, 'defindex':self.defindex}

    @property
    def uniqueid(self):
	try:
	    return int(self.key().name())
	except (AttributeError, db.NotSavedError, ):
	    return 0

    @classmethod
    def get_by_uid(cls, uniqueid):
	""" Returns an item by uniqueid. """
	return cls.get_by_key_name(str(uniqueid))

    @classmethod
    def build(cls, uniqueid, defindex, **kwds):
	""" Returns an item by uniqueid. """
	return cls.get_or_insert(str(uniqueid), defindex=defindex, **kwds)


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
	return '<PlayerProfile id64=%s>' % (self.id64, )

    @classmethod
    def get_by_id64(cls, id64):
	""" Returns the PlayerProfile for the given id64. """
	return cls.get_by_key_name(id64)

    @classmethod
    def get_by_user(cls, user):
	""" Returns the PlayerProfile for the given user. """
	query = cls.all()
	query.filter('owner =', user)
	return query.get()

    @classmethod
    def build(cls, owner, id64=None):
	""" Returns the PlayerProfile for the given user, creating it if necessary. """
	if id64 is None:
	    id64 = user_steam_id(owner)
	return cls.get_or_insert(id64, owner=owner)

    def owns_all(self, item_ids):
	""" True if this profile owns all of the specified items. """
	ids = [item['id'] for item in self.items]
	return all(item_id in ids for item_id in item_ids)

    @property
    def id64(self):
	try:
	    return self.key().name()
    	except (AttributeError, db.NotSavedError, ):
	    return ''

    @property
    def items(self):
	try:
	    return json.loads(self.backpack)
	except:
	    return []

    def refresh(self):
	try:
	    steam_profile = json.loads(fetch.profile(self.id64))
	except (Exception, ), exc:
	    exception('PlayerProfile.refresh(): %s %s', self, exc)
	else:
	    for key in steam_profile:
		setattr(self, key, steam_profile[key])
	    self.keys = [k for k in steam_profile]
	try:
	    self.backpack = fetch.items(self.id64)
	except:
	    exception('PlayerProfile.refresh(): %s %s', self, exc)
	return self

    def encode_builtin(self):
	""" Encode this instance using only built-in types. """
	res = {'id64':self.id64}
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
    expires = db.DateTimeProperty('Expires', required=True, validator=future_expires)
    min_bid = db.ListProperty(int, 'Minimum Bid')
    description = db.StringProperty('Description', default='', multiline=True)

    ## non-normalized:  sequence uniqueids for the items in this listing
    uniqueids = db.ListProperty(long, 'Unique IDs', indexed=True)

    ## non-normalized:  sequence defindexes for the items in this listing
    defindexes = db.ListProperty(long, 'Def Index', indexed=True)

    ## non-normalized:  listing status and reason
    status = db.CategoryProperty('Status', required=True, default=db.Category('new'))
    status_reason = db.StringProperty('Status Reason', required=True, default='Created by system.')

    ## non-normalized: list of categories from the items
    categories = db.ListProperty(db.Category, 'Categories')

    ## non-normalized: bid counter
    bid_count = db.IntegerProperty('Bid Count', default=0)

    @classmethod
    def build(cls, expires, items, min_build=None, description=''):
	## 0.  verify the owner, duration and description before
	## we do anything else (to prevent needless expensive checks)
	owner = users.get_current_user()
	if not owner:
	    return

	## 1.  check the user, get their backpack and verify the
	## inidicated items belong to them.
	profile = PlayerProfile.get_by_id64(user_steam_id(owner))
	if not profile.owns_all(item['id'] for item in items):
	    return

	## 2.  check that the given ids are not already up for
	## auction.

	## 3.  extract and create categories for the items.  we'll
	## need the english schema for this.

	## 4.  explicitly set the bid count, created, and expired tags (not!
	## defaults are better).

	## 5.  submit an item to the expiration task queue.

    def time_left(self):
	return self.expires - datetime.now()

    def users_other_listings(self):
	## query for other listings by the owner of this listing.
	pass

    @property
    def items(self):
	""" Returns the player items for this listing. """
	q = ListingItem.all()
	q.filter('listing =', self)
	return q.fetch(limit=100)

    @property
    def owner_profile(self):
	""" Returns the player profile for this listing. """
	return PlayerProfile.get_by_id64(self.owner.nickname())

    def encode_builtin(self):
	""" Encode this instance using only built-in types. """
	return {
	    'owner':PlayerProfile.get_by_user(self.owner).encode_builtin(),
	    'created':str(self.created),
	    'expires':str(self.expires),
	    'description':self.description,
	    'bid_count':self.bid_count,
	    'items':[i.encode_builtin() for i in self.items],
	}


class ListingItem(PlayerItem):
    """ ListingItem -> player items associated with a Listing.

    """
    listing = db.ReferenceProperty(Listing, 'Parent Listing', required=True, indexed=True)

    def __str__(self):
	args = (self.listing, self.uniqueid, self.defindex, )
	return '<ListingItem listing=%s, uniqueid=%s, defindex=%s>' % args



class Bid(db.Model):
    """ Bid -> a bid on a listing.

    """
    owner = db.UserProperty('Owner', required=True)
    created = db.DateTimeProperty('Created', required=True, auto_now_add=True)
    listing = db.ReferenceProperty(Listing, 'Parent Listing', required=True)
    message = db.StringProperty('Message to Lister', multiline=True)


class BidItem(PlayerItem):
    """ BidItem -> player items associated with a Bid.

    """
    bid = db.ReferenceProperty(Bid, 'Parent Bid', required=True, indexed=True)

    def __str__(self):
	return '<BidItem listing=%s, uniqueid=%s, defindex=%s>' % (self.bid, self.uniqueid, self.defindex)


class Rating(db.Model):
    """ Rating -> a record of one users rating of another.

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
