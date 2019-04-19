// server requirements
const express = require('express'),
    http = require('http'),
    app = express(),
    server = http.createServer(app),
    io = require('socket.io').listen(server);

// database connection
// const database = require('./database.js');

// tools for geospacial functions
var turf = require('@turf/turf')
var polyline = require('@mapbox/polyline')

// weather data connection
var weather = require('./weatherparser.js')
// get fresh weather data
var storms = weather.parse()

// 5 minutes
const scoreTiming = 5000 * 60
const tornWarnScore = 20
const tornWatchScore = 15
const tsWarnScore = 10
const tsWatchScore = 5
const wind1 = 5
const wind5 = 2
const torn1 = 50
const torn5 = 10
const hailsmall1 = 5
const hailsmall5 = 2
const hail1inch1 = 10
const hail1inch5 = 4
const hail2inch1 = 15
const hail2inch5 = 8
const hail3inch1 = 20
const hail3inch5 = 10

var tornadoWarn = [] 
var tornadoWatch = [] 
var tStormWarn = [] 
var tStormWatch = []
var wind = []
var tornado = []
var hail = []
setTimeout(() => { fillStormArrays(); console.log(storms) }, 5000)


//start up server listening on chosen port
const port = 3000

app.get('/', (req, res) => {
    res.send('Server is running on port ' + port)
});

server.listen(port, () => {
    console.log('Node app is running on port ' + port)
});

// Server/App connection

// a list of all players who have logged in at one point through the day.
// they stay in this list until end of day
var activePlayers = []

// list of players currently logged in
var loggedinPlayers = []

// set up active game time for server
var activeGameTime = true
const dayBegin = 10
const dayEnd = 23

// startGameTimer()

//start gameplay, should run until end of day
gameLoop()

io.on('connection', (socket) => {


    socket.player = new Player(name = "Player" + loggedinPlayers.length.toString(),
        currentScore = 0, totalScore = 0, scoreMultiplyer = 1, isTraveling = false, currentLocation = turf.point([-85.386521, 40.193382]))

    activePlayers.push(socket.player)
    loggedinPlayers.push(socket.player)

    console.log(socket.player.name + " connected")

    // attempts to login, checking with the database. Result sent to App through string message. 
    // If successful, username is tied to socketid and added to active player list.
    // may need to change array to dictionary instead, will have to make custom
    socket.on('login', (username, password) => {

        var canLogin = true
        var success = false

        // check if player is logged in already
        for(var i = 0; i < loggedinPlayers.length(); i++) {
            var player = loggedinPlayers[i]
            if (player.name == username) {
                socket.emit("login failed", "Profile is already logged in.")
                canLogin = false
                break
            }
        }

        // if not in loggedin list, check if player was previously loggedin and in active list
        if (canLogin) {
            for(var i = 0; i < activePlayers.length(); i++) {
                var player = activePlayers[i]
                if (player.name == username) {

                    loggedinPlayers.push(player)
                    socket.join("loggedin")
                    success = true

                    if (activeGameTime) {
                        socket.emit("login success prev logged in", player.currentScore, player.totalScore, player.currentLocation)
                    }
                    else {
                        socket.emit("end of day", player.currentScore, player.totalScore, player.currentLocation)
                    }
                    break
                }
            }
        }

        // player is not in active list
        // check database for player
        if (canLogin && !success) {
            var result = database.login(username, password)
            if (result.err) {
                socket.emit("login failed", "Database Error.")
            }
            else {
                if (result.results != "") {
                    // split result into parts and feed into new player
                    // currentscore, totalscore, scoremultiplier, currentlocation
                    var playerinfo = results.results.split(" ")
                    socket.player = new Player(name = username, currentScore = playerinfo[0], totalScore = playerinfo[1], 
                        scoreMultiplyer = playerinfo[2], isTraveling = false, currentLocation = turf.point(playerinfo[3]), destination = null, route = null)

                    loggedinPlayers.push(socket.player)
                    socket.join("loggedin")


                    if (activeGameTime) {
                        socket.emit("login success first login of day", socket.player.currentScore, socket.player.totalScore, socket.player.currentLocation)
                    }
                    else {
                        socket.emit("end of day", socket.player.currentScore, socket.player.totalScore, socket.player.currentLocation)
                    }

                }
                // no such user found/password incorrect
                else {
                    socket.emit("login failed", "Username/Password combination not found.")
                }
            }
        }
    })

    // create a new user
    socket.on('newUser', (username, password) => {

        var results = database.newUser(username, password)
        
        if (results.err) {
            socket.emit("new user failed")
        }
        else {
            socket.player = new Player(name = username, currentScore = 0, totalScore = 0, scoreMultiplyer = 1, isTraveling = false, currentLocation = null)
            activePlayers.push(socket.player)
            loggedinPlayers.push(socket.player)
            socket.join("loggedin")
            socket.emit("new user successful")
        }
    })

    // untie player profile from socket and remove from logged in list, 
    // allowing player to relog in or log into a new account without needing to exit the App
    socket.on('logoff', () => {
        loggedinPlayers.splice(loggedinPlayers.indexOf(socket.Player), 1)
        socket.leave("loggedin")
        console.log(socket.player.name + "logged off...")
        socket.player = null
    })

    // remove socketid Player, and remove from loggedinPlayers list
    socket.on('disconnect', () => {
        if(socket.player != null) {
            console.log(socket.player.name + " disconnected...")
            loggedinPlayers.splice(loggedinPlayers.indexOf(socket.Player), 1)
            socket.leave("loggedin")
            socket.player = null
        }

    })

    socket.on('startLocationSelect', (geopoint) => {

    })

    // geometry is an encoded polyline, distance meters, duration in seconds
    socket.on('setTravelRoute', (geometry, distance, duration) => {

        var geo = polyline.toGeoJSON(geometry, 6)
        var route = turf.lineString(geo.coordinates)
        // km/s
        var speed = (distance / 1000) / duration

        socket.player.currentLocation = turf.point(geo.coordinates[0])
        socket.player.destination = turf.point(geo.coordinates[geo.coordinates.length - 1])
        socket.player.route = route
        socket.player.speed = speed
        socket.player.startTime = new Date().getTime()
        socket.player.isTraveling = true
        socket.player.duration = duration
        console.log(socket.player.name + " traveling from " + socket.player.currentLocation.geometry.coordinates + " to " + socket.player.destination.geometry.coordinates + " for " + duration/60 + " minutes")
    })

    socket.on('stopTravel', () => {
        socket.player.isTraveling = false
    })

    socket.on('getPlayerUpdate', () => {
        var start = socket.player.startTime
        var now = new Date().getTime()

        var timeleft = socket.player.duration - ((now - start) / 1000)
        
        socket.emit('updatePlayer', {
            currentLocation: socket.player.currentLocation.geometry.coordinates,
            currentScore: socket.player.currentScore,
            timeLeft: timeleft
        })
    })

    socket.on("getWeatherUpdate", () => {
        socket.emit("weatherUpdate", storms)
    })

});

