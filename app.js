const ck = require("./ck");
const auth = require("./auth");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const morgan = require("morgan");

const LISTEN_PORT = process.env["PORT"];
const CK_HOST = process.env["CK_HOST"];
const CK_PORT = process.env["CK_PORT"];
const CK_USER = process.env["CK_USER"];
const CK_PASS = process.env["CK_PASS"];

const app = express();

const ckClient = new ck.CKClient(CK_HOST, CK_PORT, CK_USER, CK_PASS);

const allowedOrigins = [];
const ALLOWED_ORIGINS = process.env["ALLOWED_ORIGINS"];
if (ALLOWED_ORIGINS) {
    allowedOrigins.concat(ALLOWED_ORIGINS.split(","));
    console.log("ALLOWED ORIGINS:", allowedOrigins);
    // TODO Configure the origins
}

const downloadingRepos = []; // TODO Store the downloading repos in database
const downloadingReposKey = {}

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

    const sqlOptions = { format: "JSONCompact" };
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
app.post("/api/login/account", (req, res) => {
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
app.get("/api/currentUser", (req, res) => {
    res.send(auth.ADMIN_USER);
});
app.post("/repository", (req, res) => {
    const repoUrl = req.body.url
    if (!repoUrl) {
        res.status(400);
        return res.send("");
    }

    const parts = repoUrl.replace(/.git$/, '').split('/').slice(-2)
    const owner = parts[0];
    const repo = parts[1];
    console.log(downloadingReposKey)
    if(downloadingReposKey[`${owner}___${repo}`]) {
        res.status(409)
        return res.send('');
    }

    const repoObj = {
        owner,
        repo,
        url: repoUrl,
        progress: 0,
    };

    if (repoUrl.indexOf("github.com") !== -1) {
        repoObj.github = true;
    }
    downloadingRepos.push(repoObj);
    downloadingReposKey[`${owner}___${repo}`] = true;

    return res.send("");
});
app.get("/repositories", (req, res) => {
    return res.send(downloadingRepos);
});

app.listen(LISTEN_PORT, () => {
    console.log(`Dashboard backend app listening on port ${LISTEN_PORT}`);
});
