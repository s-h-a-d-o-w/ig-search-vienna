// First time puppeteer, done in ~10-15 hours

const _ = require('lodash');
const puppeteer = require('puppeteer');

const closeDialog = async (page, closeButton) => {
	await closeButton.click();

	// Wait for dialog to be gone
	let hndDialog = await page.$('body > div:not([class]) > div');
	retries = 10;
	while(hndDialog !== null && retries > 0) {
		await new Promise((resolve) => setTimeout(resolve, 1000));
		hndDialog = await page.$('body > div > div[role="dialog"]');
		retries--;
	}

	if(retries === 0)
		throw new Error('Dialog did not disappear within 10 seconds!');
};

const waitUntilLoaded = async (hndDialog) => {
	// Wait for loading spinner to be removed
	let spinner = await hndDialog.$('svg');
	let retries = 10;
	while(spinner !== null && retries > 0) {
		await new Promise((resolve) => setTimeout(resolve, 1000));
		spinner = await hndDialog.$('svg');
		retries--;
	}
}

const scrollToTarget = async (page, until) => {
	// Scroll down location page X times.
	// page.evaluate executes the function in the page's context, hence e.g. window exists.
	// See: https://github.com/GoogleChrome/puppeteer/issues/305#issuecomment-385145048
	return await page.evaluate((until) => {
		return new Promise((resolve, reject) => {
			const MAX_SCROLLS = 100;
			let numScrolls = 0;
			let scroll = () => setTimeout(async () => {
				let distance = 500 + Math.random() * 1000;
				if(numScrolls < MAX_SCROLLS) {
					// Oldest post we need already on the page?
					console.log('Check timestamp of oldest post on page');
					let links = document.querySelectorAll('a[href^="/p/"]');
					links[links.length - 1].click();

					// Sometimes, the dialog simply won't open
					// If it doesn't, keep scrolling
					let dialog = document.querySelector('body > div:not([class]) > div');
					if(dialog !== null) {
						// Wait for loading spinner to be removed
						let spinner = dialog.querySelector('svg');
						let retries = 10;
						while(spinner !== null && retries > 0) {
							await new Promise((resolve) => setTimeout(resolve, 1000));
							spinner = dialog.querySelector('svg');
							retries--;
						}

						let times = document.querySelectorAll('time');
						let oldest = new Date(times[times.length - 1].getAttribute('datetime')).valueOf();

						if(oldest <= until) {
							resolve();
							return;
						}

						let closeButton = dialog.querySelector(':scope > button');
						closeButton.click();
					}

					// No, keep scrolling
					window.scrollBy(0, distance);
					numScrolls++;
					console.log(`Scrolling by ${distance}...`);
					scroll();
				}
				else {
					reject(`Target time is too far in the past, ${MAX_SCROLLS} scrolls weren't enough!`);
				}
			}, 500 + Math.random() * 500);
			scroll();
		})
	}, until);
};

const simulateUserHesitation = async () => {
	// WORKS
	// await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 6000));
	await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 3000));
};

const transformToSchema = (location, posts) => {
	// let arrHashtags = [];
	//
	// Object.keys(hashtags).forEach(key => {
	// 	arrHashtags.push({
	// 		name: key,
	// 		posts: hashtags[key].posts,
	// 	});
	// });

	return {
		location,
		posts,
	};
};

/**
 *
 * @param igLocation
 * @param until Default: 10 minutes ago.
 * @returns {Promise<{location, hashtags, posts}>}
 */
