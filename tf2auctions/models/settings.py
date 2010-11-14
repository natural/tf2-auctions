#!/usr/bin/env python
# -*- coding: utf-8 -*-
from logging import error, info
from google.appengine.ext import db

from tf2auctions.lib import json_dumps, json_loads, user_steam_id


class PlayerSettings(db.Expando):
    """ PlayerSettings

    """
    owner = db.StringProperty('Owner ID', required=True, indexed=True)
    email = db.EmailProperty('Player email', indexed=True)
    payload = db.TextProperty('Serialized settings (JSON encoded)')

    ## the current schema for the payload property.
    schema = [
	('Contact', [
	    {
		'id':'email', 'type':'email', 'primary':True, 'label':'Email Address',
		'widget':'string', 'default':'',
		'help':"""
		    We will never, ever sell or give your address to
		    anyone else. We will never, ever send you spam,
		    either."""
	    },
	    {
		'id':'notify-bids', 'type':bool, 'label':'Notify Me of New Bids',
		'widget':'checkbox', 'default':False,
		'help':"""
		    When enabled, you will get an email message when
		    someone bids on your listings."""
	    },
        ]),

	('User Interface', [
	    {
		'id':'badge-equipped', 'type':bool, 'label':'Show Item Equipped Badge',
		'widget':'checkbox', 'default':True,
		'help':"""
		    When enabled, equipped backpack items will be shown
		    with an extra badge."""
	    },
	    {
		'id':'badge-usecount', 'type':bool, 'label':'Show Item Use Count',
		'widget':'checkbox', 'default':True,
		'help':"""
		    When enabled, backpack items with a specific
		    number of uses will be shown with an extra badge,
		    and that badge will show the number of remaining
		    uses of the item.
		    """
	    },
	    {
		'id':'badge-painted', 'type':bool, 'label':'Show Item Painted Color Splash',
		'widget':'checkbox', 'default':True,
		'help':"""
		    When enabled, backpack items that have been
		    painted will have an additional color icon.
		    """
	    },
	    {
		'id':'higlight-rarity', 'type':bool, 'label':'Hilight Items by Rarity',
		'widget':'checkbox', 'default':False,
		'help':"""
		    When enabled, backpack items will be bordered and
		    shaded with their specific rarity color, very much
		    like the in-game interface.
		"""
	    },
	]),

    ]


    def __str__(self):
	return '<PlayerSettings id64=%s>' % (self.owner, )

    @classmethod
    def get_by_id64(cls, id64):
	""" Returns the PlayerProfile for the given id64. """
	return cls.all().filter('owner =', id64).get()

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

    def encode_builtin(self):
	""" Encode this instance using only built-in types. """
	id64 = self.id64()
	res = {'id64':id64, 'rating':self.get_rating(), 'custom_name':self.custom_name}
	for key in self.dynamic_properties():
	    res[key] = getattr(self, key)
	if 0:
	    try:
		status = fetch.player_status(id64)
		if isinstance(status, (basestring, )):
		    status = {} # huh?
	    except (Exception, ), exc:
		## already logged by fetch class
		status = {}
	    res['online_state'] = status.get('online_state', 'offline')
	    res['message_state'] = status.get('message_state', '')
	res['online_state'] = res['message_state'] = ''
	return res
