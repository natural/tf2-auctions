#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2auctions.lib import ApiHandler
from tf2auctions.models.faq import get_all_decoded


class Faq(ApiHandler):
    def get(self):
	self.write_json( get_all_decoded() )


main = ApiHandler.make_main(Faq)


if __name__ == '__main__':
    main()
