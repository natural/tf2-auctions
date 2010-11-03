#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2auctions.lib import template_main


main = template_main('listing_add.pt',
		     related_css='listing_add.css',
		     related_js=('backpack.js', 'listing_add.js'))


if __name__ == '__main__':
    main()
