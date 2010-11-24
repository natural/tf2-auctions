#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2auctions.lib import template_main


main = template_main('subscribe_index.pt', related_js=('subscribe_index.js', ))


if __name__ == '__main__':
    main()
