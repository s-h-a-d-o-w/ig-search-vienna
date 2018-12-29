## IMPORTANT

This was thrown together in just a few days and I have no intention 
of cleaning it up and making it more general purpose because it 
already does what I need. But if you find it useful as a base (it 
is pretty simple setup after all) - go nuts.

## What it does

All I wanted to do was find interesting posts from people where 
I live.
But instagram's laughable search functionality makes that impossible.
And their [APIs](https://www.instagram.com/developer/) ~~suck~~ are 
very restrictive "in the interest of privacy".

So I wrote this little scraper that retrieves infos about hashtags 
being used in the city where I currently live at a slow enough rate 
that the IG servers don't seem to care (otherwise - `429`).

And it's already been great seeing what people around here who use 
hashtags like e.g. `#franzkafka` produce. 

## How it works

- Puppeteer scrapes the info at a really low speed (initial scraping 
will take **~2 hours**)
- The resulting data is stored in memory
- The data is also mirrored in a `lowdb` file db so that subsequent 
startups only take seconds. (If db.json isn't removed between startups and the timestamp to 
"scrape until" in `server/index.js` is set to `Date.now()`)
- The backend serves this data through a GraphQL API
- Frontend... very simple, nothing to say. (Although I want to note 
that this is first time I found a good use case for `create-react-app`.
So far, I've only used it for tests. Usually, I either set up things from 
scratch or use Next.js for anything that's supposed to be usable. But from 
scratch would've taken too long and Next.js... SSR/TS and GraphQL... no
time for that either.)
