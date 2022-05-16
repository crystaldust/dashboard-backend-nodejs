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

const INT_TYPE_MAP = {
  UInt8: true,
  UInt16: true,
  UInt32: true,
  UInt64: true,
  UInt128: true,
  UInt256: true,
  Int8: true,
  Int16: true,
  Int32: true,
  Int64: true,
  Int128: true,
  Int256: true,
};

const FLOAT_TYPE_MAP = {
  Float32: true,
  Float64: true,
};

function isIntType(typeName) {
  return INT_TYPE_MAP.hasOwnProperty(typeName);
}

function isFloatType(typeName) {
  return FLOAT_TYPE_MAP.hasOwnProperty(typeName);
}

module.exports.CKClient = CKClient;
module.exports.isIntType = isIntType;
module.exports.isFloatType = isFloatType;
