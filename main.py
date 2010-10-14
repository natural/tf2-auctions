#!/usr/bin/env python
from lib.env import add_local_paths
add_local_paths()

from google.appengine.ext.webapp import RequestHandler, WSGIApplication
from google.appengine.ext.webapp.util import run_wsgi_app

from tf2bay.apps import simple
from tf2bay.apps.api import AuctionApi, PublicApi, PublicQueryApi
from tf2bay.apps.listing import AddListingView, ListingsBrowserView
from tf2bay.apps.profile import ProfileView, ProfileApi
from tf2bay.utils import environ_extras_middleware


routes = (
    (r'/api/v1/(listings|bids)/(\d{17})', PublicQueryApi),
    (r'/api/v1/(browse-listings|search-listings)', PublicApi),
    (r'/api/v1/own-profile', ProfileApi),
    (r'/api/v1/(add-listing|cancel-listing|add-bid)', AuctionApi),
    (r'/login', simple.LoginView),
    (r'/echo', simple.EchoView),
    (r'/profile', ProfileView),
    (r'/listings/add', AddListingView),
    (r'/listings/search', simple.EchoView),
    (r'/listings', ListingsBrowserView),
    (r'/', simple.FrontView),
    (r'/(.*)', simple.NotFound),
)


def main():
    app = WSGIApplication(routes, debug=True)
    app = environ_extras_middleware(app, factory=lambda:{})
    run_wsgi_app(app)


if __name__ == '__main__':
    main()
