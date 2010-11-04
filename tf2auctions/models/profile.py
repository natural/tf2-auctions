#!/usr/bin/env python
# -*- coding: utf-8 -*-
from logging import exception, info

from google.appengine.api.labs import taskqueue
from google.appengine.ext import db

from tf2auctions.lib import json_dumps, json_loads, user_steam_id
from tf2auctions.models.proxyutils import fetch


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
    owner = db.StringProperty(required=True, indexed=True)
    keys = db.StringListProperty('Profile Keys')
    backpack = db.TextProperty('Backpack Items')

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
    def get_by_user(cls, user):
	""" Returns the PlayerProfile for the given user. """
	if hasattr(user, 'nickname'):
	    id64 = user_steam_id(user)
	else:
	    id64 = user
	return cls.all().filter('owner =', id64).get()

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
	ids = [item['id'] for item in self.items()]
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

    def refresh(self, put=False):
	try:
	    steam_profile = json_loads(fetch.profile(self.id64()))
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
	res = {'id64':self.id64(), 'rating':self.get_rating()}
	for key in self.keys:
	    res[key] = getattr(self, key)
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
