#!/usr/bin/env python
# -*- coding: utf-8 -*-
import itertools
from tf2auctions.lib import View, make_main


class Search(View):
    template_name = 'search.pt'
    related_css = ('search.css', )
    related_js = ('search.js', 'backpack.js')

    def extra_context(self):
	return (
	    ('itertools', itertools),
	)


main = make_main(Search)


if __name__ == '__main__':
    main()
