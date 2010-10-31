#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2bay.lib import template_main


main = template_main('all_items.pt', related_js='all_items.js')


if __name__ == '__main__':
    main()
