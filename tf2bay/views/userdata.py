#!/usr/bin/env python
from google.appengine.ext.webapp import RequestHandler, WSGIApplication
from google.appengine.ext.webapp.util import run_wsgi_app

from tf2bay.views import login_url, users


class LoginApp(RequestHandler):
    def get(self):
	data = ['<html><body>', ]
	data.append('<a href="%s">login</a>' % (login_url, ))
	data.append('</body></html>')
	data = '\n'.join(data)
	self.response.out.write(data)


scr = 'http://ajax.googleapis.com/ajax/libs/jquery/1.4.2/jquery.min.js'

class UserDataApp(RequestHandler):
    def get(self):
	user = users.get_current_user()

	data = ['<html><head><script src="%s" type="text/javascript"></script><body>' % scr, ]
	data.append('<br>nickname: %s' % user.nickname())
	data.append('<br>email: %s' % user.email())
	data.append('<br>user_id: %s' % user.user_id())

	data.append('<br>auth_domain: %s' % user.auth_domain())
	data.append('<br>federated_identity: %s' % user.federated_identity())
	data.append('<br>federated_provider: %s' % user.federated_provider())

	data.append('<br>__repr__: %s' % repr(user))
	data.append('<br>__hash__: %s' % hash(user))

	data.append('</body></html>')
	data = '\n'.join(data)
	self.response.out.write(data)

routes = (
    (r'/login', LoginApp),
    (r'/userdata', UserDataApp),
)


def main():
    app = WSGIApplication(routes, debug=True)
    run_wsgi_app(app)


if __name__ == '__main__':
    main()

