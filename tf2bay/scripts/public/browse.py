#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2bay.lib import View


class ListingBrowserView(View):
    template_name = 'browse.pt'
    related_css = ('browse.css', )
    related_js = ('browse.js', )

    def filters(self):
	return (
	    ('new', 'New'),
	    ('ending-soon', 'Ending Soon'),
	    ('popular', 'Popular'),
	    ('hats', 'Hats'),
	    ('weapons', 'Weapons'),
	    ('tools', 'Tools'),
	)

main = View.make_main(ListingBrowserView)

if __name__ == '__main__':
    main()
