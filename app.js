const ck = require("./ck");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

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

app.use(bodyParser.text());
app.use(bodyParser.json());
app.use(cors());

app.post("/sql/transfer", (req, res) => {
  if (!!req.body == false || typeof req.body != "string") {
    res.status(400);
    res.send({
      message: "Invalid SQL",
    });
    return;
  }
  ckClient.execute(req.body, (rows, cols) => {
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
    return res.send();
  }
  res.status(400);
  return res.send();
});
app.listen(LISTEN_PORT, () => {
  console.log(`Example app listening on port ${LISTEN_PORT}`);
});
