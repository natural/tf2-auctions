#!/usr/bin/env python
from google.appengine.ext.webapp import RequestHandler, WSGIApplication
from google.appengine.ext.webapp.util import run_wsgi_app


def api_keys():
    return [key.strip() for key in open('apikey.txt').readlines()]
api_keys = api_keys()


def api_key_factory():
    return {'WEB_API_KEY':api_keys[0]}


def environ_extras_middleware(app, factory=api_key_factory):
    def environ_extras_app(environ, start_response):
	environ.update(factory())
	return app(environ, start_response)
    return environ_extras_app


routes = (
#    (r'/api/v1/items/(?P<id64>\d{17})', ItemsApp),
#    (r'/api/v1/profile/(?P<id64>\d{17})', ProfileApp),
#    (r'/api/v1/search/(?P<name>.{1,32})', SearchApp),
#    (r'/api/v1/schema', SchemaApp),
)


def main():
    app = WSGIApplication(routes, debug=True)
    app = environ_extras_middleware(app)
    run_wsgi_app(app)


if __name__ == '__main__':
    main()

