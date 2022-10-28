const { default: axios } = require("axios");
const { rejects } = require("assert");

// TODO Use suitable auth method
const AIRFLOW_API_URL = process.env["AIRFLOW_API_URL"];
const AIRFLOW_USER = process.env["AIRFLOW_USER"];
const AIRFLOW_PASSWORD = process.env["AIRFLOW_PASSWORD"];

function runGitsDAG(owner, repo, url, now) {
    return axios.post(
        `${AIRFLOW_API_URL}/api/v1/dags/git_test_conf/dagRuns`,
        {
            dag_run_id: `git_init_v1_${owner}__${repo}__${now.toISOString()}`,
            conf: {
                url,
                owner,
                repo,
            },
        },
        {
            auth: {
                username: AIRFLOW_USER,
                password: AIRFLOW_PASSWORD,
            },
        }
    );
}

function runGithubCommitsDAG(owner, repo, url, now) {
    return axios.post(
        `${AIRFLOW_API_URL}/api/v1/dags/github_init_commits_v1/dagRuns`,
        {
            dag_run_id: `github_init_commits_v1_${owner}__${repo}__${now.toISOString()}`,
            conf: {
                url,
                owner,
                repo,
            },
        },
        {
            auth: {
                username: AIRFLOW_USER,
                password: AIRFLOW_PASSWORD,
            },
        }
    );
}

function runGithubIssuesDAG(owner, repo, url, now) {
    return axios.post(
        `${AIRFLOW_API_URL}/api/v1/dags/github_init_issues_v1/dagRuns`,
        {
            dag_run_id: `github_init_issues_v1_${owner}__${repo}__${now.toISOString()}`,
            conf: {
                url,
                owner,
                repo,
            },
        },
        {
            auth: {
                username: AIRFLOW_USER,
                password: AIRFLOW_PASSWORD,
            },
        }
    );
}

function runGithubIssuesDAG(owner, repo, url, now) {
    return axios.post(
        `${AIRFLOW_API_URL}/api/v1/dags/github_init_issues_v1/dagRuns`,
        {
            dag_run_id: `github_init_issues_v1_${owner}__${repo}__${now.toISOString()}`,
            conf: {
                url,
                owner,
                repo,
            },
        },
        {
            auth: {
                username: AIRFLOW_USER,
                password: AIRFLOW_PASSWORD,
            },
        }
    );
}

function runGithubIssuesCommentsDAG(owner, repo, url, now) {
    return axios.post(
        `${AIRFLOW_API_URL}/api/v1/dags/github_init_issues_comments_v1/dagRuns`,
        {
            dag_run_id: `github_init_issues_comments_v1_${owner}__${repo}__${now.toISOString()}`,
            conf: {
                url,
                owner,
                repo,
            },
        },
        {
            auth: {
                username: AIRFLOW_USER,
                password: AIRFLOW_PASSWORD,
            },
        }
    );
}

function runGithubIssuesTimelineDAG(owner, repo, url, now) {
    return axios.post(
        `${AIRFLOW_API_URL}/api/v1/dags/github_init_issues_timeline_v1/dagRuns`,
        {
            dag_run_id: `github_init_issues_timeline_v1_${owner}__${repo}__${now.toISOString()}`,
            conf: {
                url,
                owner,
                repo,
            },
        },
        {
            auth: {
                username: AIRFLOW_USER,
                password: AIRFLOW_PASSWORD,
            },
        }
    );
}

function runGithubPRsDAG(owner, repo, url, now) {
    return axios.post(
        `${AIRFLOW_API_URL}/api/v1/dags/github_init_pull_requests_v1/dagRuns`,
        {
            dag_run_id: `github_init_pull_requests_v1_${owner}__${repo}__${now.toISOString()}`,
            conf: {
                url,
                owner,
                repo,
            },
        },
        {
            auth: {
                username: AIRFLOW_USER,
                password: AIRFLOW_PASSWORD,
            },
        }
    );
}

function runTrackGitRepo(owner, repo, url, now) {
    return new Promise((resolve, reject) => {
        const dag_run_id = `git_track_repo_${owner}__${repo}__${now.toISOString()}`;
        axios
            .post(
                `${AIRFLOW_API_URL}/api/v1/dags/git_track_repo/dagRuns`,
                {
                    dag_run_id,
                    conf: {
                        url,
                        owner,
                        repo,
                        dag_run_id,
                    },
                },
                {
                    auth: {
                        username: AIRFLOW_USER,
                        password: AIRFLOW_PASSWORD,
                    },
                }
            )
            .then((result) => {
                result.dag_run_id = dag_run_id;
                resolve(result);
            })
            .catch((e) => {
                reject(e);
            });
    });
}

module.exports.runTrackGitRepo = runTrackGitRepo;
