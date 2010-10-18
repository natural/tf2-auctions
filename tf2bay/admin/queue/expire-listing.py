#!/usr/bin/env python
from lib.env import add_local_paths
add_local_paths()

from google.appengine.ext.webapp import RequestHandler, WSGIApplication
from google.appengine.ext.webapp.util import run_wsgi_app


class ExpireListing(RequestHandler):
    def post(self):
	import logging
	data = self.request.get('key')
	logging.warn('expire listing: %s', data)
	self.response.out.write('OK')

app = WSGIApplication([('.*', ExpireListing)], debug=True)



def main():
    run_wsgi_app(app)


if __name__ == '__main__':
    main()
