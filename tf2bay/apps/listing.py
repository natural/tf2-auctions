#!/usr/bin/env python
# -*- coding: utf-8 -*-
from cgi import parse_qs
from logging import exception

from google.appengine.api import users

from tf2bay.apps import View
from tf2bay.models import Listing, ListingItem, PlayerProfile, db


class AddListingView(View):
    template_name = 'newlisting.pt'
    related_js = ('add-listing.js', )

    def get(self):
	self.render()


class ListingsBrowserView(View):
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


class ListingDetailView(View):
    template_name = 'listing_detail.pt'
    related_js = ('display-listing.js', )

    def get(self, listing_id):
        key = db.Key.from_path('Listing', int(listing_id))
	exists = Listing.all(keys_only=True).filter('__key__', key).get()
	if exists:
	    self.render()
	else:
	    self.error(404)
	    self.render(self.template('404.pt'))



