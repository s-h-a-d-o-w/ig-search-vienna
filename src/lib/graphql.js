function query(queryString) {
	return fetch(`${process.env.REACT_APP_BACKEND}/graphql`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({query: queryString}),
	})
}

export {query}
