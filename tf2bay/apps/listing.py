#!/usr/bin/env python
# -*- coding: utf-8 -*-
from cgi import parse_qs
from logging import exception

from google.appengine.api import users

from tf2bay.apps import PageHandler
from tf2bay.models import Listing, ListingItem, PlayerProfile


class AddListingView(PageHandler):
    template_name = 'newlisting.pt'
    related_js = ('add-listing.js', )

    def get(self):
	self.render()


class ListingsBrowserView(PageHandler):
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
