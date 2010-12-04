#!/usr/bin/env python
# -*- coding: utf-8 -*-
from google.appengine.ext import db

from tf2auctions.lib import View
from tf2auctions.models import Listing


class ListingDetailView(View):
    """ Returns a page for showing the details of a listing.

    """
    template_name = 'listing_detail.pt'
    related_css = ('listing_detail.css', )
    related_js = ('df.js', 'listing_detail.js', )

    def get(self):
	try:
	    key = db.Key.from_path('Listing', int(self.path_tail()))
	    exists = Listing.all(keys_only=True).filter('__key__', key).get()
	except (Exception, ), exc:
	    self.error(500)
	else:
	    if exists:
		self.render()
	    else:
		self.error(404)
		self.render(self.template('404.pt'))


main = View.make_main(ListingDetailView)


if __name__ == '__main__':
    main()
