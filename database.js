var mysql = require('mysql');

var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "stormyChaser10"   
});

con.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
});

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