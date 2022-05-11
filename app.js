const CKClient = require("./ck");
const express = require("express");
const bodyParser = require("body-parser");

const LISTEN_PORT = process.env["PORT"];
const CK_HOST = process.env["CK_HOST"];
const CK_PORT = process.env["CK_PORT"];
const CK_USER = process.env["CK_USER"];
const CK_PASS = process.env["CK_PASS"];

const app = express();

const ckClient = new CKClient(CK_HOST, CK_PORT, CK_USER, CK_PASS);

app.use(bodyParser.text());

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
      if (col.type.indexOf("Int") != -1) {
        rows.forEach((row) => {
          row[colIndex] = parseInt(row[colIndex]);
        });
      } else if (col.type.indexOf("Float") != -1) {
        rows.forEach((row) => {
          row[colIndex] = parseFloat(row[colIndex]);
        });
      }
      return [col.name, col.type];
    });
    res.send([rows, columns]);
  });
});

app.listen(LISTEN_PORT, () => {
  console.log(`Example app listening on port ${LISTEN_PORT}`);
});
