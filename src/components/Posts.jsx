import * as React from 'react';
import {query} from '../lib/graphql';

const generateHashtagQuery = ((strings) => {
	return (...values) => {
		return strings[0] + values[0] + strings[1];
	}
})`
{
  locations {
    locId
    hashtags(name: "${0}") {
      name
      posts {
        postId
        thumb
        createdOn
      }
    }
  }
}
`;

export default class extends React.Component {
	state = {
		isFetching: false
	};

	componentDidUpdate(prevProps) {
		if(this.props.hashtag !== prevProps.hashtag) {
			this.setState({
				isFetching: true,
				hashtag: undefined,
				data: undefined
			});

			query(generateHashtagQuery(this.props.hashtag))
			.then(response => response.json())
			.then(result => this.setState({
				isFetching: false,
				hashtag: this.props.hashtag,
				data: result.data
			}))
			.catch(error => this.setState({
				isFetching: false,
				error
			}));
		}
	}

	renderPosts = () => {
		const {data, hashtag} = this.state;
		if(!data || !hashtag)
			return null;

		let thumbs = [];
		data
			.locations[0]
			.hashtags
			.find(el => el.name === hashtag)
			.posts
			.sort((a, b) => b.createdOn - a.createdOn) // Newest first
			.forEach(post => {
				thumbs.push(
					<a key={post.postId}
					   target="_blank"
					   rel="noopener noreferrer"
					   href={'https://www.instagram.com/p/' + post.postId}
					>
						<img
							alt={post.postId}
							src={post.thumb}
							className="thumbnail"
						/>
					</a>
				)
			});

		return thumbs;
	};

	render() {
		const {error, isFetching} = this.state;
		return (
			<main>
				{error
					? error
					: isFetching
						? "Loading..."
						: this.renderPosts()
				}
			</main>
		);
	}
}