const crawlIG = async(igLocation, until = Date.now() - 10 * 60 * 1000) => {
	const posts = [];
	// Already visited posts is kept of track separately because
	// posts without hash tags won't be stored but would be checked multiple
	// times otherwise
	const visited = [];

	let locationParts = igLocation.split('/').slice(0, -1);
	let locName = locationParts[locationParts.length - 1]; // TODO: Grab pretty name from IG page
	let locId = locationParts[locationParts.length - 2];
	let location = {
		locId,
		locName,
		lastCrawled: Date.now(),
		hashtags: {},
		url: igLocation,
	};

	console.log(`Starting... (crawl until: ${new Date(until)})`);
	const browser = await puppeteer.launch();
	const page = await browser.newPage();
	page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36');
	console.log(`Navigating to ${igLocation}`);
	await page.goto(igLocation, {waitUntil: 'networkidle2'});
	console.log('Loading page finished.');

	// Forward page console output to Node.js
	page.on('console', consoleObj => console.log(consoleObj.text()));

	// try {
	// 	await scrollToTarget(page, until);
	// }
	// catch(err) {
	// 	console.log(err);
	// }

	// Keep track of pending requests
	const requests = [];
	page.on('request', request => requests.push(request));
	page.on('requestfailed', request => _.remove(requests, el => el === request));
	page.on('requestfinished', request => _.remove(requests, el => el === request));

	// After about 15 scrolls (~100 profiles), it's:
	// Failed to load resource: the server responded with a status of 429 ()
	const MAX_SCROLLS = 100;
	let numScrolls = 0;
	while(numScrolls < MAX_SCROLLS) {
		// Grab post ids and thumbnail URLs
		// brittle: Select only links in "Most recent" area of results
		let linkHandles = await page.$$('article > h2 + div a[href^="/p/"]');
		console.log('Number of posts on page: ', linkHandles.length);
		for(let i = 0; i < linkHandles.length; i++) {
			let linkHandle = linkHandles[i];

			let postId = (await page.evaluate(link => link.href, linkHandle)).match(/\/p\/(.*)\/$/)[1];
			if(visited.includes(postId)) {
				console.log(`${i} | Already crawled postId ${postId}`);
				continue;
			}

			let img = await linkHandle.$('img');
			let thumb = await page.evaluate(img => img.src.trim(), img);
			console.log(`${i} | Grabbing info for postId ${postId}`);

			try {
				await simulateUserHesitation();
				await linkHandle.click();
			}
			catch(err) {
				console.log('Node probably was detached from document in the meantime');
				continue;
			}

			let hndDialog = await page.$('body > div:not([class]) > div');
			// Sometimes, the dialog simply won't open
			if(hndDialog === null)
				continue;

			await waitUntilLoaded(hndDialog);
			let closeButton = await hndDialog.$(':scope > button');

			// Get timestamp
			let hndTime = await hndDialog.$('time');
			if(hndTime === null) {
				await closeDialog(page, closeButton);
				continue;
			}

			let createdOn = await page.evaluate(async (time) => (
				(new Date(time.getAttribute('datetime'))).valueOf()
			), hndTime);
			// console.log('createdOn', createdOn);

			// We've reached the oldest post we want
			if(createdOn <= until) {
				console.log(`Finished by reaching postId ${postId}, created on ${new Date(createdOn)}`);
				return transformToSchema(location, posts);
			}

			// ----------------------------------------------------
			// Regardless of whether the post has any hashtag, we
			// still already visited it
			visited.push(postId);
			// ----------------------------------------------------

			// Get username
			let hndUsername = await hndDialog.$('header h2');
			let username = await page.evaluate(async (username) => (
				username.innerText
			), hndUsername);
			// console.log('username', username);

			// Get hashtags
			let hndItem = await hndDialog.$('li[role="menuitem"]'); // brittle: role

			// Some posts don't have a description or comments
			if(hndItem === null) {
				await closeDialog(page, closeButton);
				continue;
			}

			let itemText = await page.evaluate(async (item) => (
				item.innerText
			), hndItem);
			// No description by author, only comments
			if(!itemText.startsWith(username)) {
				await closeDialog(page, closeButton);
				continue;
			}

			let hashtags = itemText.match(/(#[^#|^\s]*)/g);
			if(hashtags === null) {
				await closeDialog(page, closeButton);
				continue;
			}


			await simulateUserHesitation();
			await closeDialog(page, closeButton);

			// Append collected data
			let post = {
				postId,
				thumb,
				createdOn,
				username,
			};
			posts.push(post);

			hashtags.forEach(hashtag => {
				if(!location.hashtags.hasOwnProperty(hashtag)) {
					location.hashtags[hashtag] = [];
				}

				location.hashtags[hashtag].push(post.postId);
			});
		}

		// Wait for old stuff to be finished and new stuff to load.
		// Unfortunately, the spinner at the bottom of the page is never removed from
		// the DOM, so checking for that wouldn't help.
		while(requests.length > 0) {
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}

		await simulateUserHesitation();
		await page.evaluate(async () => {
			window.scrollBy(0, 2000);
		});

		while(requests.length > 0) {
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}

		numScrolls++;
	}


	await browser.close();

	return transformToSchema(location, posts);
};

// crawlIG(
// 	'https://www.instagram.com/explore/locations/63134088/vienna-austria/',
// 	new Date('2017-01-01').valueOf()
// )
// .then(({hashtags, location, posts}) => {
// 	console.log('------------------------------');
// 	console.log(hashtags);
// 	console.log(location);
// 	console.log(posts);
// 	process.exit();
// });

module.exports = {crawlIG};
