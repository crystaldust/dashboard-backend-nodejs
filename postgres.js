const {Client} = require("pg");

const pgClient = new Client();
pgClient.connect();

function init() {
    pgClient
        .query(
            `
create table if not exists triggered_git_repos
(
    created_at                          timestamp,
    dag_id                             text,
    dag_run_id                         text,
    owner                              text,
    repo                               text,
    url                                text,
    job_status                         varchar(10),
    gits_status                        smallint,
    github_commits_status              smallint,
    github_pull_requests_status        smallint,
    github_issues_status               smallint,
    github_issues_comments_status      smallint,
    github_issues_timeline_status      smallint,
        ck_transfer_status              smallint,
        ck_aggregation_status           smallint,

    gits_fail_reason                   text,
    github_commits_fail_reason         text,
    github_pull_requests_fail_reason   text,
    github_issues_fail_reason          text,
    github_issues_comments_fail_reason text,
    github_issues_timeline_fail_reason text,
    ck_transfer_fail_reason text,
    ck_aggregation_fail_reason text
);`
        )
        .then((result) => {
            console.log("PG TABLE airflow CREATED");
        })
        .catch((e) => {
            console.log(e);
        });
}

function insertTriggeredRepo(dagId, dagRunId, owner, repo, url, statuses = null) {
    const values = [
        new Date(),
        dagId,
        dagRunId,
        owner,
        repo,
        url,
        "started"
    ];

    if (statuses) {
        values.push(...statuses)
    } else {
        values.push(...[0, 0, 0, 0, 0, 0, 0, 0])
    }

    const sql =
        "insert into triggered_git_repos values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)";

    return pgClient.query(sql, values);
}

function getTriggeredRepos() {
    // let sql = "select * from triggered_git_repos";
    let sql = "select origin.owner,\n" +
        "       origin.repo,\n" +
        "       origin.url,\n" +
        "       origin.created_at,\n" +
        "       origin.job_status,\n" +
        "       origin.job_status,\n" +
        "       origin.gits_status,\n" +
        "       origin.github_commits_status,\n" +
        "       origin.github_pull_requests_status,\n" +
        "       origin.github_issues_status,\n" +
        "       origin.github_issues_comments_status,\n" +
        "       origin.github_issues_timeline_status,\n" +
        "       origin.ck_transfer_status,\n" +
        "       origin.ck_aggregation_status\n" +
        "from triggered_git_repos origin\n" +
        "         join\n" +
        "     (select owner, repo, max(created_at) as latest_created_at from triggered_git_repos group by (owner, repo)) temp\n" +
        "     on origin.created_at = temp.latest_created_at\n" +
        "         and origin.owner = temp.owner\n" +
        "         and origin.repo = temp.repo\n" +
        "         and origin.job_status != 'success'"

    return pgClient.query(sql);
}

function getLastTriggeredRepo(owner, repo) {
    return pgClient.query(
        `select * from triggered_git_repos where owner='${owner}' and repo='${repo}' order by created_at desc limit 1`
    );
}

const RES_TYPES = ["gits", "github_commits", "github_pull_requests", "github_issues",
    "github_issues_comments", "github_issues_timeline", "ck_transfer", "ck_aggregation"]

function isRepoJobSuccessful(job) {
    for (let i = 0; i < RES_TYPES.length; ++i) {
        const resType = RES_TYPES[i]
        if (`${resType}_status` != 2) {
            return false
        }
    }
    return true
}

module.exports.init = init;
module.exports.insertTriggeredRepo = insertTriggeredRepo;
module.exports.getTriggeredRepos = getTriggeredRepos;
module.exports.getLastTriggeredRepo = getLastTriggeredRepo;
module.exports.isRepoJobSuccessful = isRepoJobSuccessful;
