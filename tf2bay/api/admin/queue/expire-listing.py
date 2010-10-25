#!/usr/bin/env python
# -*- coding: utf-8 -*-
from logging import warn

from tf2bay.lib import ApiHandler


class ExpireListing(ApiHandler):
    def post(self):
	data = self.request.get('key')
	warn('expire listing: %s', data)
	self.response.out.write('OK')


main = ApiHandler.make_main(ExpireListing)


if __name__ == '__main__':
    main()
