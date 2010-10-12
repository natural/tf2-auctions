#!/usr/bin/env python
# -*- coding: utf-8 -*-
import logging
import urllib
from tf2bay.utils import json
from google.appengine.api import memcache


class config:
    url_root = 'http://tf2apiproxy.appspot.com/api/v1/'
    url_schema = url_root + 'schema%s'
    url_items = url_root + 'items/%s'
    url_profile = url_root + 'profile/%s'


def get_profile(id64, ttl=60*5, default='{}'):
    url = config.url_profile % id64
    val = memcache.get(url)
    if val:
	return val
    try:
	val = urllib.urlopen(url).read()
	memcache.set(url, val, ttl)
	logging.info('get_profile local cache miss: %s', url)
	return val
    except (Exception, ), exc:
	logging.exception('get_profile: %s', exc)
	return default


def get_schema(lang=None, ttl=60*60, default='{}'):
    lang = '?lang=%s' % (lang, ) if lang else ''
    url = config.url_schema % lang
    val = memcache.get(url)
    if val:
	return val
    try:
	val = urllib.urlopen(url).read()
	memcache.set(url, val, ttl)
	logging.info('get_schema local cache miss: %s', url)
	return val
    except (Exception, ), exc:
	logging.exception('get_schema: %s', exc)
	return default


def get_items(id64, ttl=60*5, default='[]'):
    url = config.url_items % id64
    val = memcache.get(url)
    if val:
	return val
    try:
	val = urllib.urlopen(url).read()
	memcache.set(url, val, ttl)
	logging.info('get_items local cache miss: %s', url)
	return val
    except (Exception, ), exc:
	logging.exception('get_items: %s', exc)
	return default
