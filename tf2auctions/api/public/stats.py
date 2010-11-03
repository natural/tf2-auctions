#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2auctions.lib import ApiHandler
from tf2auctions.models.counters import get_counter


class Stats(ApiHandler):
    keys = ('bids', 'bid_items', 'listings', 'listing_items', 'players')

    def get(self):
	stats = [(k, get_counter(k)) for k in self.keys]
	self.write_json(dict(stats))


main = ApiHandler.make_main(Stats)


if __name__ == '__main__':
    main()
