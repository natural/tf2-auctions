#!/usr/bin/env python
# -*- coding: utf-8 -*-
from logging import error, info
from re import search
from urllib import urlopen
from google.appengine.api import memcache


class fetch:
    class config:
	url_root = 'http://tf2apiproxy.appspot.com/api/v2/public/'
	url_schema = url_root + 'schema%s'
	url_items = url_root + 'items/%s'
	url_profile = url_root + 'profile/%s'
	url_player_status = 'http://steamcommunity.com/profiles/%s/?xml=1'
	status_rxs = (
	    ('avatar_full', '<avatarFull><!\[CDATA\[(.*?)\]\]>'),
	    ('avatar_icon', '<avatarIcon><!\[CDATA\[(.*?)\]\]>'),
	    ('avatar_medium', '<avatarMedium><!\[CDATA\[(.*?)\]\]>'),
	    ('message_state', '<stateMessage><!\[CDATA\[(.*?)\]\]>'),
	    ('name', '<steamID><!\[CDATA\[(.*?)\]\]>'),
	    ('online_state', '<onlineState>(.*?)</onlineState>'),
	)

    @classmethod
    def profile(cls, id64, ttl=60*10, default='{}'):
	url = cls.config.url_profile % id64
	val = memcache.get(url)
	if val:
	    return True, val
	try:
	    val = urlopen(url).read()
	    memcache.set(url, val, ttl)
	    info('fetch.profile local cache miss: %s', url)
	    return False, val
	except (Exception, ), exc:
	    error('fetch.profile: %s', exc)
	    return False, default

    @classmethod
    def schema(cls, lang=None, ttl=60*60, default='{}'):
	lang = '?lang=%s' % (lang, ) if lang else ''
	url = cls.config.url_schema % lang
	val = memcache.get(url)
	if val:
	    return val
	try:
	    val = urlopen(url).read()
	    memcache.set(url, val, ttl)
	    info('fetch.schema local cache miss: %s', url)
	    return val
	except (Exception, ), exc:
	    error('fetch.schema: %s', exc)
	    return default

    @classmethod
    def items(cls, id64, ttl=60*10, default='[]'):
	url = cls.config.url_items % id64
	val = memcache.get(url)
	if val:
	    return True, val
	try:
	    val = urlopen(url).read()
	    memcache.set(url, val, ttl)
	    info('fetch.items local cache miss: %s', url)
	    return False, val
	except (Exception, ), exc:
	    error('fetch.items: %s', exc)
	    return False, default

    @classmethod
    def player_status(cls, id64, ttl=60*15, default='{}'):
	url = cls.config.url_player_status % id64
	val = memcache.get(url)
	if val:
	    return val
	try:
	    chunk = urlopen(url).read(1024)
	    val = {}
	    for name, rx in cls.config.status_rxs:
		try:
		    val[name] = search(rx, chunk).groups()[0]
		except (AttributeError, IndexError, ):
		    pass
	    memcache.set(url, val, ttl)
	    info('fetch.player_status local cache miss: %s', url)
	    return val
	except (Exception, ), exc:
	    error('fetch.player_status: %s', exc)
	    return default
