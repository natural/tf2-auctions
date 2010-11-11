#!/usr/bin/env python
# -*- coding: utf-8 -*-
from logging import error
from google.appengine.api import users

from tf2auctions.lib import ApiHandler
from tf2auctions.models.message import PlayerMessage


class LeaveMessage(ApiHandler):
    def post(self):
	try:
	    source = users.get_current_user()
	    if not source:
		self.error(401)
		return
	    payload = self.body_json()
	    msg = PlayerMessage.build(source,
				      payload['target'],
				      payload['message'][0:400])
	    self.write_json({'msg':'success'})
	except (Exception, ), exc:
	    error('leave message: %s', exc)
	    self.error(500)
	    self.write_json({'exception':str(exc)})


main = ApiHandler.make_main(LeaveMessage)


if __name__ == '__main__':
    main()
