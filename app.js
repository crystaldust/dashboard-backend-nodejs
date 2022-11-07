const ck = require("./ck");
const airflow = require("./airflow");
const auth = require("./auth");
const jobqueue = require('./jobqueue')
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const morgan = require("morgan");
const postgres = require("./postgres");
const TrackRepoError = require("./errors").TrackRepoError;

const IS_GIT_URL_REGEX =
    /(git@|http:\/\/|https:\/\/)[\w\.-:]+[\/:]{1}[~\w-]+\/{1}[~\w-]+(.git){0,1}$/
const LISTEN_PORT = process.env["PORT"];
const CK_HOST = process.env["CK_HOST"];
const CK_PORT = process.env["CK_PORT"];
const CK_USER = process.env["CK_USER"];
const CK_PASS = process.env["CK_PASS"];
console.log('connecting ck to ', CK_HOST)

const app = express();

const ckClient = new ck.CKClient(CK_HOST, CK_PORT, CK_USER, CK_PASS);
const STATUS_QUEUED = 0;
const STATUS_STARTED = 1;
const STATUS_SUCCESS = 2;
const STATUS_FAILED = 3;


postgres.init().then(() => {
    jobqueue.launch();
})


const allowedOrigins = [];
const ALLOWED_ORIGINS = process.env["ALLOWED_ORIGINS"];
if (ALLOWED_ORIGINS) {
    allowedOrigins.concat(ALLOWED_ORIGINS.split(","));
    console.log("ALLOWED ORIGINS:", allowedOrigins);
    // TODO Configure the origins
}

ckClient.execute_with_options(
    "SELECT DISTINCT(search_key__owner, search_key__repo) FROM gits",
    {},
    (rows, cols) => {
        rows.forEach((row) => {
            const owner = row[0][0];
            const repo = row[0][0];
        });
    }
);

app.use(bodyParser.text());
app.use(bodyParser.json());
app.use(cors());
app.use(morgan("combined"));

app.post("/sql/transfer", (req, res) => {
    if (!!req.body == false || typeof req.body != "string") {
        res.status(400);
        res.send({
            message: "Invalid SQL",
        });
        return;
    }

    const sqlOptions = {format: "JSONCompact"};
    if (req.header("jsonObjects") === "true") {
        sqlOptions.format = "JSON";
    }

    ckClient.execute_with_options(req.body, sqlOptions, (rows, cols, err) => {
        if (err) {
            console.error(err);
            res.status(500);
            return res.send("Internal Server Error");
        }

        if (sqlOptions.format === "JSON") {
            return res.send([rows, cols]);
        }

        // TODO Let clickhouse engine parse the data with correct type
        // According to ClickHouse input / output format doc:
        // https://clickhouse.com/docs/en/interfaces/formats/#jsoncompact
        // Some output format should automatically parse value with type
        // But even the propery output format is set, the Int value is still a string
        // The python client automatically parses the data, check if it's done in the py code or by db
        const columns = cols.map((col, colIndex) => {
            if (ck.isIntType(col.type)) {
                rows.forEach((row) => {
                    row[colIndex] = parseInt(row[colIndex]);
                });
            } else if (ck.isFloatType(col.type)) {
                rows.forEach((row) => {
                    row[colIndex] = parseFloat(row[colIndex]);
                });
            }
            return [col.name, col.type];
        });
        res.send([rows, columns]);
    });
});
app.post("/login/account", (req, res) => {
    if (req.body.username == "admin" && req.body.password == "admin") {
        res.status(200);
        return res.send({
            status: "ok",
            type: req.body.type,
            currentAuthority: "admin",
        });
    }
    res.status(400);
    return res.send();
});
app.get("/currentUser", (req, res) => {
    res.send(auth.ADMIN_USER);
});
app.post("/repository", (req, res) => {
    const repoUrl = req.body.url;
    if (!repoUrl || !IS_GIT_URL_REGEX.test(repoUrl)) {
        res.status(400);
        return res.send("");
    }

    const parts = repoUrl.replace(/.git$/, "").split("/").slice(-2);
    const owner = parts[0];
    const repo = parts[1];

    postgres
        .getLastTriggeredRepo(owner, repo)
        .then((pgResult) => {
            console.log("finding ", owner, repo, pgResult.rows);

            const lastTriggeredJob = pgResult.rows.length > 0 ? pgResult.rows[0] : null

            if (lastTriggeredJob && lastTriggeredJob.job_status != 'failed'/*postgres.isRepoJobSuccessful(result.rows[0])*/) {
                throw new TrackRepoError(
                    `${owner}/${repo} already initialized/done, status:${pgResult.rows[0].job_status}`,
                    409
                );
            }

            // Check conditions, if pass, inherits states, mark job_status as 'started'(failed state =>1 as started), then trigger the DAG
            // if not passed, also inherits states, mark job_status as 'queueed'(failed state =>0 as created/queued). then do nothing(waiting for
            // the polling to monitor and trigger the DAGs someday)
            return jobqueue.checkConditions([[]], [jobqueue.checkStartedJobs]).then(passed => {
                return {
                    conditionsSatisfied: passed,
                    lastTriggeredJob,
                }
            })
        })
        .then(results => {
            const {conditionsSatisfied, lastTriggeredJob} = results;
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
            let lastJobStatuses = STATUS_KEYS.map(() => 0)
            let jobStatus = conditionsSatisfied ? 'started' : 'queued';
            const dagRunId = `git_track_repo_${owner}__${repo}__${new Date().toISOString()}`;



            if (lastTriggeredJob) {
                lastJobStatuses = STATUS_KEYS.map(key => {
                    return lastTriggeredJob[key] === STATUS_SUCCESS
                        ? STATUS_SUCCESS
                        : (conditionsSatisfied ? STATUS_STARTED : STATUS_QUEUED);
                })
            }

            const promises = [
                postgres.insertTriggeredRepo(
                    "git_track_repo",
                    dagRunId,
                    owner,
                    repo,
                    repoUrl,
                    lastJobStatuses,
                    jobStatus)
            ];

            if (conditionsSatisfied) {
                promises.push(
                    airflow.runTrackGitRepo(owner, repo, repoUrl, dagRunId)
                )
            }

            return Promise.all(promises);
        })
        .then((results) => {
            // TODO Instead of just logging, maybe we should also change status_code by results
            console.log(results);
            res.status(200);
            return res.send();
        })
        .catch((e) => {
            console.log(`Failed to track git repo: ${e}`);
            if (e.response) {
                console.log(e.response.data);
            }
            if (e.code) {
                res.status(e.code);
            } else {
                res.status(500);
            }
            return res.send();
        });
});
app.get("/repositories", (req, res) => {
    postgres
        .getTriggeredRepos()
        .then((result) => {
            const returnData = result.rows.map((item) => {
                const parsedItem = {};
                [
                    "owner",
                    "repo",
                    "url",
                    "job_status",
                    "gits_status",
                    "github_commits_status",
                    "github_pull_requests_status",
                    "github_issues_status",
                    "github_issues_comments_status",
                    "github_issues_timeline_status",
                    "ck_transfer_status",
                    "ck_aggregation_status",
                ].forEach((key) => {
                    parsedItem[key] = item[key];
                });
                return parsedItem;
            });
            return res.send(returnData);
        })
        .catch((e) => {
            console.log(e);
            res.status(500);
            return res.send("");
        });
});

app.listen(LISTEN_PORT, () => {
    console.log(`Dashboard backend app listening on port ${LISTEN_PORT}`);
});
