#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2bay.lib import View
from tf2bay.models import category_filters


class ListingBrowserView(View):
    template_name = 'browse.pt'
    related_css = ('browse.css', )
    related_js = ('browse.js', 'backpack.js', )

    def filters(self):
	return [(key, name) for key, name, filt in category_filters]


main = View.make_main(ListingBrowserView)


if __name__ == '__main__':
    main()
