#!/usr/bin/env python
# -*- coding: utf-8 -*-
from google.appengine.api import taskqueue
from tf2auctions.lib import user_steam_id


def add_filters(query, keys, values):
    for key, value in zip(keys, values):
        key = '%s =' % key if not key.endswith(('=', '>', '>=', '<', '<=')) else key
	query.filter(key, value)
    return query


class QueueTool(object):
    def bang_counters(self, params, transactional=False):
	return taskqueue.add(
	    url='/api/v1/admin/queue/bang-counters',
	    transactional=transactional,
	    queue_name='counters',
	    params=params
	)


    def end_listing(self, listing_key, eta, transactional=False):
	return taskqueue.add(
	    url='/api/v1/admin/queue/end-listing',
	    transactional=transactional,
	    queue_name='expiration',
	    eta=eta,
	    params={'key':listing_key}
	)


    def expire_listing(self, listing_key, eta, transactional=False):
	return taskqueue.add(
	    url='/api/v1/admin/queue/expire-listing',
	    transactional=transactional,
	    queue_name='expiration',
	    eta=eta,
	    params={'key':listing_key}
	)


    def notify_bid(self, params, transactional=False):
	return taskqueue.add(
	    url='/api/v1/admin/queue/notify-bid',
	    transactional=transactional,
	    queue_name='bid-notify',
	    params=params
	)


    def notify_listing(self, subscription_key, listing_key, transactional=False):
	return taskqueue.add(
	    url='/api/v1/admin/queue/notify-listing',
	    transactional=transactional,
	    queue_name='listing-notify',
	    params=dict(subscription_key=subscription_key or '', listing_key=listing_key)
	)


    def notify_win(self, params, transactional=False):
	return taskqueue.add(
	    url='/api/v1/admin/queue/notify-win',
	    transactional=transactional,
	    queue_name='win-notify',
	    params=params
	)


    def reverify_items(self, params, transactional=False):
	return taskqueue.add(
	    url='/api/v1/admin/queue/reverify-items',
	    transactional=True,
	    queue_name='item-verification',
	    params=params
	)

    def external_share(self, listing_key, transactional=False):
	return taskqueue.add(
	    url='/api/v1/admin/queue/external-share-listing',
	    transactional=transactional,
	    queue_name='listing-external-share',
	    params=dict(listing_key=listing_key)
	)


queue_tool = QueueTool()


class UserId64Mixin(object):
    @classmethod
    def get_by_id64(cls, id64):
	""" Returns the model instance for the given id64. """
	return cls.get_by_key_name(id64)

    @classmethod
    def get_by_user(cls, user):
	""" Returns the model instance for the given user. """
	id64 = user_steam_id(user) if hasattr(user, 'nickname') else user
	return cls.get_by_id64(id64)

