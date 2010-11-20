#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2auctions.lib import View, make_main


class SearchRedirect(View):
    def get(self):
	self.redirect('/search')


main = make_main(SearchRedirect)


if __name__ == '__main__':
    main()
