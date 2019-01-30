import * as React from 'react';
import memo from 'memoize-one';
import debounce from 'lodash/debounce';
import {query} from '../lib/graphql';

const DEBOUNCE = 200;
const HASHTAGS = `
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

class Hashtags extends React.Component {
	state = {
		filter: '',
		renderFilter: '',
		threshold: 2,
	};

	changeFilter = (e) => {
		this.setState({
			filter: e.target.value,
		});

		this.changeRenderFilter.cancel();
		this.changeRenderFilter(e.target.value);
	};
	changeRenderFilter = debounce((filter) => {
		this.setState({
			renderFilter: filter,
		});
	}, DEBOUNCE);

	changeThreshold = (e) => {
		if (e.target.value.match(/^[0-9]*$/) !== null) {
			this.setState({
				threshold: e.target.value === '' ? 0 : parseInt(e.target.value),
			});
		}
	};

	componentDidMount() {
		query(HASHTAGS)
			.then((response) => response.json())
			.then((result) => this.setState({data: result.data}))
			.catch((error) => this.setState({error}));
	}

	renderList = memo((data, threshold, filter) => {
		let locationList = [];

		if (data.locations.length === 0)
			return 'Data is being processed, please try again in a few hours.';

		data.locations.forEach((location) => {
			locationList.push(
				<div key={location.locId}>
					<h3>{location.locName}</h3>
					{location.hashtags
						.filter((el) => el.numPosts >= threshold)
						.filter((el) => filter === '' || el.name.indexOf(filter) >= 0)
						.sort((a, b) => b.numPosts - a.numPosts)
						.map((el) => (
							<div
								key={el.name}
								data-key={el.name}
								onClick={this.props.onClickHashtag}
								style={{cursor: 'pointer'}}
							>
								{el.name} / {el.numPosts}
							</div>
						))}
				</div>
			);
		});

		return locationList;
	});

	render() {
		const {data, error, threshold, filter, renderFilter} = this.state;
		return (
			<aside>
				Min posts:{' '}
				<input
					type="text"
					onChange={this.changeThreshold}
					value={threshold}
					size="3"
				/>
				<br />
				Text filter:{' '}
				<input
					type="text"
					onChange={this.changeFilter}
					value={filter}
					size="8"
				/>
				<br />
				{error
					? error
					: data
					? this.renderList(data, threshold, renderFilter)
					: 'Loading...'}
			</aside>
		);
	}
}

export default Hashtags;
