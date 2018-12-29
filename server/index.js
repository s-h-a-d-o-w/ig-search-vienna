// First time GraphQL, done in ~20 hours

const express = require('express');
const cors = require('cors');
const {merge} = require('lodash');
const path = require('path');
const { ApolloServer, gql } = require('apollo-server-express');
const { GraphQLScalarType } = require('graphql');
const { Kind } = require('graphql/language');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const {crawlIG} = require('./crawler');

const isDev = process.env.NODE_ENV !== 'production';

const adapter = new FileSync(path.join(__dirname, '../db.json'));
const db = low(adapter);
db.defaults({ locations: [], posts: [] }).write();
db.read();

let locations = db.get('locations').value();
// hashtag shape:
// {key: [postid1, postid2, ...]}
// let hashtags = db.get('hashtags').value();
let posts = db.get('posts').value();

// Type definitions define the "shape" of your data and specify
// which ways the data can be fetched from the GraphQL server.
const typeDefs = gql`
  scalar Date

	type Location {
		locId: String
		locName: String
		hashtags: [Hashtag]
		lastCrawled: Date
		url: String
	}
	
	type Hashtag {
		name: String
		postIds: [String]
		posts: [Post]
		numPosts: Int
	}
	
	type Post {
		postId: String
		createdOn: Date
		username: String
		thumb: String
	}
  
  # The "Query" type is the root of all GraphQL queries.
  # (A "Mutation" type will be covered later on.)
  type Query {
    locations(locId: String): [Location]
  }
`;

// Resolvers define the technique for fetching the types in the
// schema.  We'll retrieve books from the "books" array above.
const resolvers = {
	Hashtag: {
		numPosts: (parent) => parent.postIds.length,
		posts: (parent) => posts.filter(post => parent.postIds.includes(post.postId)),
	},
	Location: {
		// hashtags: (parent) => locations.find(location => location.locId === parent.locId).hashtags,
		hashtags: (parent) => {
			let hashtags = locations.find(location => location.locId === parent.locId).hashtags;

			let retval = [];
			Object.keys(hashtags).forEach(hashtag => {
				retval.push({
					name: hashtag,
					postIds: hashtags[hashtag],
				})
			});

			return retval;
		}
	},
	Query: {
		locations: (parent, args, context, info) => args.locId
			? locations.filter(el => el.locId === args.locId)
			: locations,
	},
	Date: new GraphQLScalarType({
		name: 'Date',
		description: 'Date custom scalar type',
		parseValue(value) {
			return new Date(value).valueOf(); // value from the client
		},
		serialize(value) {
			return value; // value sent to the client
		},
		parseLiteral(ast) {
			return ast.value;
		},
	}),
};

let crawlers = [];
locations.forEach((location) => crawlers.push(crawlIG(
	location.url,
	// For dev: Use Date.now() to not grab any new data
	// location.lastCrawled,
	Date.now(),
)));

if(crawlers.length === 0) {
	console.log('Starting fresh');
	crawlers.push(crawlIG(
		'https://www.instagram.com/explore/locations/63134088/vienna-austria/',
		new Date('2017-01-01').valueOf()
	));
}

Promise.all(crawlers).then((results) => {
	results.forEach((result) => {
		// let currLocation = locations.find(el => el.locId === result.location.locId);
		// if(typeof currLocation === 'undefined') {
		// 	locations.push(result.location);
		// 	currLocation = result.location;
		// }

		merge(locations, [result.location]);
		merge(posts, result.posts);
	});

	db.set('locations', locations).write();
	// db.set('hashtags', hashtags).write();
	db.set('posts', posts).write();

	const server = new ApolloServer({ typeDefs, resolvers });
	const app = express();

	if(isDev) {
		// webpack dev server runs on a separate port in dev ...
		app.use(cors());
	}
	else {
		// ... but use bundle in production
		app.use(express.static('../build'));
	}

	server.applyMiddleware({app});

	app.listen(4000, () => {
		console.log(`🚀  Server ready.`);
	});
});

// const crawlOrNot = async() => {
// 	if(locations.length === 0) {
// 		return crawlIG(
// 			'https://www.instagram.com/explore/locations/63134088/vienna-austria/',
// 			new Date('2017-01-01').valueOf()
// 		)
// 		.then((result) => {
// 			locations.push(result.location);
// 			hashtags = result.hashtags;
// 			posts = result.posts;
//
// 			db.set('locations', locations).write();
// 			db.set('hashtags', hashtags).write();
// 			db.set('posts', posts).write();
// 		})
// 	}
//
// 	return Promise.resolve();
// };
//
// crawlOrNot()
// .then(() => {
// 	// In the most basic sense, the ApolloServer can be started
// 	// by passing type definitions (typeDefs) and the resolvers
// 	// responsible for fetching the data for those types.
// 	const server = new ApolloServer({ typeDefs, resolvers });
//
// 	server.listen().then(({ url }) => {
// 		console.log(`🚀  Server ready at ${url}`);
// 	});
// });
