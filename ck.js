const ClickHouse = require("@apla/clickhouse");

class CKClient {
    constructor(host, port, user, password, database = "default") {
        this.ch = new ClickHouse({
            host,
            port,
            user,
            password,
            queryOptions: {
                database,
            },
        });
    }

    execute_with_options(sql, options, callback) {
        const stream = this.ch.query(sql, options);

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

        stream.on("error", (err) => {
            console.log("stream err:", err);
            callback(null, null, err);
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
