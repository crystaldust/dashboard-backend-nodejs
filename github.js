const {default: axios} = require("axios");

function getTokenLimit(token) {
    // http://api.github.com/rate_limit
    return axios.get(
        'http://api.github.com/rate_limit',
        {
            headers: {
                'Authorization': `token ${token}`
            },
        },
    ).then(result => {
        return result.data.rate
    })
}

function getNumPullRequests(owner, repo) {
    // TODO No GitHub API provides directly the count of PRs,
    // The possibly best way is to try with a bi-split search method
    return 100
}

module.exports.getTokenLimit = getTokenLimit;