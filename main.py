#!/usr/bin/env python
from lib.env import add_local_paths
add_local_paths()

from google.appengine.ext.webapp import RequestHandler, WSGIApplication
from google.appengine.ext.webapp.util import run_wsgi_app

from tf2bay.apps.api import ListingApi, PublicApi, PublicQueryApi, ExpireApi, ListingDetailsApi
from tf2bay.apps.basic import basicView, NotFound
from tf2bay.apps.listing import AddListingView, ListingsBrowserView, ListingDetailView
from tf2bay.apps.profile import ProfileView, ProfileApi
from tf2bay.utils import environ_extras_middleware


routes = (
    (r'/api/v1/expire-listing', ExpireApi),
    (r'/api/v1/(add-listing|cancel-listing|add-bid)', ListingApi),
    (r'/api/v1/own-profile', ProfileApi),

    (r'/api/v1/(player-listings|player-bids)/(\d{17})', PublicQueryApi),
    (r'/api/v1/listings/(\d{1,20})', ListingDetailsApi),
    (r'/api/v1/(browse-listings|search-listings)', PublicApi),

    (r'/profile', ProfileView),
    (r'/listings/add', AddListingView),
    (r'/listings/search', NotFound),
    (r'/listings/(\d{1,20})', ListingDetailView),
    (r'/listings', ListingsBrowserView),

    (r'/login', basicView('login.pt', 'login.css', 'login.js')),
    (r'/echo', basicView('echo.pt')),
    (r'/', basicView('front.pt')),
    (r'/(.*)', NotFound),
)


def main():
    app = WSGIApplication(routes, debug=True)
    app = environ_extras_middleware(app, factory=lambda:{})
    run_wsgi_app(app)


if __name__ == '__main__':
    main()
