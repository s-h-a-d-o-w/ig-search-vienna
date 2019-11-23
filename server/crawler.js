const _ = require('lodash');
const puppeteer = require('puppeteer');

const closeDialog = async (page, closeButton) => {
	await closeButton.click();

	// Wait for dialog to be gone
	let hndDialog = await page.$('body > div:not([class]) > div');
	let retries = 10;
	while(hndDialog !== null && retries > 0) {
		await new Promise((resolve) => setTimeout(resolve, 1000));
		hndDialog = await page.$('body > div > div[role="dialog"]');
		retries--;
	}

	if(retries === 0)
		throw new Error('Dialog did not disappear within 10 seconds!');
};

const scrollDown = async (page, requests) => {
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
};

const simulateUserHesitation = async () => {
	await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 3000));
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
};

/**
 * @param igLocation
 * @param until Default: The beginning of time ;-) (0).
 * @returns {Promise<{location, posts}>}
 */
const crawlIG = async(igLocation, until = 0) => {
	const MAX_SCROLLS = 1000;
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

	// Puppeteer initialization
	console.log(`Starting... (crawl until: ${new Date(until)} - or a maximum of ${MAX_SCROLLS} scrolls)`);
	const browser = await puppeteer.launch();
	const page = await browser.newPage();
	page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36');
	console.log(`Navigating to ${igLocation}`);
	await page.goto(igLocation, {waitUntil: 'networkidle2'});
	console.log('Loading page finished.');

	// Forward page console output to Node.js
	page.on('console', consoleObj => console.log(consoleObj.text()));

	// Keep track of pending requests
	const requests = [];
	page.on('request', request => requests.push(request));
	page.on('requestfailed', request => _.remove(requests, el => el === request));
	page.on('requestfinished', request => _.remove(requests, el => el === request));

	let numScrolls = 0;
	while(numScrolls < MAX_SCROLLS) {
		// brittle: Select only links in "Most recent" area of results
		let linkHandles = await page.$$('article > h2 + div a[href^="/p/"]');
		console.log('Number of posts on page: ', linkHandles.length);

		for(let i = 0; i < linkHandles.length; i++) {
			let linkHandle = linkHandles[i];

			// Get Post ID
			let postId = (await page.evaluate(link => link.href, linkHandle)).match(/\/p\/(.*)\/$/)[1];
			if(visited.includes(postId)) {
				console.log(`${i} | Already crawled postId ${postId}`);
				continue;
			}

			// Get thumbnail info
			let img = await linkHandle.$('img');
			let thumb = await page.evaluate(img => img.src.trim(), img);
			console.log(`${i} | Grabbing info for postId ${postId}`);

			// Open dialog that contains post details
			try {
				await linkHandle.click();
				await simulateUserHesitation();
			}
			catch(err) {
				console.log('Node probably was detached from document in the meantime');
				continue;
			}

			let hndDialog = await page.$('div[role="dialog"]');
			// Sometimes, the dialog simply won't open
			if(hndDialog === null) {
				console.log("Dialog didn't open");
				continue;
			}

			await waitUntilLoaded(hndDialog);
			let closeButton = await hndDialog.$(':scope > button');

			// Get created on timestamp
			let hndTime = await hndDialog.$('time');
			if(hndTime === null) {
				console.log("Could not get time stamp");
				await closeDialog(page, closeButton);
				continue;
			}

			let createdOn = await page.evaluate(async (time) => (
				(new Date(time.getAttribute('datetime'))).valueOf()
			), hndTime);

			// Have we reached the oldest post we want?
			if(createdOn <= until) {
				console.log(`Finished by reaching postId ${postId}, created on ${new Date(createdOn)}`);
				return {location, posts};
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
				console.log('This post contains no info');
				await closeDialog(page, closeButton);
				continue;
			}

			let itemText = await page.evaluate(async (item) => (
				item.innerText
			), hndItem);
			// No description by author, only comments
			if(!itemText.startsWith(username)) {
				console.log('No description by author available');
				await closeDialog(page, closeButton);
				continue;
			}

			let hashtags = itemText.match(/(#[^#|^\s]*)/g);
			if(hashtags === null) {
				console.log('No hash tags');
				await closeDialog(page, closeButton);
				continue;
			}


			await closeDialog(page, closeButton);
			await simulateUserHesitation();

			// Append collected data
			console.log('Appending', JSON.stringify({
				postId,
				thumb,
				createdOn,
				username,
			}, null, 2));
			posts.push({
				postId,
				thumb,
				createdOn,
				username,
			});

			hashtags.forEach(hashtag => {
				if(!location.hashtags.hasOwnProperty(hashtag)) {
					location.hashtags[hashtag] = [];
				}

				location.hashtags[hashtag].push(postId);
			});
		}

		await scrollDown(page, requests);
		numScrolls++;
	}

	await browser.close();
	return {location, posts};
};

module.exports = {crawlIG};
