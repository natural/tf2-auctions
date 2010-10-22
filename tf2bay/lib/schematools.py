#!/usr/bin/env python
# -*- coding: utf-8 -*-


known_categories = [
    'craft_bar', 'craft_token', 'hat', 'supply_crate', 'tool', 'weapon',
]


def item_categories(items, schema):
    schema_items = schema['result']['items']['item']
    schema_cats = dict((s['defindex'], s.get('craft_class')) for s in schema_items)
    return set(schema_cats[i['defindex']] for i in items)
