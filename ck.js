const ClickHouse = require("@apla/clickhouse");

class CKClient {
  constructor(host, port, user, password) {
    this.ch = new ClickHouse({
      host,
      port,
      user,
      password,
    });
    this.connectionOpts = {
      host,
      port,
      user,
      password,
    };
  }

  execute(sql, callback) {
    // console.log(this.connectionOpts);
    // // const ch = new ClickHouse(...this.connectionOpts);
    // const ch = new ClickHouse({
    //   host: "localhost",
    //   port: 18000,
    //   user: "querydata",
    //   password: "querydata",
    // });
    const stream = this.ch.query(sql);

    let columns = [];
    stream.on("metadata", (cols) => {
      columns = cols;
    });

    const rows = [];
    stream.on("data", (row) => {
      rows.push(row);
    });

    stream.on("end", () => {
      callback(rows, columns);
    });
  }
}

module.exports = CKClient;
