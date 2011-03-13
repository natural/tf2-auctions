Major Features
--------------

1.  Support Center (target version 74)
    a.  read/write issues on github.
    b.  consolidate faq, contact, issues, etc.
    c.  provide view of TODO.md (this file)
    d.  provide view of CHANGES.md

1.  Shops (target version 75)
    a.  include quant sold
    b.  prefer automatically determining kind of shop: "vintage hats",
        "metal", "keys", etc.
    c.  allow owner to edit name and provide markdown description

3.  On-site Chat (no release target)


Minor Features
--------------

1.  In api proxy, add last ditch attempt one profile search to look
    for steamcommunity.com/id/<q>

2.  On profile, support limits on bid and listing fetch.

3.  On backpack viewer, search for local profile and link to it if
    found.

4.  On full backpack views, after "Show All" is selected, show page
    numbers upper right of each backpack page; maybe provide toolbar
    to scroll with the page.

5.  Add quality selection to minimum bid and search; click image to
    cycle thru available qualities, update border as visual cue.

6.  Add "active bid" and "active listing" title (with matching color)
    to tooltip; maybe link to listing/bid, too.


Minor Changes
-------------

1.  Rewrite listing_add.js

2.  Decrease logging verbosity in production.

3.  Clean up javascript query string generation.

4.  On backpack viewer, clear existing backpack when selection is made
    when backpack is private.
