import * as React from 'react';
import gql from "graphql-tag";
import { Query } from "react-apollo";
import memo from 'memoize-one';
import debounce from 'lodash/debounce';

const DEBOUNCE = 100;

const HASHTAGS = gql`
{
  locations {
    lastCrawled
    locId
    locName
    hashtags {
      name
      numPosts
    }
  }
}
`;

export default class extends React.Component {
	state = {
		filter: '',
		renderFilter: '',
		threshold: 1,
	};

	changeFilter = (e) => {
		this.setState({
			filter: e.target.value
		});

		this.changeRenderFilter.cancel();
		this.changeRenderFilter(e.target.value);
	};

	changeRenderFilter = debounce((filter) => {
		this.setState({
			renderFilter: filter
		});
	}, 200);

	changeThreshold = (e) => {
		if(e.target.value.match(/^[0-9]*$/) !== null) {
			this.setState({
				threshold: e.target.value === "" ? 0 : parseInt(e.target.value)
			});
		}
	};

	renderList = memo((data, threshold, filter) => {
		console.log('processing...');
		console.log(data);
		let locationList = [];

		if(data.locations.length === 0)
			return "Data is being processed, please try again in a few hours.";

		data.locations.forEach(location => {
			locationList.push(
				<div key={location.locId}>
					<h3>{location.locName}</h3>
					{location
					.hashtags
					.filter(el => el.numPosts > threshold)
					.filter(el => filter === '' || el.name.indexOf(filter) >= 0)
					.sort((a, b) => b.numPosts - a.numPosts)
					.map(el => <div
						key={el.name}
						data-key={el.name}
						onClick={this.props.onClickHashtag}
						style={{cursor: "pointer"}}
					>{el.name} / {el.numPosts}</div>)
					}
				</div>
			)
		});

		return locationList;
	});
	// , (a, b) => {
	// 	console.log('is reference equal?');
	// 	console.log(a[0] === b[0]);
	// 	return a[1] === b[1] && a[2] === b[2]
	// });

	render() {
		//this.renderList.cancel();
		const {threshold, filter, renderFilter} = this.state;
		// console.log('showThumbsFor', showThumbsFor);
		return (
			<aside>
				Min posts: <input type="text" onChange={this.changeThreshold} value={threshold} size="3" />
				<br />
				Text filter: <input type="text" onChange={this.changeFilter} value={filter} size="8" />
				<br />
				<Query query={HASHTAGS}>
					{({ loading, error, data }) => {
						if (loading) return "Loading...";
						if (error) return `Error! ${error.message}`;

						// Since Apollo creates a new data object on EVERY render but
						// we need this to be fast, we need to cache the data ourselves.
						if(!this.hasOwnProperty('cachedData')) {
							this.cachedData = Object.assign({}, data);
						}

						return this.renderList(this.cachedData, threshold, renderFilter);
					}}
				</Query>
			</aside>
		)
	}
}
