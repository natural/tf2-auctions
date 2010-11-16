#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2auctions.lib import template_main


main = template_main('backpack_viewer.pt',
		     related_js=('backpack.js', 'backpack_viewer.js', ))


if __name__ == '__main__':
    main()
