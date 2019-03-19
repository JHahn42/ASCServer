// server requirements
const express = require('express'),
http = require('http'),
app = express(),
server = http.createServer(app),
io = require('socket.io').listen(server);

// database connection
// const database = require('./database.js');
const turf = require('turf');
var polyline = require('@mapbox/polyline')

// weather data connection

const port = 3000

app.get('/', (req, res) => {
  res.send('Server is running on port ' + port)
  });
  
  server.listen(port,()=>{
      console.log('Node app is running on port ' + port)
      });

// Server/App connection

var activePlayers = []

io.on('connection', (socket) => {

  
  socket.Player = new Player(socket, "Player" + activePlayers.length.toString(), 0, 0, false, [-78.2794, 39.2386])
  activePlayers.push(socket.Player)

  console.log(socket.Player.name + " connected")

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

    console.log(socket.Player.name + " disconnected...")

    activePlayers.splice(activePlayers.indexOf(socket.Player),1)
    
  })

  socket.on('startLocationSelect', (geopoint) => {
    
  })

  socket.on('setTravelRoute', (route) => {
    var geoJSONroute = polyline.toGeoJSON(route)
    
    console.log(socket.Player.name + " going to " + geoJSONroute.coordinates[geoJSONroute.coordinates.length-1])
  })

});

// Gameplay

function Player(socket, name, currentScore, totalScore, isTraveling, currentLocation, route) {
  this.socket = socket;
  this.name = name;
  this.currentScore = currentScore;
  this.totalScore = totalScore;
  this.isTraveling = isTraveling;
  this.currentLocation = currentLocation;
  this.route = route;

}

