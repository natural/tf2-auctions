#!/usr/bin/env python
# -*- coding: utf-8 -*-


from google.appengine.ext import db
from tf2auctions.models import PlayerItem


class Shop(db.Model):
    """ Shop ->

    """
    owner = db.StringProperty('Owner', required=True, indexed=True)
    status = db.CategoryProperty('Status', required=True, indexed=True)
    details = db.TextProperty('Details', required=True, default='')
    tags = db.ListProperty(db.Category, required=True, default=None)


class InventoryGroup(db.Model):
    """ InventoryGroup -> shop item sets (one or more) for sale as a group

    """
    shop = db.ReferenceProperty(Shop, 'Shop', required=True, indexed=True)
    items = db.ListProperty(db.Key)


class ShopItem(PlayerItem):
    """ ShopItem - > an item in a shop inventory group.

    """
    shop = db.ReferenceProperty(Shop, 'Shop', required=True, indexed=True)
    group = db.ReferenceProperty(InventoryGroup, 'Group', required=True, indexed=True)


class Order:
    """ Order -> an order placed for one or more inventory groups.

    """
    shop = db.ReferenceProperty(Shop, 'Shop', required=True, indexed=True)
    buyer = db.StringProperty('Owner', required=True, indexed=True)
    groups = db.ListProperty(db.Key)
