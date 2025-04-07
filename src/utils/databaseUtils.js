const sqlite3 = require('sqlite3').verbose();

function queryDB(dbPath, query, params = []) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
            if (err) return reject(err);
        });

        db.get(query, params, (err, row) => {
            if (err) {
                db.close();
                return reject(err);
            }
            db.close();
            resolve(row);
        });
    });
}

module.exports = { queryDB };