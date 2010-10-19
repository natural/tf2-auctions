#!/usr/bin/env python
# -*- coding: utf-8 -*-
from google.appengine.ext import db

from tf2bay.lib import View
from tf2bay.models import Listing


class ListingDetailView(View):
    template_name = 'listing_detail.pt'
    related_css = ('listing_detail.css', )
    related_js = ('listing_detail.js', )

    def get(self):
	listing_id = self.path_tail()
        key = db.Key.from_path('Listing', int(listing_id))
	exists = Listing.all(keys_only=True).filter('__key__', key).get()
	if exists:
	    self.render()
	else:
	    self.error(404)
	    self.render(self.template('404.pt'))


main = View.make_main(ListingDetailView)


if __name__ == '__main__':
    main()
