#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2auctions.lib import ApiHandler
from tf2auctions.models import PlayerProfile


class Profile(ApiHandler):
    def get(self):
	id64 = self.path_tail()
	profile = PlayerProfile.get_by_id64(id64)
	if not profile:
	    self.error(404)
	    return
	self.write_json(profile.encode_builtin())


main = ApiHandler.make_main(Profile)


if __name__ == '__main__':
    main()
