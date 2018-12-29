import * as React from 'react';
import gql from "graphql-tag";
import { Query } from "react-apollo";

const THUMBS = gql`
{
  locations {
    locId
    hashtags {
      name
      posts {
        postId
        createdOn
        username
        thumb
      }
    }
  }
}
`;

export default ({hashtag}) => (
	<main>
		<Query query={THUMBS}>
			{({ loading, error, data }) => {
				if (loading) return "Loading...";
				if (error) return `Error! ${error.message}`;
				if(hashtag === '' || typeof hashtag === 'undefined')
					return null;

				let posts = data.locations[0].hashtags.filter(el => el.name === hashtag)[0].posts;

				let thumbs = [];
				posts.forEach(post => {
					thumbs.push(
						<div key={post.postId} className="thumbnail_container">
							<a target="_blank" href={'https://www.instagram.com/p/' + post.postId}>
								<img
									alt={post.postId}
									src={post.thumb}
									className="thumbnail"
								/>
							</a>
						</div>
					)
				});

				return (
					<div>{thumbs}</div>
				);
			}}
		</Query>
	</main>
);
