#!/usr/bin/env python
# -*- coding: utf-8 -*-
import os
import re

from google.appengine.ext.remote_api import handler
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app

from tf2auctions import features

secret_key = open(os.path.join(features.app_dir, 'admin_key.nodist')).read().strip()
cookie_re = re.compile('^"([^:]+):.*"$')


class ApiCallHandler(handler.ApiCallHandler):
    def CheckIsAdmin(self):
        login_cookie = self.request.cookies.get('dev_appserver_login', '')
        match = cookie_re.search(login_cookie)
	if (match and match.group(1) == secret_key and 'X-appcfg-api-version' in self.request.headers):
	    return True
	else:
	    self.redirect('/_ah/login')
	    return False


application = webapp.WSGIApplication([('.*', ApiCallHandler)])


def main():
    run_wsgi_app(application)


if __name__ == '__main__':
    main()
