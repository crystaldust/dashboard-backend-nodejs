const {Client} = require("pg");

const pgClient = new Client();
pgClient.connect();

function init() {
    pgClient
        .query(
            `
create table if not exists triggered_git_repos
(
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

function insertTriggeredRepo(dagId, dagRunId, owner, repo, url) {
    const values = [
        dagId,
        dagRunId,
        owner,
        repo,
        url,
        "started",
        0,
        0,
        0,
        0,
        0,
        0,
    ];
    const sql =
        "insert into triggered_git_repos values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)";

    return pgClient.query(sql, values);
}

function getTriggeredRepos(downloading = false) {
    let sql = "select * from triggered_git_repos";
    if (downloading) {
        sql += " where job_status = 'started'";
    }
    return pgClient.query(sql);
}

function getTriggeredRepo(owner, repo) {
    return pgClient.query(
        `select * from triggered_git_repos where owner='${owner}' and repo='${repo}'`
    );
}

module.exports.init = init;
module.exports.insertTriggeredRepo = insertTriggeredRepo;
module.exports.getTriggeredRepos = getTriggeredRepos;
module.exports.getTriggeredRepo = getTriggeredRepo;
