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
    login: (username, password, err) => {
        if (err) throw err;
        return "Login Successful";
    },

    // should check if username is taken
    newUser: (username, password) => {
        return "New User Created";
    },

    // get the scoreing system data from table in database
    retrieveScoringSystem: () => {

    }
 }