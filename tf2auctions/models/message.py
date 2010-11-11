#!/usr/bin/env python
# -*- coding: utf-8 -*-
from logging import error
from google.appengine.ext import db

from tf2auctions.lib import js_datetime, user_steam_id
from tf2auctions.models.counters import inc, dec


def message_counter_cache_key(msg):
    return 'messages-%s' % (msg.target, )


class PlayerMessage(db.Model):
    source = db.StringProperty('Sender of message', required=True)
    target = db.StringProperty('Target of message', required=True, indexed=True)
    message = db.TextProperty('Body of message', required=True)
    created = db.DateTimeProperty('Created', required=True, auto_now_add=True)

    @classmethod
    def build(cls, source, target, message):
	msg = cls(source=source, target=target, message=message)
	msg.put()
	inc(message_counter_cache_key(msg))
	return msg

    @classmethod
    def remove(cls, key):
	msg = cls.get(key)
	if msg:
	    msg.delete()
	    dec(message_counter_cache_key(msg))

    @classmethod
    def get_for_user(cls, user, limit=10):
	user = user_steam_id(user) if hasattr(user, 'nickname') else user
	return cls.all().filter('target =', user).order('-created').fetch(limit)

    def encode_builtin(self):
	return {
	    'created': js_datetime(self.created),
	    'message': self.message,
	    'source': PlayerMessage.get_by_id64(self.source),
	    'target': self.target, # don't bother with a lookup on the target
	}
