import * as React from 'react';
import {query} from '../lib/graphql';

const THUMBS = `
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

export default class extends React.Component {
	state = {

	};

	componentDidMount() {
		query(THUMBS)
		.then(response => response.json())
		.then(result => this.setState({data: result.data}))
		.catch(error => this.setState({error}));
	}

	renderPosts = (data) => {
		const {hashtag} = this.props;

		if(hashtag === '' || typeof hashtag === 'undefined')
			return null;

		let posts = data.locations[0].hashtags.filter(el => el.name === hashtag)[0].posts;

		let thumbs = [];
		posts.forEach(post => {
			thumbs.push(
				<div key={post.postId} className="thumbnail_container">
					<a target="_blank" rel="noopener noreferrer" href={'https://www.instagram.com/p/' + post.postId}>
						<img
							alt={post.postId}
							src={post.thumb}
							className="thumbnail"
						/>
					</a>
				</div>
			)
		});

		return thumbs;
	};

	render() {
		const {data, error} = this.state;
		return (
			<main>
				{error
					? error
					: data
						? this.renderPosts(data)
						: "Loading..."
				}
			</main>
		);
	}
}
