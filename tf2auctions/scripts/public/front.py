#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2auctions.lib import template_main


main = template_main('front.pt', related_js=('front.js', ), related_rss=('/index.rss', ))


if __name__ == '__main__':
    main()
