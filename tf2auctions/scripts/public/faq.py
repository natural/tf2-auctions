#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2auctions.lib import template_main


main = template_main('faq.pt', related_js='faq.js')


if __name__ == '__main__':
    main()
