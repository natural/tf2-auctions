#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2bay.models import Listing, ListingItem
from tf2bay.views import PageHandler



class BrowseView(PageHandler):
    template_name = 'browse.pt'


    def __get(self, **kwds):
	q = Listing.all()
	listings = q.fetch(limit=10)
	self.render(listings=listings)


    def filters(self):
	return (
	    ('new', 'New'),
	    ('ending-soon', 'Ending Soon'),
	    ('popular', 'Popular'),
	    ('hats', 'Hats'),
	    ('weapons', 'Weapons'),
	    ('tools', 'Tools'),
	)
