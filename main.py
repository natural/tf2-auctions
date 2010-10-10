#!/usr/bin/env python
from lib.env import add_local_paths
add_local_paths()

from google.appengine.ext.webapp import RequestHandler, WSGIApplication
from google.appengine.ext.webapp.util import run_wsgi_app

from tf2bay.utils import environ_extras_middleware
from tf2bay.views import simple
from tf2bay.views.auction import AuctionView
from tf2bay.views.profile import ProfileView



routes = (
    (r'/login', simple.LoginView),
    (r'/echo', simple.EchoView),
    (r'/profile', ProfileView),
    (r'/auction/(?P<auction>.{1,32})', AuctionView),
    (r'/', simple.FrontView),
    (r'/(.*)', simple.NotFound),
)


def api_keys():
    return [key.strip() for key in open('apikey.nodist').readlines()]
api_keys = api_keys()


def api_key_factory():
    return {'WEB_API_KEY':api_keys[0]}


def main():
    app = WSGIApplication(routes, debug=True)
    app = environ_extras_middleware(app, factory=api_key_factory)
    run_wsgi_app(app)

if __name__ == '__main__':
    main()

