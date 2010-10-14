#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2bay.apps import PageHandler
from tf2bay.models import Listing, ListingItem




class BrowseView(PageHandler):
    template_name = 'browse.pt'
    related_js = ('browse.js', )

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
