'use strict';
var broadlink = require('broadlinkjs');
var fs = require('fs');

var b = new broadlink();

b.on("deviceReady", function(dev) {
    var devType = dev.getType();
    if (devType == "RM2") {
        var timer = setInterval(function(){
            console.log("send check!");
            dev.checkData();
        }, 1000);

        dev.on("temperature", function(temp) {
            console.log("get temp "+temp);
            dev.enterLearning();
        });

        dev.on("rawData", function(data) {
            fs.writeFile("test1", data, function(err) {
                if(err) {
                    return console.log(err);
                }
                console.log("The file was saved!");
                clearInterval(timer);
            }); 
        });
        dev.checkTemperature();
    } else if (devType == "Hysen heating controller") {
        dev.on("status", function(status) {
            console.log(JSON.stringify(status));
        });

        dev.on("fullstatus", function(fullstatus) {
            console.log(JSON.stringify(fullstatus));
        });

        dev.getFullStatus();
        setInterval(function(){
            dev.checkTemperature();
        }, 1000);
    } else {
        console.log("Not a supported device yet.")
        //setTimeout(function(){ process.exit(-1); }, 2000);
    }

});

b.discover();
