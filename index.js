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
// how many minutes between getting weather updates
const weatherTiming = 5

const tornWarnScore = 20
const tornWatchScore = 15
const tsWarnScore = 10
const tsWatchScore = 5
const wind1 = 5
const wind5 = 2
const torn1 = 50
const torn5 = 25
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

startGameTimer()

//start gameplay, should run until end of day
gameLoop()

io.on('connection', (socket) => {


    socket.player = new Player(socket = socket, name = "Player" + loggedinPlayers.length.toString(),
        currentScore = 0, totalScore = 0, scoreMultiplyer = 1, isTraveling = false, currentLocation = null)

    // activePlayers.push(socket.player)
    loggedinPlayers.push(socket.player)

    console.log(socket.player.name + " connected")

    // attempts to login, checking with the database. Result sent to App through string message. 
    // If successful, username is tied to socketid and added to active player list.
    // may need to change array to dictionary instead, will have to make custom
    socket.on('login', (username, cLocation, cScore, tScore, sMultiplyer) => {

        var canLogin = true
        var success = false

        // commented out as player info will be stored app side for now
        // so a unique username is not required or guaranteed

        // // check if player is logged in already
        // for (var i = 0; i < loggedinPlayers.length(); i++) {
        //     var player = loggedinPlayers[i]
        //     if (player.name == username) {
        //         socket.emit("login failed", "Username is already logged in.")
        //         canLogin = false
        //         break
        //     }
        // }

        // if not in loggedin list, check if player was previously loggedin and in active list
        if (canLogin) {
            for (var i = 0; i < activePlayers.length(); i++) {
                var player = activePlayers[i]
                if (player.name == username) {

                    loggedinPlayers.push(player)
                    socket.join("loggedin")
                    player.socket = socket
                    success = true

                    if (activeGameTime) {
                        socket.emit("logginFromPrevious", player.currentScore, player.totalScore, player.currentLocation, player.route)
                    }
                    else {
                        socket.emit("endOfDay")
                    }
                    break
                }
            }
        }

        if (canLogin && !success) {
            socket.player = new Player(socket = socket,
                                        name = username,
                                        currentScore = cScore,
                                        totalScore = tScore,
                                        scoreMultiplyer = sMultiplyer,
                                        isTraveling = false,
                                        currentLocation = cLocation,
                                        destination = null,
                                        route = null)

            loggedinPlayers.push(socket.player)
            socket.join("loggedin")

            if (activeGameTime) {
                socket.emit("loginSuccess", player.currentScore, player.totalScore, player.currentLocation)
            }
            else {
                socket.emit("endOfDay")
            }
        }

        // player is not in active list
        // check database for player

        // if (canLogin && !success) {
        //     var result = database.login(username, password)
        //     if (result.err) {
        //         socket.emit("login failed", "Database Error.")
        //     }
        //     else {
        //         if (result.results != "") {
        //             // split result into parts and feed into new player
        //             // currentscore, totalscore, scoremultiplyer, currentlocation
        //             var playerinfo = results.results.split(" ")
        //             socket.player = new Player(socket = socket, name = username, currentScore = playerinfo[0], totalScore = playerinfo[1], 
        //                 scoreMultiplyer = playerinfo[2], isTraveling = false, currentLocation = turf.point(playerinfo[3]), destination = null, route = null)

        //             loggedinPlayers.push(socket.player)

        //             socket.join("loggedin")


        //             if (activeGameTime) {
        //                 socket.emit("login success first login of day", socket.player.currentScore, socket.player.totalScore, socket.player.currentLocation)
        //             }
        //             else {
        //                 socket.emit("endOfDay")
        //             }

        //         }
        //         // no such user found/password incorrect
        //         else {
        //             socket.emit("login failed", "Username/Password combination not found.")
        //         }
        //     }
        // }
    })

    // // create a new user
    // socket.on('newUser', (username, password) => {

    //     var results = database.newUser(username, password)

    //     if (results.err) {
    //         socket.emit("new user failed")
    //     }
    //     else {
    //         socket.player = new Player(socket = socket, name = username, currentScore = 0, totalScore = 0, scoreMultiplyer = 1, isTraveling = false, currentLocation = null)
    //         activePlayers.push(socket.player)
    //         loggedinPlayers.push(socket.player)
    //         socket.join("loggedin")
    //         if (activeGameTime) {
    //             socket.emit("new user successful")
    //         }
    //         else {
    //             socket.emit("endOfDay", player.currentScore, player.totalScore, player.currentLocation)
    //         }
    //         break
    //     }
    // })

    // untie player profile from socket and remove from logged in list, 
    // allowing player to relog in or log into a new account without needing to exit the App
    socket.on('logoff', () => {
        loggedinPlayers.splice(loggedinPlayers.indexOf(socket.Player), 1)
        socket.leave("loggedin")
        console.log(socket.player.name + "logged off...")
        socket.player.socket = null
        socket.player = null
    })

    // remove socketid Player, and remove from loggedinPlayers list
    socket.on('disconnect', () => {
        if (socket.player != null) {
            console.log(socket.player.name + " disconnected...")
            loggedinPlayers.splice(loggedinPlayers.indexOf(socket.Player), 1)
            socket.leave("loggedin")
            socket.player.socket = null
            socket.player = null
        }

    })

    socket.on('startLocationSelect', (lat, long, scoreMultiplyer) => {
        socket.player.currentLocation = turf.point([long, lat])
        socket.player.scoreMultiplyer = scoreMultiplyer
        // only add player to active players list once their start location is confirmed by the app
        activePlayers.push(socket.player)
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
        console.log(socket.player.name + " traveling from " + socket.player.currentLocation.geometry.coordinates + " to " + socket.player.destination.geometry.coordinates + " for " + duration / 60 + " minutes")
    })

    socket.on('stopTravel', () => {
        socket.player.isTraveling = false
        console.log(socket.player.name + " stopping travel at " + socket.player.currentLocation.geometry.coordinates)
    })

    socket.on('getPlayerUpdate', () => {
        var start = socket.player.startTime
        var now = new Date().getTime()
        var timeleft = 0
        if (socket.player.isTraveling) {
            timeleft = socket.player.duration - ((now - start) / 1000)
        }
        socket.emit('updatePlayer', {
            currentLocation: socket.player.currentLocation.geometry.coordinates,
            currentScore: socket.player.currentScore,
            totalScore: socket.player.totalScore,
            timeLeft: timeleft
        })
    })

    socket.on("getWeatherUpdate", () => {
        var now = new Date()
        // delay sending weather data if it is still getting parsed
        if (now.getMinutes() % weatherTiming == 0 && now.getSeconds() < 5) {
            setTimeout(() => { socket.emit("weatherUpdate", formatWeather()) }, 5000)
        }
        else {
            socket.emit("weatherUpdate", formatWeather())
        } 
        console.log("sent player weather")
    })

});

