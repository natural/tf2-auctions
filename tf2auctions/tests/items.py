#!/usr/bin/env python
# -*- coding: utf-8 -*-


from google.appengine.api import users
from datetime import datetime, timedelta
from tf2auctions import models as M


def test1():
    admin = users.get_current_user()
    print 'Admin:', admin

    item0 = M.PlayerItem.build(33, 44, source="{'foo':'bar'}")
    print 'Item 0:', item0


    listing_key = 'test_listing_1'
    expires = datetime.now()+timedelta(days=3)
    listing = M.Listing.get_or_insert(listing_key, owner=admin, expires=expires, description='just a test')
    print 'Listing: ', listing


    item1 = M.ListingItem.build(123, 1, listing=listing)
    print 'Listing item 1:', item1

    item2 = M.ListingItem.build(124, 2, listing=listing)
    print 'Listing item 2:', item2


    #print M.ListingItem.build(123, 4444, source="{'zz':'zz'}")
    #print M.ListingItem.get_by_uid(123)
