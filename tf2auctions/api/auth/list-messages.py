#!/usr/bin/env python
# -*- coding: utf-8 -*-
from google.appengine.api import users

from tf2auctions.lib import ApiHandler, user_steam_id
from tf2auctions.models.message import PlayerMessage


class FetchMessages(ApiHandler):
    def get(self):
	try:
	    user = users.get_current_user()
	    msgs = PlayerMessage.get_for_user(user)
	except (Exception, ), exc:
	    self.error(500)
	    exc = exc.message if hasattr(exc, 'message') else str(exc)
	    result = {'msg':'error', 'description':exc}
	else:
	    result = {
		'messages' : [msg.encode_builtin() for msg in msgs],
		'full' : len(msgs) >= 100,
	    }
	return self.write_json(result)


main = ApiHandler.make_main(FetchMessages)


if __name__ == '__main__':
    main()

