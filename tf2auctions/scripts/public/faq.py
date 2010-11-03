#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2auctions.lib import template_main


main = template_main('contact.pt', related_js='contact.js')


if __name__ == '__main__':
    main()
