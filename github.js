const {default: axios} = require("axios");
const cheerio = require('cheerio')

const _GITHUB_REQ_PROXY_STR = process.env["GITHUB_REQ_PROXY"] || ''
let GITHUB_REQ_CONFIGS = {};

if (_GITHUB_REQ_PROXY_STR) {
    const u = new URL(_GITHUB_REQ_PROXY_STR)
    GITHUB_REQ_CONFIGS = {
        proxy: {
            protocol: u.protocol.replace(':', ''),
            host: u.hostname,
            port: u.port,
        }
    }
}


function getTokenRemaining(token) {
    // http://api.github.com/rate_limit
    const reqConfigs = Object.assign({
        headers: {
            'Authorization': `token ${token}`
        },
    }, GITHUB_REQ_CONFIGS);

    return axios.get(
        'https://api.github.com/rate_limit',
        reqConfigs
    ).then(result => {
        return result.data.rate
    }).catch(error => {
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


function getNumCommits(owner, repo) {
    const reqUrl = `https://github.com/${owner}/${repo}`
    return axios.get(reqUrl, GITHUB_REQ_CONFIGS).then(res => {
        const $ = cheerio.load(res.data)
        const commitHistorySvg = $('.octicon.octicon-history')
        const numCommitsStr = commitHistorySvg.next().find('strong').html().replace(',', '')
        const numCommits = parseInt(numCommitsStr)
        return numCommits
    })
}

// issueType should be one of:
// - issue: A github issue
// - pr: A github pull request, which is defined as a kind of 'issue' by github backend service
function getGitHubIssueNum(owner, repo, issueType = 'issue') {

    const reqUrl = `https://github.com/${owner}/${repo.replace('incubator-', '')}/${issueType == 'issue' ? 'issues' : 'pulls'}`
    if (repo=='incubator-mxnet') {
        console.log('debug it')
        console.log(reqUrl)
        console.log(GITHUB_REQ_CONFIGS)
    }
    return axios.get(reqUrl, GITHUB_REQ_CONFIGS).then(res => {
        const $ = cheerio.load(res.data)
        const closedIssuesHref = $(`[data-ga-click='${issueType == 'issue' ? 'Issues' : 'Pull Requests'}, Table state, Closed']`)
        const closedIssuesStr = closedIssuesHref[1].children[2].data
        const numClosedIssues = parseInt(closedIssuesStr.trim().replaceAll(',', ''))

        const openIssuesHref = $(`[data-ga-click='${issueType == 'issue' ? 'Issues' : 'Pull Requests'}, Table state, Open']`)
        const openIssuesStr = openIssuesHref[1].children[2].data
        const numOpenIssues = parseInt(openIssuesStr.trim().replaceAll(',', ''))

        return {
            'open': numOpenIssues,
            'closed': numClosedIssues
        }
    })
}

function getIssuePRNums(owner, repo) {
    return Promise.all([getGitHubIssueNum(owner, repo, 'issue'),
        getGitHubIssueNum(owner, repo, 'pr')])
        .then(results => {
            const numIssues = results[0]
            const numPRs = results[1]

            return {
                issues: numIssues,
                prs: numPRs
            }
        })
}

// Get the plain num of open and closed issues
// This function provides the same return value specs with getNumCommits for a unified outside call
function getNumIssues(owner, repo) {
    return getGitHubIssueNum(owner, repo, 'issue').then(result => {
        return result.open + result.closed
    })
}

// Get the plain num of open and closed PRs
// This function provides the same return value specs with getNumCommits for a unified outside call
function getNumPRs(owner, repo) {
    return getGitHubIssueNum(owner, repo, 'pr').then(result => {
        return result.open + result.closed
    })
}

module.exports.getTokenRemaining = getTokenRemaining;
module.exports.getIssuePRNums = getIssuePRNums;
module.exports.getNumPRs = getNumPRs;
module.exports.getNumIssues = getNumIssues;
module.exports.getNumCommits = getNumCommits;
