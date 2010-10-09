#!/usr/bin/env python
from google.appengine.ext.webapp import RequestHandler, WSGIApplication
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.api import users


login_url = users.create_login_url(dest_url='/userdata',
				   federated_identity='steamcommunity.com/openid')

login_icon_url = 'http://steamcommunity.com/public/images/signinthroughsteam/sits_large_border.png'


class LoginApp(RequestHandler):

    def get(self):
	data = ['<html><body>', ]
	data.append('<a href="%s"><img src="%s" /></a>' % (login_url, login_icon_url))
	data.append('</body></html>')
	data = '\n'.join(data)
	self.response.out.write(data)

class UserDataApp(RequestHandler):
    def get(self):
	user = users.get_current_user()

	data = ['<html><body>', ]
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

