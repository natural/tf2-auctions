#!/usr/bin/env python
# -*- coding: utf-8 -*-
from logging import error
from google.appengine.api import users

from tf2auctions.lib import ApiHandler
from tf2auctions.models.message import PlayerMessage


class RemoveMessage(ApiHandler):
    def post(self):
	try:
	    key = self.body_json()['key']
	    PlayerMessage.remove(key, users.get_current_user())
	except (Exception, ), exc:
	    self.error(500)
	    error('remove message: %s', exc)
	    exc = exc.message if hasattr(exc, 'message') else str(exc)
	    result = {'msg':'error', 'description':exc}
	else:
	    result = {'msg':'success'}
	return self.write_json(result)


main = ApiHandler.make_main(RemoveMessage)


if __name__ == '__main__':
    main()
