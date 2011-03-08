#!/usr/bin/env python
# -*- coding: utf-8 -*-
from logging import error, info
from google.appengine.ext import db

from tf2auctions.lib import json_dumps, json_loads, user_steam_id
from tf2auctions.models.utils import UserId64Mixin

class PlayerSettings(db.Expando, UserId64Mixin):
    """ PlayerSettings

    """
    ## not an email because db.EmailProperty requires a value (and it
    ## doesn't do any validation anyway):
    email = db.StringProperty('Player email', indexed=True)
    payload = db.TextProperty('Serialized settings (JSON encoded)')
    ## non-schema:
    notify_listing_defs = db.ListProperty(long, 'Listing Notification Item Def Indexes')

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
	    {
		'id':'notify-winning-bid', 'type':bool, 'label':'Notify Me When My Bid Wins',
		'widget':'checkbox', 'default':False,
		'help':"""
		    When enabled, you will get an email message when
		    one of your bid wins an auction."""
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
		'id':'angry-fruit-salad', 'type':bool, 'label':'Color Items by Rarity',
		'widget':'checkbox', 'default':False,
		'help':"""
		    When enabled, backpack items will be bordered and
		    shaded with their specific rarity color, very much
		    like the in-game interface.
		"""
	    },

	    {
		'id':'angry-fruit-salad-lite', 'type':bool, 'label':'Color Only Borders When Coloring By Rarity',
		'widget':'checkbox', 'default':False,
		'help':"""
		    When enabled, backpack items will be bordered but
		    not shaded with their specific rarity color. This
		    only applies if you enable 'Color Items By Rarity'
		    above.
		"""
	    },

	    {
		'id':'unusual-item-background', 'type':bool, 'label':'Show Unusual Item Effects',
		'widget':'checkbox', 'default':False,
		'help':"""
		    When enabled, backpack items with unusual effects
                    will show a background image in addition to the
                    item image.
		"""
	    },



	]),

    ]


    def __str__(self):
	return '<PlayerSettings id64=%s>' % (self.key(), )

    @classmethod
    def build(cls, owner):
	key = user_steam_id(owner) if hasattr(owner, 'nickname') else owner
	obj = cls.get_or_insert(key)
	if not obj.is_saved():
	    obj.put()
	return obj

    @classmethod
    def put_merged(cls, owner, settings):
	""" Returns the PlayerProfile for the given user, creating it if necessary. """
	obj = cls.build(owner)
	payload = {}
	## merge
	for heading, fields in cls.schema:
	    for field in fields:
		field_id = field['id']
		if field.get('primary'):
		    setattr(obj, field_id, settings.get(field_id, field.get('default')))
		else:
		    payload[field_id] = settings.get(field_id, field.get('default'))
	## non schema:
	obj.notify_listing_defs = settings.get('notify-listing-defs', [])
	obj.payload = json_dumps(payload)
	obj.put()
	return obj

    def encode_builtin(self, complete=False):
	""" Encode this instance using only built-in types. """
	try:
	    payload = json_loads(self.payload)
	except (TypeError, ):
	    payload = {}
	if complete:
	    payload['email'] = self.email
	    payload['notify-listing-defs'] = self.notify_listing_defs or []
	return payload
