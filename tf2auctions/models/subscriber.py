#!/usr/bin/env python
# -*- coding: utf-8 -*-
from logging import error, info
from google.appengine.ext import db

from tf2auctions.lib import json_dumps, json_loads
from tf2auctions.models.utils import UserId64Mixin


class SubscriptionHistory(db.Expando):
    """ SubscriptionHistory -> bit buckets for historical subscription
        transactions.
    """
    owner = db.StringProperty(required=True, indexed=True)

    @classmethod
    def put_history(cls, owner, params):
	""" Returns the SubscriptionHistory for the given user, creating it if necessary. """
	key = user_steam_id(owner) if hasattr(owner, 'nickname') else owner
	obj = cls(owner=key)
	for k in params:
	    setattr(obj, k, params[k])
	obj.put()
	return obj


class Subscription(db.Model, UserId64Mixin):
    """ Subscription -> state of a players subscription status.

    """
    status = db.StringProperty('Subscription status', required=True)
    profile = db.ReferenceProperty(None, required=True, indexed=True, collection_name='profile_set')
    settings = db.ReferenceProperty(None, required=True, indexed=True, collection_name='settings_set')

    @classmethod
    def build(cls, owner, status='initial'):
	## lazy to avoid circular imports:
	from tf2auctions.models.profile import PlayerProfile
	from tf2auctions.models.settings import PlayerSettings

	profile = PlayerProfile.build(owner)
	settings = PlayerSettings.build(owner)
	obj = cls.get_or_insert(owner, profile=profile, settings=settings, status=status)
	if not obj.is_saved():
	    obj.put()
	else:
	    obj.status = status
	    obj.put()
	return obj

    @classmethod
    def put_status_history(cls, owner, status, history=None):
	history = {} if history is None else history
	hist = SubscriptionHistory.put_history(owner, history)
	return (cls.build(owner, status), hist)

    def encode_builtin(self):
	return {'status':self.status}


    def is_subscriber(self):
	return self.status == 'Verified'