// Gameplay

function Player(name, currentScore, totalScore, scoreMultiplyer, isTraveling, currentLocation, destination, route) {
    this.name = name;
    this.currentScore = currentScore;
    this.totalScore = totalScore;
    this.isTraveling = isTraveling;
    this.isLoggedIn = true
    this.currentLocation = currentLocation;
    this.destination = destination;
    this.route = route;
    this.scoreMultiplyer = scoreMultiplyer
    this.stormsInside = []
    this.pointNearChecked = []
}

function gameLoop(player) {
    // only start gameplay loop if during game hours
    if (activeGameTime) {

        var runGame = setInterval(gameplay, 1000)

        function gameplay() {

            if (activeGameTime) {
                if (activePlayers.length > 0) {

                    activePlayers.forEach(player => {

                        if (player.isTraveling) {
                            travel(player)
                        }
                        checkScoring(player)
                    });
                }
            }
            //end of day reached while server was running
            else {
                clearInterval(runGame)
            }
        }
    }
}

function travel(player) {

    var distance = player.speed * (((new Date().getTime()) - player.startTime) / 1000)

    player.currentLocation = turf.along(player.route, distance)

    console.log(player.name + " now at " + player.currentLocation.geometry.coordinates)

    if (turf.booleanEqual(player.currentLocation, player.destination)) {
        player.isTraveling = false
        console.log(player.name + " reached destination in " + ((((new Date().getTime()) - player.startTime) / 1000)/60) + " minutes.")
    }
}

