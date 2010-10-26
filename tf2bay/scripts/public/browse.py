#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2bay.lib import template_main


main = template_main('browse.pt', related_css='browse.css', related_js=('browse.js', 'backpack.js'))


if __name__ == '__main__':
    main()
