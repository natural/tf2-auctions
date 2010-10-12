#!/usr/bin/env python
# -*- coding: utf-8 -*-
from datetime import datetime, timedelta
from logging import exception, info

from google.appengine.api import users
from google.appengine.ext import db
from google.appengine.ext.db import polymodel

from tf2bay.utils import json, user_steam_id
from tf2bay.models.proxyutils import get_profile, get_items, get_schema


class PlayerItem(polymodel.PolyModel):
    ## simple junction of player item unique ids and the corresponding
    ## schema defindex.
    uniqueid = db.IntegerProperty('Item uniqueid', required=True, indexed=True)
    defindex = db.IntegerProperty('Item defindex', required=True, indexed=True)

    def __str__(self):
	return '<PlayerItem uniqueid=%s, defindex=%s>' % (self.uniqueid, self.defindex)

    @classmethod
    def get_by_uid(cls, uniqueid):
	query = cls.all()
	query.filter('uniqueid = ', uniqueid)
	return query.get()

    @classmethod
    def build(cls, uniqueid, defindex):
	item = cls.get_by_uid(uniqueid)
	if item:
	    return item
	item = cls(uniqueid=uniqueid, defindex=defindex)
	item.put()
	return item


class PlayerProfile(db.Expando):
    ## we don't maintain users directly, but we do need to display
    ## some of their attributes and we need to verify their backpack
    ## contents.  objects in this model can be viewed as cache
    ## entries.
    owner = db.UserProperty(required=True, indexed=True)
    id64 = db.StringProperty('Steam ID', required=True, indexed=True)
    #personaname = db.StringProperty('Persona Name', indexed=True)
    #avatar = db.LinkProperty('Avatar URL')
    #profileurl = db.LinkProperty('Steam Community URL')
    backpack = db.TextProperty('Backpack Items')

    def __str__(self):
	return '<PlayerProfile id64=%s>' % (self.id64, )

    @classmethod
    def get_by_id64(cls, id64):
	query = cls.all()
	query.filter('id64 = ', id64)
	return query.get()

    @classmethod
    def build(cls, owner, id64):
	profile = cls.get_by_id64(id64)
	if profile and profile.owner == owner:
	    #profile.refresh().put()
	    return profile
	profile = cls(owner=owner, id64=id64)
	profile.put()
	return profile

    def owns_all(self, item_ids):
	ids = [item['id'] for item in json.loads(self.backpack)]
	return all(item_id in ids for item_id in item_ids)

    def items(self):
	try:
	    return json.loads(self.backpack)
	except:
	    return []

    def refresh(self):
	try:
	    steam_profile = json.loads(get_profile(self.id64))
	except (Exception, ), exc:
	    exception('PlayerProfile.refresh(): %s %s', self, exc)
	else:
	    for key in steam_profile:
		setattr(self, key, steam_profile[key])
	try:
	    self.backpack = get_items(self.id64)
	except:
	    exception('PlayerProfile.refresh(): %s %s', self, exc)
	return self


def future_expires(value):
    future, now = timedelta(minutes=5), datetime.now()
    if value < (now + future):
	raise TypeError('Must expire more than 5 minutes in the future.')


class Listing(db.Model):
    owner = db.UserProperty('Owner', required=True, indexed=True)
    created = db.DateTimeProperty('Created', required=True, auto_now_add=True)
    expires = db.DateTimeProperty('Expires', required=True, validator=future_expires)
    min_bid = db.ListProperty(int, 'Minimum Bid')
    description = db.StringProperty('Description', required=True, default='')

    ## non-normalized:  true if the listing has expired
    expired = db.BooleanProperty('Expired', required=True, default=False)
    ## non-normalized: list of categories from the items
    categories = db.ListProperty(db.Category, 'Categories')
    ## non-normalized: bid counter
    bid_count = db.IntegerProperty('Bid Count', default=0)


    all_catetories = [
	'action', 'craft_bar', 'craft_token', 'hat', 'head', 'melee', 'misc',
	'pda2', 'primary', 'secondary', 'supply_crate', 'tool', 'weapon',
    ]

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
	q = ListingItem.all()
	q.filter('listing =', self)
	return q.fetch(limit=100)

    @property
    def owner_profile(self):
	return PlayerProfile.get_by_id64(self.owner.nickname())

class ListingItem(PlayerItem):
    listing = db.ReferenceProperty(Listing, required=True, indexed=True)

    def __str__(self):
	return '<ListingItem listing=%s, uniqueid=%s, defindex=%s>' % (self.listing, self.uniqueid, self.defindex)


class Bid(db.Model):
    owner = db.UserProperty()
    created = db.DateTimeProperty()
    listing = db.ReferenceProperty()
    message_to_owner = db.StringProperty()


class BidItem(PlayerItem):
    bid = db.ReferenceProperty(Bid, required=True, indexed=True)

    def __str__(self):
	return '<BidItem listing=%s, uniqueid=%s, defindex=%s>' % (self.bid, self.uniqueid, self.defindex)


class Rating(db.Model):
    source = db.UserProperty()
    target = db.UserProperty()

    rating = db.RatingProperty()
    comment = db.StringProperty()

    as_bidder = db.BooleanProperty()
    as_lister = db.BooleanProperty()

    @classmethod
    def for_user(cls, user):
	## sum of rating properties for user div. count of ratings for user
	## return dict {'bidder':bidder_rating, 'lister':lister_rating}
	pass



class SiteStats(db.Model):
    count_listings = db.IntegerProperty()
    count_bids = db.IntegerProperty()
    count_profiles = db.IntegerProperty()


class ListingStats(db.Model):
    pass
