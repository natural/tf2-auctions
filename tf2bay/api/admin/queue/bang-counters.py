#!/usr/bin/env python
from logging import info, warn

from google.appengine.ext.webapp import RequestHandler, WSGIApplication
from google.appengine.ext.webapp.util import run_wsgi_app

from tf2bay.models.counters import increment_counter


class BangCounters(RequestHandler):
    def post(self):
	for key in self.request.arguments():
	    value = self.request.get(key)
	    try:
		value = int(value)
	    except (ValueError, ):
		warn('bad value in bang-counters: %s + %s', key, value)
	    else:
		increment_counter(key, value)
		info('bang-counters: %s + %s', key, value)
	self.response.out.write('OK')


def main():
    run_wsgi_app(WSGIApplication([('.*', BangCounters)], debug=True))


if __name__ == '__main__':
    main()
