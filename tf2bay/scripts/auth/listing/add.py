#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2bay.lib import template_main

main = template_main('listing_add.pt', related_js='listing_add.js')

if __name__ == '__main__':
    main()