// Gameplay

function Player(socket, name, currentScore, totalScore, scoreMultiplyer, isTraveling, currentLocation, destination, route) {
    this.socket = socket;
    this.name = name;
    this.currentScore = currentScore;
    this.totalScore = totalScore;
    this.isTraveling = isTraveling;
    this.inStorm = false;
    this.isLoggedIn = true;
    this.currentLocation = currentLocation;
    this.destination = destination;
    this.route = route;
    this.scoreMultiplyer = scoreMultiplyer;
    this.stormsInside = [];
    this.pointNearChecked = [];
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
                activePlayers.forEach(player => {
                    player.isTraveling = false
                    player.route = null
                    player.destination = null
                    player.inStorm = false
                    player.stormsInside = []
                    player.pointNearChecked = []
                    player.speed = 0
                    player.duration = 0
                });
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
        player.socket.emit("destinationReached", {
            currentLocation: player.currentLocation.geometry.coordinates
        })
        console.log(player.name + " reached destination in " + ((((new Date().getTime()) - player.startTime) / 1000) / 60) + " minutes.")
    }
}

// checks if player is in any weather polygons, gives score for every 5 minutes
function checkScoring(player) {

    var time = new Date().getTime()
    player.inStorm = false
    // call scoring from highest points value to lowest 
    // as player should only get score from one storm poly at a time
    scorePolyStorm(tornadoWarn, tornWarnScore)
    scorePolyStorm(tornadoWatch, tornWatchScore)
    scorePolyStorm(tStormWarn, tsWarnScore)
    scorePolyStorm(tStormWatch, tsWatchScore)

    scorePointStorm(tornado, torn1, torn5)
    scorePointStorm(hail, hailsmall1, hailsmall5, isHail = true)
    scorePointStorm(wind, wind1, wind5)
    

    function scorePolyStorm(storms, scoring) {
        // only check score if player isn't already confirmed in polygon during this check
        if ( !player.inStorm && storms.length > 0) {
            // check every storm in this list
            for (var i = 0; i < storms.length; i++) {
                // if player is inside current storm
                if (turf.booleanPointInPolygon(player.currentLocation, storms[i])) {
                    // check if storm has been stored in player's stormsInside
                    if (player.stormsInside.length > 0) {
                        for(var ind = 0; ind < player.stormsInside.length; ind++) {
                            // if the storm was found stored in stormsInside
                            if (turf.booleanEqual(storms[i], player.stormsInside[ind][0])) {
                                // if it has been over X minutes since last recieving points for this storm, reset timer and award points
                                if (time - player.stormsInside[ind][1] >= scoreTiming) {
                                    player.currentScore += Math.round(scoring * player.scoreMultiplyer)
                                    player.totalScore += Math.round(scoring * player.scoreMultiplyer)
                                    player.stormsInside[ind][1] = time
                                    player.inStorm = true
                                    break
                                }
                                // if time hasn't been met, lock player out from recieving points from lower point storms that may overlap
                                else {
                                    player.inStorm = true
                                    break
                                }
                            } 
                        }  
                        // if storm was not stored in stormsInside, award points and store into stormsInside
                        if (!player.inStorm) {
                            player.stormsInside.push([storms[i], time])
                            player.inStorm = true
                            player.currentScore += Math.round(scoring * player.scoreMultiplyer)
                            player.totalScore += Math.round(scoring * player.scoreMultiplyer)
                            break
                        }
                        // else, storm was found and no more storms need to be checked
                        else {
                            break
                        }
                    }
                    // if stormsInside is empty, award points and store into stormsInside
                    else {
                        player.stormsInside.push([storms[i], time])
                        player.inStorm = true
                        player.currentScore += Math.round(scoring * player.scoreMultiplyer)
                        player.totalScore += Math.round(scoring * player.scoreMultiplyer)
                        break
                    }
                }
            }
        }
    }

    function scorePointStorm(storms, scoreone, scorefive, isHail = false) {
        if (storms.length > 0) {
            storms.forEach(storm => {
                var found = false
                if (player.pointNearChecked.length > 0) {
                    for (var i = 0; i < player.pointNearChecked.length; i++) {
                        if (turf.booleanEqual(pointChecked, storm.coordinates)) {
                            found = true
                            break
                        }
                    }
                    if (!found) {
                        var dist = turf.distance(player.currentLocation, storm.coordinates, units = 'miles')
                        if (dist > 1 && dist <= 5) {
                            if (isHail) {
                                if (storm.size == null || storm.size < 100) {
                                    player.currentScore += Math.round(hailsmall5 * player.scoreMultiplyer)
                                    player.totalScore += Math.round(hailsmall5 * player.scoreMultiplyer)
                                }
                                else if (storm.size >= 100 && storm.size < 200) {
                                    player.currentScore += Math.round(hail1inch5 * player.scoreMultiplyer)
                                    player.totalScore += Math.round(hail1inch5 * player.scoreMultiplyer)
                                }
                                else if (storm.size >= 200 && storm.size < 300) {
                                    player.currentScore += Math.round(hail2inch5 * player.scoreMultiplyer)
                                    player.totalScore += Math.round(hail2inch5 * player.scoreMultiplyer)
                                }
                                else if (storm.size >= 300) {
                                    player.currentScore += Math.round(hail3inch5 * player.scoreMultiplyer)
                                    player.totalScore += Math.round(hail3inch5 * player.scoreMultiplyer)
                                }
                            } else {
                                player.currentScore += Math.round(scorefive * player.scoreMultiplyer)
                                player.totalScore += Math.round(scorefive * player.scoreMultiplyer)
                            }
                        }
                        else if (dist < 1) {
                            if (isHail) {
                                if (storm.size == null || storm.size < 100) {
                                    player.currentScore += Math.round(hailsmall1 * player.scoreMultiplyer)
                                    player.totalScore += Math.round(hailsmall1 * player.scoreMultiplyer)
                                }
                                else if (storm.size >= 100 && storm.size < 200) {
                                    player.currentScore += Math.round(hail1inch1 * player.scoreMultiplyer)
                                    player.totalScore += Math.round(hail1inch1 * player.scoreMultiplyer)
                                }
                                else if (storm.size >= 200 && storm.size < 300) {
                                    player.currentScore += Math.round(hail2inch1 * player.scoreMultiplyer)
                                    player.totalScore += Math.round(hail2inch1 * player.scoreMultiplyer)
                                }
                                else if (storm.size >= 300) {
                                    player.currentScore += Math.round(hail3inch1 * player.scoreMultiplyer)
                                    player.totalScore += Math.round(hail3inch1 * player.scoreMultiplyer)
                                }
                            }
                            else {
                                player.currentScore += Math.round(scoreone * player.scoreMultiplyer)
                                player.totalScore += Math.round(scoreone * player.scoreMultiplyer)
                            }
                        }
                        player.pointNearChecked.push(storm.coordinates)
                    }
                }
            });
        }
    }
}



