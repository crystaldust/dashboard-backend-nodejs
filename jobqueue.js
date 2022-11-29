const MAX_JOBS_THRESHOLD = process.env["MAX_JOBS"] || 5
const MONITOR_INTERVAL = 1000 * 60 * 0.5;
const MIN_TOKEN_RATE_REMAINING = process.env["MIN_TOKEN_RATE_LIMIT"] || 25000

console.log('MAX_JOBS:', MAX_JOBS_THRESHOLD)
console.log('MIN_TOKEN_RATE_REMAINGING', MIN_TOKEN_RATE_REMAINING)


const postgres = require('./postgres')
const airflow = require("./airflow");
const github = require('./github')

let interval = null;


function checkTokens() {
    // TODO Check {owner}/{repo}'s commits, PR, issuse numbers and tokens' remaining times
    // Then decide if we should wait or start the job
    return airflow.getVariable('github_tokens').then(tokensStrVal => {
        const tokens = JSON.parse(tokensStrVal)
        const checkPromises = tokens.map(token => github.getTokenRemaining(token))
        return Promise.all(checkPromises).then(rates => {
            let totalRemaining = 0
            console.debug(JSON.stringify(rates, null, 2))
            rates.map(rate => totalRemaining += (rate && rate.remaining) || 0)
            console.debug(totalRemaining)
            return totalRemaining >= MIN_TOKEN_RATE_REMAINING
        }).catch(e => {
            console.log('Failed to get token limits:', e)
            return false
        })
    })
}

function checkStartedJobs() {
    // TODO Check if num of started jobs is less than the threshold
    return postgres.client.query("SELECT count(*) from triggered_git_repos WHERE job_status='started'")
        .then(result => {
            let numStartedJobs = 0
            if (result && result.rows.length) {
                numStartedJobs = parseInt(result.rows[0].count)
            }
            return numStartedJobs < MAX_JOBS_THRESHOLD
        })
}

function checkConditions(paramLists, checkers) {
    if (paramLists.length != checkers.length) {
        throw(new Error('Params and checkers not match'))
    }
    const conditionChain = paramLists.map((paramList, index) => {
        const checker = checkers[index]
        return checker(...paramList)
    })

    return Promise.all(conditionChain).then(results => {
        console.log('check conditions:', results, paramLists, checkers)
        for (let i = 0; i < results.length; ++i) {
            if (results[i] == false) {
                return false;
            }
        }
        return true;
    })
}


function check() {
    checkConditions([[], []], [checkStartedJobs, checkTokens]).then(conditionsPassed => {
        if (conditionsPassed) {
            const STATUS_KEYS = [
                "gits_status",
                "github_commits_status",
                "github_pull_requests_status",
                "github_issues_status",
                "github_issues_comments_status",
                "github_issues_timeline_status",
                "ck_transfer_status",
                "ck_aggregation_status",
            ]
            const selectedField = ['owner', 'repo', 'url', 'dag_run_id'].concat(STATUS_KEYS)
            const pickQueueJobSql = `SELECT ${selectedField.join(', ')} FROM triggered_git_repos
                                                WHERE job_status='queued' ORDER BY created_at DESC LIMIT 1`;
            return postgres.client.query(pickQueueJobSql).then(result => {
                if (result.rows.length) {
                    const row = result.rows[0]
                    const {owner, repo, url: repoUrl, dag_run_id: dagRunId} = row;
                    // It's better to update the 'queued' statuses to 'started'
                    // TODO What about the failed jobs? should they be restarted by this code?
                    let sql = `update triggered_git_repos
                        set job_status='started'
                        `

                    // or == 0, since it's queued?
                    const updatedStatuses = STATUS_KEYS.filter(key => row[key] != 2).map(key => `${key} = 1`)
                    if (updatedStatuses.length) {
                        sql += ',\n' + updatedStatuses.join(',\n')
                    }

                    sql += `
                    where owner = '${owner}'
                        and repo = '${repo}'
                        and dag_run_id = '${dagRunId}'
                    `
                    console.log(`update ${owner}/${repo} ${dagRunId}, set ${updatedStatuses}`)
                    return postgres.client.query(sql).then(() => {
                        return airflow.runTrackGitRepo(owner, repo, repoUrl, dagRunId)
                    })

                    // return airflow.runTrackGitRepo(owner, repo, repoUrl, dagRunId).then(dagResult => {
                    //     const {owner, repo, dag_run_id: dagRunId} = dagResult.data.conf;
                    //     // TODO Maybe we should generate a place holder uuid for the dag_run_id field?
                    //     return postgres.client.query(`
                    //                 update triggered_git_repos
                    //                 set dag_run_id = '${dagRunId}',
                    //                     job_status='started'
                    //                 where owner = '${owner}'
                    //                   and repo = '${repo}'
                    //                   and dag_run_id = ''
                    //                 `)
                    // })
                }
            })
        }
    }).then(result=>{
        console.log(result)
    }).catch(e => {
        console.log(e.message)
    })

    // postgres.client.query("SELECT count(*) from triggered_git_repos WHERE job_status='started'").then(result => {
    //     let numStartedJobs = 0
    //     if (result && result.length) {
    //         numStartedJobs = result[0].count
    //     }
    //     return numStartedJobs
    // }).then(numStartedJobs => {
    //     if (numStartedJobs <= MAX_JOBS_THRESHOLD) {
    //         // fetch a job info from postgres and trigger an airflow DAG
    //         const numJobs = MAX_JOBS_THRESHOLD - numStartedJobs
    //         return postgres.client.query(`SELECT owner, repo, url FROM triggered_git_repos WHERE job_status='queued' ORDER BY created_at DESC LIMIT ${numJobs}`).then(result => {
    //             return result.rows
    //         })
    //     } else {
    //         return []
    //     }
    // }).then(rows => {
    //     const dagPromises = rows.map(row => {
    //         const {owner, repo, url: repoUrl} = row;
    //         const now = new Date();
    //         return airflow.runTrackGitRepo(owner, repo, repoUrl, now)
    //     })
    //     return Promise.all(dagPromises)
    // }).then(dagResults => {
    //     dagResults.forEach(dagResult => {
    //         const {status} = dagResult
    //         if (status >= 200 && status <= 299) {
    //             const {owner, repo, dag_run_id: dagRunId} = dagResult.data.conf;
    //             // TODO Maybe we should generate a place holder uuid for the dag_run_id field?
    //             postgres.client.query(`
    //                 update triggered_git_repos
    //                 set dag_run_id = '${dagRunId}',
    //                     job_status='started'
    //                 where owner = '${owner}'
    //                   and repo = '${repo}'
    //                   and dag_run_id = ''
    //                 `)
    //         }
    //     })
    // }).catch(e => {
    //     console.log('Failed to start new job', e)
    // })
}

function launch() {
    interval = setInterval(check, MONITOR_INTERVAL)
}

function stop() {
    if (interval) {
        clearInterval(interval)
    }
}

module.exports.launch = launch;
module.exports.checkConditions = checkConditions;
module.exports.checkStartedJobs = checkStartedJobs;
module.exports.MAX_JOBS_THRESHOLD = MAX_JOBS_THRESHOLD;
