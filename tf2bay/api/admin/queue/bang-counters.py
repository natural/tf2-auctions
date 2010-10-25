#!/usr/bin/env python
# -*- coding: utf-8 -*-
from logging import exception

from tf2bay.lib import ApiHandler
from tf2bay.models.counters import increment_counter


class BangCounters(ApiHandler):
    def post(self):
	for key in self.request.arguments():
	    value = self.request.get(key)
	    try:
		value = int(value)
	    except (ValueError, ):
		exception('bad value in bang-counters: %s + %s', key, value)
	    else:
		increment_counter(key, value)
	self.response.out.write('OK')


main = ApiHandler.make_main(BangCounters)


if __name__ == '__main__':
    main()
