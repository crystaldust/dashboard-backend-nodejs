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
    }).catch(error=>{
        console.log('Failed to check token limit')
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.log(error.response.data);
            console.log(error.response.status);
        } else {
            // Something happened in setting up the request that triggered an Error
            console.log('Error', error.message);
        }
    })
}

function getNumPullRequests(owner, repo) {
    // TODO No GitHub API provides directly the count of PRs,
    // The possibly best way is to try with a bi-split search method
    return 100
}

module.exports.getTokenLimit = getTokenLimit;