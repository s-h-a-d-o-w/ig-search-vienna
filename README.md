# instagram-search-vienna

## IMPORTANT

This was thrown together in just a few days. I had never worked with Puppeteer 
and GraphQL before and I have no intention of refactoring and making it 
more general purpose because it already does what I need.

## What it does

All I wanted to do was find interesting posts from people where 
I live.
But instagram's laughable search functionality makes that impossible.
And their [APIs](https://www.instagram.com/developer/) ~~suck~~ are 
very restrictive "in the interest of privacy".

So I wrote this little scraper that retrieves infos about hashtags 
being used in the city where I currently live at a slow enough rate 
that the IG servers don't seem to care (otherwise - `429`).

And it's already been helpful for penetrating the noise compared to looking 
at **all** recent posts for Vienna.

## How to use

Running `server` (or `start`) will take 1-2 hours until the API becomes 
available depending on how many IG posts were created 
since it was last run. A maximum of 100 scrolls on instagram's results 
will be simulated, then it'll be merged with any possible data that was 
already in `db.json` and served.

### Development

Backend and frontend run separately (so that their debug output isn't mixed).

```bash
yarn dev
yarn server
```

### Production

Required env variable: `REACT_APP_BASE_URL`

```bash
yarn build
yarn start
```

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
