// server requirements
const express = require('express'),
http = require('http'),
app = express(),
server = http.createServer(app),
io = require('socket.io').listen(server);

// database connection
const database = require('./database.js'),
turf = require('turf');

// weather data connection



app.get('/', (req, res) => {
res.send('Server is running on default port')
});

// Server/App connection

var activePlayers = []

io.on('connection', (socket) => {

  // attempts to login, checking with the database. Result sent to App through string message. 
  // If successful, username is tied to socketid and added to active player list.
  // may need to change array to dictionary instead, will have to make custom
  socket.on('login', (username, password) => {

    var attepmt = database.login(username, password)
    socket.emit(attempt)
    if( attempt == "Login Successful" ) {
      activePlayers.push([username, socket])
    }
  })

  // create a new user
  socket.on('newUser', (username, password) => {

    var attempt = database.newUser(username, password)
    socket.emit(attempt)
    if( attempt == "New User Created") {
      activePlayers.push([username, socket])
    }
  })

  // untie username from socket connection id, allowing player to relog in or log into a new account
  // witout needing to exit the App
  socket.on('logoff', (username) => {

  })

  // remove socketid from all connected list, and remove from activePlayers list
  socket.on('disconnect', () => {
    
  })

  socket.on('startLocationSelect', (geopoint) => {
    
  })

  socket.on('testconnect', (message) => {
    socket.emit('reply', {
      reply: "Server saw " + message
    })
  })

});

// Gameplay