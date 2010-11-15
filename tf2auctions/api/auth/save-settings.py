#!/usr/bin/env python
# -*- coding: utf-8 -*-
from logging import error
from google.appengine.api import users

from tf2auctions.lib import ApiHandler
from tf2auctions.models.settings import PlayerSettings


class SaveSettings(ApiHandler):
    def post(self):
	try:
	    user = users.get_current_user()
	    settings = self.body_json()
	    PlayerSettings.put_merged(user, settings)
	except (Exception, ), exc:
	    self.error(500)
	    error('save settings: %s', exc)
	    exc = exc.message if hasattr(exc, 'message') else str(exc)
	    result = {'msg':'error', 'description':exc}
	else:
	    result = {'msg':'success'}
	return self.write_json(result)


main = ApiHandler.make_main(SaveSettings)


if __name__ == '__main__':
    main()
