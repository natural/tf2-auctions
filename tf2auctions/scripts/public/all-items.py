#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2auctions.lib import template_main


main = template_main('all_items.pt', related_js=('backpack.js', 'all_items.js'))


if __name__ == '__main__':
    main()
