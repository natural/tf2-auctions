#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2bay.lib import ApiHandler
from tf2bay.models import Listing



class Search(ApiHandler):
    def get(self):
	q = Listing.all()
	q.filter('status = ', 'active')
	listings = q.fetch(limit=10)
	self.write_json([n.encode_builtin() for n in listings])


main = ApiHandler.make_main(Search)


if __name__ == '__main__':
    main()
