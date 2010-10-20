#!/usr/bin/env python
from logging import info, warn

from google.appengine.ext.webapp import RequestHandler, WSGIApplication
from google.appengine.ext.webapp.util import run_wsgi_app

from tf2bay import lib


class ExpireListing(RequestHandler):
    def post(self):
	data = self.request.get('key')
	warn('expire listing: %s', data)
	self.response.out.write('OK')


def main():
    run_wsgi_app(WSGIApplication([('.*', ExpireListing)], debug=lib.debug))


if __name__ == '__main__':
    main()
