#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2auctions.lib import View, make_main
from tf2auctions.models.settings import PlayerSettings


class Profile(View):
    template_name = 'profile.pt'
    related_css = ('profile.css', )
    related_js = ('profile.js', )

    def extra_context(self):
	## we're using the schema to create the form and thereby avoid
	## transmitting the schema with every fetch to the player
	## settings api.
	return (
	    ('settings_schema', PlayerSettings.schema),
	)

main = make_main(Profile)


if __name__ == '__main__':
    main()
