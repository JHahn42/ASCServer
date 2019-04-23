var turf = require('@turf/turf')


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

const scoreTiming = 1000

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

tStormWatch.push(turf.polygon([
    [
      [
        -78.5522461,
        32.9164853
      ],
      [
        -82.6831055,
        33.0270876
      ],
      [
        -86.0888672,
        31.9894418
      ],
      [
        -86.6381836,
        30.5244133
      ],
      [
        -85.5395508,
        29.4204603
      ],
      [
        -83.9355469,
        29.6307712
      ],
      [
        -83.2983398,
        28.7676591
      ],
      [
        -83.1005859,
        27.1569205
      ],
      [
        -82.1777344,
        25.7998912
      ],
      [
        -81.3867188,
        25.0457922
      ],
      [
        -80.4638672,
        24.4471496
      ],
      [
        -79.4091797,
        25.6019023
      ],
      [
        -79.9145508,
        28.22697
      ],
      [
        -80.7275391,
        30.1831218
      ],
      [
        -80.3320313,
        31.4474103
      ],
      [
        -78.5522461,
        32.9164853
      ]
    ]
  ]))

tStormWarn.push(turf.polygon([
    [
        [
        -86.3964844,
        41.2117215
        ],
        [
        -84.8803711,
        40.9798981
        ],
        [
        -84.2321777,
        39.4616436
        ],
        [
        -86.5393066,
        38.7026593
        ],
        [
        -88.3740234,
        39.1215375
        ],
        [
        -88.0554199,
        40.5722401
        ],
        [
        -86.3964844,
        41.2117215
        ]
    ]
]))

tornadoWatch.push(turf.polygon([
    [
        [
        -86.4624023,
        40.7805414
        ],
        [
        -88.7036133,
        39.1300602
        ],
        [
        -87.890625,
        38.2036553
        ],
        [
        -87.4291992,
        37.26531
        ],
        [
        -85.5999756,
        38.3933389
        ],
        [
        -84.9188232,
        39.2407625
        ],
        [
        -86.4624023,
        40.7805414
        ]
    ]
]))

tornado.push( { "time": 4, "coordinates": turf.point([-86.1726379, 39.7731863]) } )

wind.push( { "time": 4, "coordinates": turf.point([-86.1197662, 39.8233037]) } )

hail.push( { "time": 4, "size": 250, "coordinates": turf.point([-85.4516602, 40.8927534]) } )


var player = new Player(
    socket= null, name= "Pete", 
    currentScore= 0, 
    totalScore= 100, 
    scoreMultiplyer= 1, 
    isTraveling= false, 
    currentLocation= turf.point([ -86.1726379, 39.7824212]),
    destination= null, 
    route= null)

console.log("Pete is " + turf.distance(tornado[0].coordinates, player.currentLocation, { units: 'miles' }) + " miles from a Tornado worth " + torn1 + " points.")
console.log("Pete is " + turf.distance(wind[0].coordinates, player.currentLocation, { units: 'miles' }) + " miles from some wind worth " + wind5 + " points.")
console.log("Pete is " + turf.distance(hail[0].coordinates, player.currentLocation, { units: 'miles' }) + " miles from some 2.5 inch hail " + hail2inch5 + " points.")

if(turf.booleanPointInPolygon(player.currentLocation,tStormWarn[0])){
    console.log("Pete is inside a Thunder Storm Warning, worth " + tsWarnScore + " points.")
}

if(turf.booleanPointInPolygon(player.currentLocation,tornadoWatch[0])){
    console.log("Pete is inside a Tornado Watch, worth " + tornWatchScore + " points.")
}

checkScoring(player)

console.log("Pete's score is now " + player.currentScore + " points. Expected 67")

setTimeout(() => { 
    checkScoring(player); 
    console.log("\nOne Second Later\nPete's score is now " + player.currentScore + " points. Expected 82")

    player.currentLocation = turf.point([-85.4516602, 40.8927534])
    
    console.log("Pete moves to where the hail was reported")

    if(turf.booleanPointInPolygon(player.currentLocation,tStormWarn[0])){
        console.log("Pete is inside a Thunder Storm Warning, worth " + tsWarnScore + " points.")
    }
    
    if(turf.booleanPointInPolygon(player.currentLocation,tornadoWatch[0])){
        console.log("Pete is inside a Tornado Watch, worth " + tornWatchScore + " points.")
    }

    setTimeout(() => { 
        checkScoring(player);  
        console.log("\nOne Second Later\nPete's score is now " + player.currentScore + " points. Expected 92")
        console.log("Pete's overall score 100 + 92 = " + player.totalScore)
    }, 1000)

}, 1000)


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
                        if (turf.booleanEqual(player.pointNearChecked[i], storm.coordinates)) {
                            found = true
                            break
                        }
                    }
                }
                if (!found) {
                    var dist = turf.distance(player.currentLocation, storm.coordinates, { units: 'miles' })
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
            });
        }
    }
}