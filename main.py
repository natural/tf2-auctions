#!/usr/bin/env python
from lib.env import add_local_paths
add_local_paths()

from google.appengine.ext.webapp import RequestHandler, WSGIApplication
from google.appengine.ext.webapp.util import run_wsgi_app


from tf2bay.utils import environ_extras_middleware
from tf2bay.views import simple
from tf2bay.views.api import AuctionApi, PublicApi
from tf2bay.views.browse import BrowseView
from tf2bay.views.profile import ProfileView
from tf2bay import models


routes = (
    (r'/api/v1/(get-listings|search-listings)', PublicApi),
    (r'/api/v1/(add-listing|cancel-listing|add-bid)', AuctionApi),
    (r'/login', simple.LoginView),
    (r'/echo', simple.EchoView),
    (r'/profile', ProfileView),
    (r'/browse', BrowseView),
    (r'/', simple.FrontView),
    (r'/(.*)', simple.NotFound),
)


def main():
    app = WSGIApplication(routes, debug=True)
    app = environ_extras_middleware(app, factory=lambda:{})
    run_wsgi_app(app)

if __name__ == '__main__':
    main()