// create a timer that checks the time every 5 minutes and grabs updated weather while in active game time
function startGameTimer() {

    // get the current time and see if its in active time
    var d = new Date()
    checkGameTime(d)
    console.log("game time is " + activeGameTime)
    var intervalId = setInterval(runGameClock, 60 * 1000 - d.getSeconds() * 1000)

    function runGameClock() {
        var d = new Date()
        console.log("Time is " + d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds())
        checkGameTime(d)

        if (activeGameTime) {
            // update weather every X minutes
            if (d.getMinutes() % weatherTiming == 0) {
                console.log("updating weather...")
                storms = weather.parse()
                // wait 5 seconds to push weather to players since I can't figure out await/promise
                setTimeout(() => {
                    console.log(storms)
                    if(stormsHaveChanged()) {
                        fillStormArrays()
                         // send weather update to all players currently logged in
                        io.in("loggedin").emit("weatherUpdate", formatWeather())
                    }  
                }, 5000)
            }
        }
        else {
            io.in("loggedin").emit("endOfDay")
        }
        clearInterval(intervalId)
        d = new Date()
        intervalId = setInterval(runGameClock, 60 * 1000 - d.getSeconds() * 1000)

    }
}
// checks if it currently active game time
function checkGameTime(d) {
    var currentTime = d.getHours()
    if (currentTime <= dayEnd && currentTime >= dayBegin) {
        if (activeGameTime == false) {
            // start game loop at start of day
            activeGameTime = true
            // reset active players list if it somehow survived the night
            activePlayers = []
            gameLoop()   
        }
    } else {
        // activeGameTime = false
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

function stormsHaveChanged() {
    if (tornadoWarn.length == storms.storms[0].instances.length) {
        for (var i = 0; i < tornadoWarn.length; i++) {
            if (!turf.booleanEqual(tornadoWarn[i], storms.storms[0].instances[i])) {
                return true
            }
        }
    }
    else {
        return true
    }
    if (tornadoWatch.length == storms.storms[1].instances.length) {
        for (var i = 0; i < tornadoWatch.length; i++) {
            if (!turf.booleanEqual(tornadoWatch[i], storms.storms[1].instances[i])) {
                return true
            }
        }
    }
    else {
        return true
    }
    if (tStormWarn.length == storms.storms[2].instances.length) {
        for (var i = 0; i < tStormWarn.length; i++) {
            if (!turf.booleanEqual(tStormWarn[i], storms.storms[2].instances[i])) {
                return true
            }
        }
    }
    else {
        return true
    }
    if (tStormWatch.length == storms.storms[3].instances.length) {
        for (var i = 0; i < tStormWatch.length; i++) {
            if (!turf.booleanEqual(tStormWatch[i], storms.storms[3].instances[i])) {
                return true
            }
        }
    }
    else {
        return true
    }
    if (wind.length != storms.storms[4].instances.length) {
        return true
    }
    if (tornado.length != storms.storms[5].instances.length) {
        return true
    }
    if (hail.length != storms.storms[6].instances.length) {
        return true
    }
    return false
}

function formatWeather() {
    formattedStorms = []

    for(var i = 0; i < 4; i++) {
        sub = []
        storms.storms[i].instances.forEach(polygon => {
            sub.push({
                "Type": "Polygon",
                "coordinates": polygon.geometry.coordinates
            })
        });
        formattedStorms.push(sub)
    }
    for(var i = 4; i < 6; i++) {
        sub = []
        storms.storms[i].instances.forEach(point => {
            sub.push({
                "Type": "Point",
                "coordinates": point.coordinates.geometry.coordinates
            })
        })
        formattedStorms.push(sub)
    }
    var temphail = []
    for(var i = 0; i < storms.storms[6].instances.length; i++) {
        temphail.push({
            "Type": "Point",
            "Size": storms.storms[6].instances[i].size,
            "coordinates": storms.storms[6].instances[i].coordinates.geometry.coordinates
        })
    }
    formattedStorms.push(temphail)

    return { "storms": formattedStorms }
}