#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2auctions.lib import View, template_main


main = template_main('search.pt',
		     related_css = ('search.css', ),
		     related_js = ('search.js', 'backpack.js'))


if __name__ == '__main__':
    main()
