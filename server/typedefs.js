const {gql} = require('apollo-server-express');

module.exports = gql`
  scalar Date

	type Location {
		locId: String
		locName: String
		hashtags(name: String): [Hashtag]
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
