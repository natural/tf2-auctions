Major Features
--------------


1.  Shops (target version 77)
    *  include quant sold
    *  prefer automatically determining kind of shop: "vintage hats",
        "metal", "keys", etc.
    *  allow owner to edit name and provide markdown description


2.  On-site Chat (no release target)


Minor Features
--------------


1.  In api proxy, add last ditch attempt one profile search to look
    for steamcommunity.com/id/<q>

2.  On profile, support limits on bid and listing fetch.

3.  On full backpack views, after "Show All" is selected, show page
    numbers upper right of each backpack page; maybe provide toolbar
    to scroll with the page.

4.  Add quality selection to minimum bid and search; click image to
    cycle thru available qualities, update border as visual cue.

5.  Add "active bid" and "active listing" title (with matching color)
    to tooltip; maybe link to listing/bid, too.


Minor Changes
-------------


1.  Rewrite listing_add.js

2.  Clean up javascript selector string generation.

3.  Add script to round corners in IE.  IE sucks.

4. Reduce proxy cache time for items feed (but not schema).

5. Decrease the size of divs + images on min bid blocks.
