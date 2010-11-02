#!/usr/bin/env python
# -*- coding: utf-8 -*-
from logging import error, warn

from tf2bay.lib import ApiHandler
from tf2bay.models import Listing


class EndListing(ApiHandler):
    def post(self):
	try:
	    key = self.request.get('key')
	    warn('end listing: %s', key)
	    listing = Listing.get(key)
	    if listing:
		listing.end('Ended by system.')
	except (Exception, ), exc:
	    error('expire listing exception: %s', exc)
	    self.response.out.write('ERROR')
	else:
	    self.response.out.write('OK')


main = ApiHandler.make_main(EndListing)


if __name__ == '__main__':
    main()
