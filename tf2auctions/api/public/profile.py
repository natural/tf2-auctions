#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2auctions.lib import ApiHandler, search_id64
from tf2auctions.models import PlayerProfile


class Profile(ApiHandler):
    def get(self):
	name = self.path_tail()
	try:
	    profile = PlayerProfile.get_by_id64(search_id64(name))
	except (Exception, ), exc:
	    profile = PlayerProfile.get_by_name(name)
	if not profile:
	    self.error(404)
	else:
	    profile.refresh()
	    self.write_json(profile.encode_builtin())


main = ApiHandler.make_main(Profile)


if __name__ == '__main__':
    main()