// checks if player is in any weather polygons, gives score for every 5 minutes
function checkScoring(player) {

    var time = new Date().getTime()

    if(tornadoWarn.length > 0) {
        tornadoWarn.forEach(storm => {
            var poly = turf.polygon(storm)
            if (turf.booleanPointInPolygon(player.currentLocation, poly)) {
                if (player.stormsInside.length > 0) {
                    player.stormsInside.forEach(stormInside => {
                        if (turf.booleanEqual(storm, stormInside[0])) {
                            if (stormInside[1] - time >= scoreTiming) {
                                player.currentScore += tornWarnScore
                                player.totalScore += tornWarnScore
                                stormInside[1] = time 
                            }
                        }
                    });
                }
                else {
                    player.stormsInside.push([storm, time])
                    player.currentScore += tornWarnScore
                    player.totalScore += tornWarnScore
                }
            }
        });
    }
    if(tornadoWatch.length > 0) {
        tornadoWatch.forEach(storm => {
            var poly = turf.polygon(storm)
            if (turf.booleanPointInPolygon(player.currentLocation, poly)) {
                if (player.stormsInside.length > 0) {
                    player.stormsInside.forEach(stormInside => {
                        if (turf.booleanEqual(storm, stormInside[0])) {
                            if (stormInside[1] - time >= scoreTiming) {
                                player.currentScore += tornWatchScore
                                player.totalScore += tornWatchScore
                                stormInside[1] = time 
                            }
                        }
                    });
                }
                else {
                    player.stormsInside.push([storm, time])
                    player.currentScore += tornWatchScore
                    player.totalScore += tornWatchScore
                }
            }
        });
    }

    if (tStormWarn.length > 0) {
        tStormWarn.forEach(storm => {
            var poly = turf.polygon(storm)
            if (turf.booleanPointInPolygon(player.currentLocation, poly)) {
                if (player.stormsInside.length > 0) {
                    player.stormsInside.forEach(stormInside => {
                        if (turf.booleanEqual(storm, stormInside[0])) {
                            if (stormInside[1] - time >= scoreTiming) {
                                player.currentScore += tsWarnScore
                                player.totalScore += tsWarnScore
                                stormInside[1] = time 
                            }
                        }
                    });
                }
                else {
                    player.stormsInside.push([storm, time])
                    player.currentScore += tsWarnScore
                    player.totalScore += tsWarnScore
                }
            }
        });
    }

    if (tStormWatch.length > 0) {
        tStormWatch.forEach(storm => {
            var poly = turf.polygon(storm)
            if (turf.booleanPointInPolygon(player.currentLocation, poly)) {
                if (player.stormsInside.length > 0) {
                    player.stormsInside.forEach(stormInside => {
                        if (turf.booleanEqual(storm, stormInside[0])) {
                            if (stormInside[1] - time >= scoreTiming) {
                                player.currentScore += tsWatchScore
                                player.totalScore += tsWatchScore
                                stormInside[1] = time 
                            }
                        }
                    });
                }
                else {
                    player.stormsInside.push([storm, time])
                    player.currentScore += tsWatchScore
                    player.totalScore += tsWatchScore
                }
            }
        });
    }

    if (wind.length > 0 ) { 
        wind.forEach(storm => {
            var point = turf.point(storm.coordinates)
            var found = false
            if (player.pointNearChecked.length > 0) {
                for (var i = 0; i < player.pointNearChecked.length; i++) {
                    if (turf.booleanEqual(pointChecked, point)) {
                        found = true
                        break
                    }
                }
                if (!found) {
                    var dist = turf.distance(player.currentLocation, point, units = 'miles')
                    if (dist > 1 && dist <= 5) {
                        player.currentScore += wind5
                        player.totalScore += wind5
                    }
                    else if (dist < 1) {
                        player.currentScore += wind1
                        player.totalScore += wind1
                    }
                    player.pointNearChecked.push(point)
                }
            }
        });
    }

    if (tornado.length > 0) {
        tornado.forEach(storm => {
        
        });
    }

    if (hail.length > 0) {
        hail.forEach(storm => {
        
        });
    }
}

// create a timer that checks the time every 5 minutes and grabs updated weather while in active game time
function startGameTimer() {

    // get the current time and see if its in active time
    var d = new Date()
    checkGameTime(d)
    console.log("game time is " + activeGameTime)
    var intervalId = setInterval(runGameClock, 60*1000 - d.getSeconds()*1000)
    
    function runGameClock() {
        var d = new Date()
        console.log("Time is " + d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds())
        checkGameTime(d)

        if (activeGameTime) {
            // update weather every 5 minutes
            if (d.getMinutes() % 5 == 0){
                console.log("updating weather...")
                storms = weather.parse()
                // wait 5 seconds to push weather to players since I can't figure out await/promise
                setTimeout(() => { 
                    console.log(storms) 
                    fillStormArrays()
                    io.in("loggedin").emit("weatherUpdate", storms)

                }, 5000)
            }
        }
        else {
            // run end of day
        }
        clearInterval(intervalId)
        d = new Date()
        intervalId = setInterval(runGameClock, 60*1000 - d.getSeconds()*1000)

    }
}
// checks if it currently active game time
function checkGameTime(d) {
    var currentTime = d.getHours()
    if (currentTime <= dayEnd && currentTime >= dayBegin) {
        if (activeGameTime == false) {
            // start game loop at start of day
            gameLoop()
            activeGameTime = true
        } 
    } else {
        activeGameTime = false
    }
}

function fillStormArrays() {
    tornadoWarn = storms.storms[0].instances
    tornadoWatch = storms.storms[1].instances
    tStormWarn = storms.storms[2].instances
    tStormWatch = storms.storms[3].instances
    wind = storms.storms[4].instances
    tornado = storms.storms[5].instances
    hail = storms.storms[6].instances
}