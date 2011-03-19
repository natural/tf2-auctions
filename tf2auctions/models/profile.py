#!/usr/bin/env python
# -*- coding: utf-8 -*-
from datetime import datetime, timedelta
from logging import error, info
from re import match

from google.appengine.api import taskqueue
from google.appengine.ext import db

from tf2auctions.lib import json_dumps, json_loads, user_steam_id
from tf2auctions.lib.proxyutils import fetch
from tf2auctions.models.message import PlayerMessage
from tf2auctions.models.settings import PlayerSettings
from tf2auctions.models.subscriber import Subscription


class PlayerProfile(db.Expando):
    """ PlayerProfile -> persistent, server-side storage of player
        information and backpack contents.

    We don't maintain users directly, but we do need to display some
    of their attributes and we need to verify their backpack contents
    (we can't trust them to specify their backpack contents).  Objects
    of this model can be viewed as cache entries.

    This model is an Expando so we can copy all of the attributes from
    the steam profile feed.

    The key name of a PlayerProfile is the players id64.
    """
    owner = db.StringProperty(required=True, indexed=True)
    custom_name = db.StringProperty(indexed=True)

    backpack = db.TextProperty('Backpack Items')
    updated = db.DateTimeProperty('Last Update')

    rating_pos_sum = db.IntegerProperty(default=0)
    rating_pos_count = db.IntegerProperty(default=0)

    rating_neg_sum = db.IntegerProperty(default=0)
    rating_neg_count = db.IntegerProperty(default=0)

    def __str__(self):
	return '<PlayerProfile id64=%s>' % (self.id64(), )

    @classmethod
    def get_by_id64(cls, id64):
	""" Returns the PlayerProfile for the given id64. """
	return cls.all().filter('owner =', id64).get()

    @classmethod
    def get_by_name(cls, name):
	""" Returns the PlayerProfile for the given name. """
	return cls.all().filter('custom_name =', name).get()

    @classmethod
    def get_by_user(cls, user):
	""" Returns the PlayerProfile for the given user. """
	return cls.get_by_id64(user_steam_id(user) if hasattr(user, 'nickname') else user)

    @classmethod
    def build(cls, owner, id64=None):
	""" Returns the PlayerProfile for the given user, creating it if necessary. """
	if id64 is None:
	    id64 = user_steam_id(owner)
	if not id64:
	    return
	profile = cls.all().filter('owner =', id64).get()
	if profile is None:
	    profile = cls(owner=id64)
	    profile.put()
	    taskqueue.add(
		url='/api/v1/admin/queue/bang-counters',
		queue_name='counters',
		params={'players':1})
	return profile

    def owns_all(self, item_ids):
	""" True if this profile owns all of the specified items. """
        if not item_ids:
            return True
        items = self.items()
        try:
            ids = [item['id'] for item in items]
        except (Exception, ), exc:
            error('fail on ownership check:', items)
	return all(item_id in ids for item_id in item_ids)

    def id64(self):
	try:
	    return self.owner
    	except (AttributeError, db.NotSavedError, ):
	    return ''

    def items(self):
	try:
	    return json_loads(self.backpack)
	except:
	    return []

    def refresh(self, delta=timedelta(minutes=10)):
	start, updated = datetime.now(), self.updated
	if updated and (updated + delta) > start:
	    msg = 'profile refresh: profile current as of %s - update at %s'
	    info(msg, start, updated + delta)
	    return
	put, id64 = False, self.id64()
	try:
	    cached, raw_profile = fetch.profile(id64)
	    if not cached:
		steam_profile = json_loads(raw_profile)
		for key in steam_profile:
		    setattr(self, key, steam_profile[key])
		custom_name = custom_profile_name(steam_profile.get('profileurl'))
		if custom_name:
		    self.custom_name = custom_name
		# http://steamcommunity.com/id/propeller_headz/
		put = True
		info('profile refresh: fetched backpack for %s', id64)
	except (Exception, ), exc:
	    error('profile refresh: %s - %s', exc, id64)
	try:
	    cached, raw_backpack = fetch.items(id64)
	    if not cached:
		self.backpack = raw_backpack
		put = True
		info('profile refresh: fetched items for %s', id64)
	except (Exception, ), exc:
	    error('profile refresh: %s - %s', exc, id64)
	if put:
	    duration = (datetime.now() - start).seconds
	    info('profile refresh: fetched data for %s in %s sec', id64, duration)
	    self.updated = datetime.now()
	    self.put()

    @classmethod
    def is_subscriber_id64(cls, id64):
	psub = Subscription.get_by_id64(id64)
	return psub.is_subscriber() if psub else False

    def encode_builtin(self, settings=False, complete=False, subscription=True):
	""" Encode this instance using only built-in types. """
	id64 = self.id64()
	res = {
	    'id64' : id64,
	    'rating' : self.get_rating(),
	    'custom_name' : self.custom_name,
	}
	for key in self.dynamic_properties():
	    res[key] = getattr(self, key)
	if settings:
	    psettings = PlayerSettings.get_by_id64(id64)
	    psettings = psettings.encode_builtin(complete) if psettings else {}
	else:
	    psettings = {}
	res['settings'] = psettings
	if subscription:
	    psub = Subscription.get_by_id64(id64)
	    psub = psub.encode_builtin() if psub else {}
	else:
	    psub = {}
	res['subscription'] = psub
	res['message_count'] = PlayerMessage.count_for_user(id64)
	return res

    def add_rating(self, value):
	if value > 0:
	    self.rating_pos_sum = self.rating_pos_sum + value
	    self.rating_pos_count += 1
	    self.put()
	elif value < 0:
	    self.rating_neg_sum = self.rating_neg_sum + value
	    self.rating_neg_count += 1
	    self.put()
	## not saving 0 values

    def get_rating(self):
	return (
	    self.rating_pos_sum, self.rating_pos_count,
	    self.rating_neg_sum, self.rating_neg_count
	)


def custom_profile_name(value):
    try:
	return match('.*?/id/(.*?)/', value).groups()[0]
    except (Exception, ):
	pass

