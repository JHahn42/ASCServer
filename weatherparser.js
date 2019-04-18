'use strict';
var request = require('request');
var fs = require('fs');
var papa = require('papaparse')
var url = 'https://api.weather.gov/alerts/active';
module.exports = {
    parse: () => {
        // json object to hold all weather data
        var weather = {
            "storms": [
                {"name": "Tornado Warning", "type": "polygon", "instances": []},
                {"name": "Tornado Watch", "type": "polygon", "instances": []},
                {"name": "Severe Thunderstorm Warning", "type": "polygon", "instances": []},
                {"name": "Severe Thunderstorm Watch", "type": "polygon", "instances": []},
                {"name": "Wind", "type": "point", "instances": []},
                {"name": "Tornado", "type": "point", "instances": []},
                {"name": "Hail", "type": "point", "instances": []}
            ]
        }

        request.get({
            url: url,
            json: true,
            headers: {'User-Agent': 'request'}
            }, (err, res, data) => {
                if (err) {
                    console.log('Error:', err);
                } else if (res.statusCode !== 200) {
                    console.log('Status:', res.statusCode);
                } else {
                    var tornadoWarn = [] 
                    var tornadoWatch = [] 
                    var tStormWarn = [] 
                    var tStormWatch = []
                    for(var i = 0; i < data.features.length; i++) {

                        if (data.features[i].geometry != null) {
                            if (data.features[i].properties.event == 'Tornado Warning') {  
                                tornadoWarn.push(data.features[i].geometry.coordinates)
                            }
                            else if (data.features[i].properties.event == 'Tornado Watch') {
                                tornadoWatch.push(data.features[i].geometry.coordinates)
                            }
                            else if (data.features[i].properties.event == 'Severe Thunderstorm Warning') {
                                tStormWarn.push(data.features[i].geometry.coordinates)
                            }
                            else if (data.features[i].properties.event == 'Severe Thunderstorm Watch') {
                                tStormWatch.push(data.features[i].geometry.coordinates)
                            }
                        }
                    }
                    weather.storms[0].instances = tornadoWarn
                    weather.storms[1].instances = tornadoWatch
                    weather.storms[2].instances = tStormWarn
                    weather.storms[3].instances = tStormWatch
            }

        });

        var hail = []
        var tornado = []
        var wind = []

        const windUrl = 'https://www.spc.noaa.gov/climo/reports/today_filtered_wind.csv';
        const tornadoUrl ='https://www.spc.noaa.gov/climo/reports/today_torn.csv';
        const hailUrl ='https://www.spc.noaa.gov/climo/reports/today_hail.csv';

        // replace with today's wind url
        papa.parse("https://www.spc.noaa.gov/climo/reports/180808_rpts_wind.csv", {
            download: true,
            header: true,
            step: function(row) {
                var obj = row.data[0]
                if (obj.Time != "") {
                    wind.push({"time": obj.Time, "coordinates": [obj.Lat, obj.Lon]})
                }
            },
            complete: function() {
                weather.storms[4].instances = wind
            }
        });

        // replace with today's tornado url
        papa.parse("https://www.spc.noaa.gov/climo/reports/180808_rpts_torn.csv", {
            download: true,
            header: true,
            step: function(row) {
                var obj = row.data[0]
                if (obj.Time != "") {
                    tornado.push({"time": obj.Time, "coordinates": [obj.Lat, obj.Lon]})
                }
            },
            complete: function() {
                weather.storms[5].instances = tornado
            }
        });
        
        // replace with today's tornado url
        papa.parse("https://www.spc.noaa.gov/climo/reports/180808_rpts_hail.csv", {
            download: true,
            header: true,
            step: function(row) {
                var obj = row.data[0]
                if (obj.Time != "") {
                    hail.push({"time": obj.Time, "size": obj.Size, "coordinates": [obj.Lat, obj.Lon]})
                }
            },
            complete: function() {
                weather.storms[6].instances = hail
            }
        });

        return weather
    }
}