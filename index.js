// server requirements
const express = require('express'),
http = require('http'),
app = express(),
server = http.createServer(app),
io = require('socket.io').listen(server);

// database connection
// const database = require('./database.js');
var turf = require('@turf/turf')
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

// a list of all players who have logged in at one point through the day.
// they stay in this list until end of day
var activePlayers = []

var activeGameTime = true
// const dayBegin = 10
// const dayEnd = 23
// var currentTime = new Date().getHours()

// if (currentTime <= dayEnd && currentTime >= dayBegin) {
//   activeGameTime = true
// } else {
//   activeGameTime = false
// }

//start gameplay, should run until end of day
gameLoop()

io.on('connection', (socket) => {

  
  socket.player = new Player(socket, "Player" + activePlayers.length.toString(), 0, 0, false, [-85.386521, 40.193382])
  activePlayers.push(socket.player)

  console.log(socket.player.name + " connected")

  // attempts to login, checking with the database. Result sent to App through string message. 
  // If successful, username is tied to socketid and added to active player list.
  // may need to change array to dictionary instead, will have to make custom
  socket.on('login', (username, password) => {

    var attempt = database.login(username, password)
    socket.emit(attempt)
    if( attempt == "Login Successful" ) {
    //  activePlayers.push([username, socket])
      socket.join("logged in")
    }

    // check for active game time, send to end of day if out of gametime
    
  })

  // create a new user
  socket.on('newUser', (username, password) => {

    var attempt = database.newUser(username, password)
    socket.emit(attempt)
    if( attempt == "New User Created") {
    //  activePlayers.push([username, socket])
      socket.join("logged in")
    }
  })

  // untie username from socket connection id, allowing player to relog in or log into a new account
  // witout needing to exit the App
  socket.on('logoff', (username) => {
    socket.leave("logged in")
  })

  // remove socketid Player, and remove from loggedinPlayers list
  socket.on('disconnect', () => {

    console.log(socket.player.name + " disconnected...")

    socket.player.socket = null

    // activePlayers.splice(activePlayers.indexOf(socket.Player),1)
    
  })

  socket.on('startLocationSelect', (geopoint) => {
    
  })

  // geometry is an encoded polyline, distance meters, duration in seconds
  socket.on('setTravelRoute', (geometry, distance, duration) => {

    var geo = polyline.toGeoJSON(geometry, 6)
    var route = turf.lineString(geo.coordinates)
    // km/s
    var speed = (distance/1000)/duration

    socket.player.currentLocation = turf.point(geo.coordinates[0])
    socket.player.destination = turf.point(geo.coordinates[geo.coordinates.length-1])
    socket.player.route = route
    socket.player.speed = speed
    socket.player.startTime = new Date().getTime()
    socket.player.isTraveling = true
    console.log(socket.player.name + " traveling from " + socket.player.currentLocation.geometry.coordinates + " to " + socket.player.destination.geometry.coordinates)
    
    // beginTravel(socket.Player)

  })

  socket.on('stopTravel', () => {
    socket.player.isTraveling = false
  })

  socket.on('getPlayerUpdate', () => {
    socket.emit('updatePlayer', {
      currentLocation: socket.player.currentLocation.geometry.coordinates,
      currentScore: socket.player.currentScore
    })
  })


});

// Gameplay
//change to class later
function Player(socket, name, currentScore, totalScore, isTraveling, currentLocation, destination, route) {
  this.socket = socket;
  this.name = name;
  this.currentScore = currentScore;
  this.totalScore = totalScore;
  this.isTraveling = isTraveling;
  this.currentLocation = currentLocation;
  this.destination = destination
  this.route = route;

}

function gameLoop(player) {
  // only start gameplay loop if during game hours
  if(activeGameTime) {

    var runGame = setInterval(gameplay, 1000)

    function gameplay() {

      if(activeGameTime) {
        if(activePlayers.length > 0) {

          activePlayers.forEach(player => {

            if(player.isTraveling){
              travel(player)
            }
            checkScoring(player) 
          });
        }
      }
      //end of day reached while server was running
      else{
        clearInterval(runGame)
        // run end of day
      }
    }
  }
}

function pointCompare(pt1, pt2){
  if(parseFloat(pt1[0]) == parseFloat(pt2[0]) && parseFloat(pt1[1]) == parseFloat(pt2[1])){
    return true
  }
  else{
    return false
  }
}

function travel(player) {

  var distance = player.speed * ( ((new Date().getTime()) - player.startTime ) / 1000)

  player.currentLocation = turf.along(player.route, distance)

  console.log(player.name + " now at " + player.currentLocation.geometry.coordinates)

  if(turf.booleanEqual(player.currentLocation, player.destination))
  { 
    player.isTraveling = false
    console.log("end travel")
  }
}

// checks if player is in any weather polygons, gives score for every 5 minutes
function checkScoring(player) {

}