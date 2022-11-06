const MAX_JOBS_THRESHOLD = 1;
const MONITOR_INTERVAL = 60 * 5;


const postgres = require('./postgres')
const airflow = require("./airflow");

let interval = null;


function checkTokens(owner, repo, githubTokens) {
    // TODO Check {owner}/{repo}'s commits, PR, issuse numbers and tokens' remaining times
    // Then decide if we should wait or start the job
    return true
}

function checkStartedJobs() {
    // TODO Check if num of started jobs is less than the threshold
    return postgres.client.query("SELECT count(*) from triggered_git_repos WHERE job_status='started'")
        .then(result => {
            let numStartedJobs = 0
            if (result && result.length) {
                numStartedJobs = result[0].count
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
        for (let i = 0; i < results.length; ++i) {
            if (results[i] == false) {
                return false;
            }
        }
        return true;
    })
}


function check() {
    checkConditions([[]], [checkStartedJobs]).then(conditionsPassed => {
        if (conditionsPassed) {
            return postgres.client.query(`SELECT owner, repo, url FROM triggered_git_repos WHERE job_status='queued' ORDER BY created_at DESC LIMIT 1`).then(result => {
                if (result.rows.length) {
                    const row = result.rows[0]
                    const {owner, repo, url: repoUrl, dag_run_id: dagRunId} = row;
                    return airflow.runTrackGitRepo(owner, repo, repoUrl, dagRunId).then(dagResult => {
                        const {owner, repo, dag_run_id: dagRunId} = dagResult.data.conf;
                        // TODO Maybe we should generate a place holder uuid for the dag_run_id field?
                        return postgres.client.query(`
                                    update triggered_git_repos
                                    set dag_run_id = '${dagRunId}',
                                        job_status='started'
                                    where owner = '${owner}'
                                      and repo = '${repo}'
                                      and dag_run_id = ''
                                    `)
                    })
                }
            })
        }
    }).catch(e => {
        console.log(e)
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
