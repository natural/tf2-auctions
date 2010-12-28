#!/usr/bin/env python
# -*- coding: utf-8 -*-
from logging import error
from google.appengine.ext import db

from tf2auctions.lib import js_datetime, user_steam_id
from tf2auctions.models.counters import inc, dec
#from tf2auctions.models.profile import PlayerProfile


def message_counter_cache_key(msg):
    return 'messages-%s' % (msg.target, )


class PlayerMessage(db.Model):
    source = db.StringProperty('Sender of message', required=True)
    target = db.StringProperty('Target of message', required=True, indexed=True)
    message = db.TextProperty('Body of message', required=True)
    created = db.DateTimeProperty('Created', required=True, auto_now_add=True)

    @classmethod
    def build(cls, source, target, message):
	if cls.is_full(target):
	    raise Exception('Mailbox full')
	source = user_steam_id(source) if hasattr(source, 'nickname') else source
	## verify source + target
	msg = cls(source=source, target=target, message=message[0:400])
	msg.put()
	inc(message_counter_cache_key(msg))
	return msg

    @classmethod
    def remove(cls, key, target):
	key = db.Key(key)
	target = user_steam_id(target) if hasattr(target, 'nickname') else target
	msg = PlayerMessage.all().filter('__key__ =', key).filter('target =', target).get()
	msg.delete()
	dec(message_counter_cache_key(msg))

    @classmethod
    def count_for_user(cls, user, limit=100):
	user = user_steam_id(user) if hasattr(user, 'nickname') else user
	return cls.all().filter('target =', user).order('-created').count(limit)

    @classmethod
    def get_for_user(cls, user, limit=100):
	user = user_steam_id(user) if hasattr(user, 'nickname') else user
	return cls.all().filter('target =', user).order('-created').fetch(limit)

    @classmethod
    def is_full(cls, target, limit=100):
	target = user_steam_id(target) if hasattr(target, 'nickname') else target
	count = cls.all(keys_only=True).filter('target =', target).count()
	return count >= limit

    def encode_builtin(self):
	return {
	    'created': js_datetime(self.created),
	    'message': self.message,
	    'key' : str(self.key()),
	    'source': self.source, # don't bother with a profile lookup
	    'target': self.target, # don't bother with a profile lookup
	}
