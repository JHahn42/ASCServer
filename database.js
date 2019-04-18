var mysql = require('mysql');

var pool = mysql.createPool({
    /* 
    fill in with database info
    
    host     : "ip/url",
    user     : "username",
    password : "pass",
    database : "name of database",
    port     : 3306

    */

});


// need to update to pool
module.exports = {
    // should be able to tell between password incorrect and username not found
    login: (username, password, callback) => {

        pool.getConnection((err, connection) => {
            if(err) {
                console.log(err)
                callback(true)
                return
            }
            var sql = "SELECT currentscore, totalscore, scoremultiplier, currentlocation FROM players WHERE username = \"" + username + "\" AND password = \"" + password + "\""
            connection.query(sql, [], (err, results) => {
                connection.release()
                if(err) {
                    console.log(err)
                    callback(true)
                    return
                }
                callback(false, results)
            })
        })

    },

    // should check if username is taken
    newUser: (username, password) => {
        pool.getConnection((err, connection) => {
            if(err) {
                console.log(err)
                callback(true)
                return
            }
            var sql = "INSERT INTO players (username, password) VALUES (\"" + username + "\", \"" + password + "\")"
            connection.query(sql, [], (err, results) => {
                connection.release()
                if(err) {
                    console.log(err)
                    callback(true)
                    return
                }
                callback(false, results)
            })
        })
    },

    saveUser: (username, otherstuff) => {

    }
 }