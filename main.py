#!/usr/bin/env python
from lib.env import add_local_paths
add_local_paths()

from google.appengine.ext.webapp import RequestHandler, WSGIApplication
from google.appengine.ext.webapp.util import run_wsgi_app

from tf2bay.apps import api
from tf2bay.apps.basic import basicView, NotFound
from tf2bay.apps.listing import AddListingView, ListingBrowserView, ListingDetailView
from tf2bay.apps.profile import ProfileLogin, ProfileView
from tf2bay.utils import environ_extras_middleware


routes = (
    (r'/api/v1/(add-listing|cancel-listing|add-bid)', api.ListingEditor),
    (r'/api/v1/own-profile', api.Profile),

    (r'/api/v1/(player-listings|player-bids)/(\d{17})', api.PublicQ),
    (r'/api/v1/listing/(\d{1,20})', api.ListingDetail),
    (r'/api/v1/listing/search', api.Search),
    (r'/api/v1/stats', api.Stats),

    (r'/profile/(\d{17})', ProfileView),
    (r'/profile-update', ProfileLogin),

    (r'/listing/add', AddListingView),
    (r'/listing/(\d{1,20})', ListingDetailView),

    (r'/browse', ListingBrowserView),
    (r'/login', basicView('login.pt', 'login.css', 'login.js')),
    (r'/echo', basicView('echo.pt')),
    (r'/', basicView('front.pt', related_js='front.js')),
    (r'/(.*)', NotFound),
)


def main():
    app = WSGIApplication(routes, debug=True)
    app = environ_extras_middleware(app, factory=lambda:{})
    run_wsgi_app(app)


if __name__ == '__main__':
    main()
