#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2bay.lib import ApiHandler
from tf2bay.models.counters import get_counter


class Stats(ApiHandler):
    def get(self):
	self.write_json({
	    'items':get_counter('items'),
	    'listings':get_counter('listings'),
	    'players':get_counter('players'),
	})


main = ApiHandler.make_main(Stats)


if __name__ == '__main__':
    main()
