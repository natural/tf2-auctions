#!/usr/bin/env python
# -*- coding: utf-8 -*-
from google.appengine.ext import db


class PlayerItem(db.Model):
    ## simple junction of player item unique ids and the corresponding
    ## schema defindex.
    uniqueid = db.StringProperty()
    defindex = db.IntegerProperty()

    @classmethod
    def build(cls, uniqueid, defindex):
	## search for it
	query = cls.all()
	query.filter('uniqueid = ', uniqueid)
	items = query.fetch(limit=1)
	if items:
	    return items[0]
	## or create it
	item = cls(uniqueid=uniqueid, defindex=defindex)
	item.put()
	return item

class Listing(db.Model):
    owner = db.UserProperty()
    created = db.DateTimeProperty()
    expired = db.BooleanProperty()

    items = db.ListProperty(db.Key)

    ## copy of the categories from the items for easier searching
    categories = db.ListProperty(db.Category)

    description = db.StringProperty()
    bid_count = db.IntegerProperty()


    def time_left(self):
	pass

    def users_other_listings(self):
	## query for other listings by the owner of this listing.
	pass

    @classmethod
    def create(cls, **params):
	## 0.  verify the owner, duration and description before
	## we do anything else (to prevent needless expensive checks)

	## 1.  check the user, get their backpack and verify the
	## inidicated items belong to them.

	## 2.  check that the given ids are not already up for
	## auction.

	## 3.  extract and create categories for the items.  we'll
	## need the english schema for this.

	## 4.  explicitly set the bid count, created, and expired tags (not!
	## defaults are better).

	## 5.  submit an item to the expiration task queue.

	pass


class Bid(db.Model):
    owner = db.UserProperty()
    created = db.DateTimeProperty()
    listing = db.ReferenceProperty()
    items = db.ListProperty(db.Key)
    message_to_owner = db.StringProperty()



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


