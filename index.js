var util = require('util');
var EventEmitter = require('events').EventEmitter;
var dgram = require('dgram');
var os = require('os');
var crypto = require('crypto');

var Broadlink = module.exports = function(){
    EventEmitter.call(this);
    this.devices = {};
}
util.inherits(Broadlink, EventEmitter);


Broadlink.prototype.genDevice = function(devtype, host, mac) {
    var dev;
    if(devtype == 0){ // SP1
        dev = new device(devtype, host, mac);
        dev.sp1();
        return dev;
    }else if(devtype == 0x2711){ // SP2
        dev = new device(devtype, host, mac);
        dev.sp2();
        return dev;
    }else if(devtype == 0x2719 || devtype == 0x7919 || devtype == 0x271a || devtype == 0x791a){ // Honeywell SP2
        dev = new device(devtype, host, mac);
        dev.sp2();
        return dev;
    }else if(devtype == 0x2720){ // SPMini
        dev = new device(devtype, host, mac);
        dev.sp2();
        return dev;
    }else if(devtype == 0x753e){ // SP3
        dev = new device(devtype, host, mac);
        dev.sp2();
        return dev;
    }else if(devtype == 0x2728){ // SPMini2
        dev = new device(devtype, host, mac);
        dev.sp2();
        return dev;
    }else if(devtype == 0x2733 || devtype == 0x273e){ // OEM branded SPMini
        dev = new device(devtype, host, mac);
        dev.sp2();
        return dev;
    }else if(devtype >= 0x7530 && devtype <= 0x7918){ // OEM branded SPMini2
        dev = new device(devtype, host, mac);
        dev.sp2();
        return dev;
    }else if(devtype == 0x2736){ // SPMiniPlus
        dev = new device(devtype, host, mac);
        dev.sp2();
        return dev;
    }else if(devtype == 0x2712){ // RM2
        dev = new device(devtype, host, mac);
        dev.rm();
        return dev;
    }else if(devtype == 0x2737){ // RM Mini
        dev = new device(devtype, host, mac);
        dev.rm();
        return dev;
    }else if(devtype == 0x273d){ // RM Pro Phicomm
        dev = new device(devtype, host, mac);
        dev.rm();
        return dev;
    }else if(devtype == 0x2783){ // RM2 Home Plus
        dev = new device(devtype, host, mac);
        dev.rm();
        return dev;
    }else if(devtype == 0x277c){ // RM2 Home Plus GDT
        dev = new device(devtype, host, mac);
        dev.rm();
        return dev;
    }else if(devtype == 0x272a){ // RM2 Pro Plus
        dev = new device(devtype, host, mac);
        dev.rm();
        return dev;
    }else if(devtype == 0x2787){ // RM2 Pro Plus2
        dev = new device(devtype, host, mac);
        dev.rm();
        return dev;
    }else if(devtype == 0x278b){ // RM2 Pro Plus BL
        dev = new device(devtype, host, mac);
        dev.rm();
        return dev;
    }else if(devtype == 0x278f){ // RM Mini Shate
        dev = new device(devtype, host, mac);
        dev.rm();
        return dev;
    }else if(devtype == 0x2714){ // A1
        dev = new device(devtype, host, mac);
        dev.a1();
        return dev;
    }else if(devtype == 0x4EB5){ // MP1
        dev = new device(devtype, host, mac);
        dev.mp1();
        return dev;
    }else if(devtype == 0x4EAD){ // Hysen
        dev = new device(devtype, host, mac);
        dev.hysen();
        return dev;
    }else{
        dev = new device(devtype, host, mac);
//--        dev.device();
        return dev;
    }
}

Broadlink.prototype.discover = function(){
    var self = this;
    var interfaces = os.networkInterfaces();
    var addresses = [];
    for (var k in interfaces) {
        for (var k2 in interfaces[k]) {
            var address = interfaces[k][k2];
            if (address.family === 'IPv4' && !address.internal) {
                addresses.push(address.address);
            }
        }
    }
    var address = addresses[0].split('.');

    var cs = dgram.createSocket('udp4');
    cs.on('listening', function(){
        cs.setBroadcast(true);

        var port = cs.address().port;
        var now = new Date();
        var starttime = now.getTime();

        var timezone = now.getTimezoneOffset()/-3600;
        var packet = new Buffer(0x30);
        packet.fill(0);

        var year = now.getYear();

        if(timezone < 0){
            packet[0x08] = 0xff + timezone - 1;
            packet[0x09] = 0xff;
            packet[0x0a] = 0xff;
            packet[0x0b] = 0xff;
        }else{
            packet[0x08] = timezone;
            packet[0x09] = 0;
            packet[0x0a] = 0;
            packet[0x0b] = 0;
        }
        packet[0x0c] = year & 0xff;
        packet[0x0d] = year >> 8;
        packet[0x0e] = now.getMinutes();
        packet[0x0f] = now.getHours();
        var subyear = year%100;
        packet[0x10] = subyear;
        packet[0x11] = now.getDay();
        packet[0x12] = now.getDate();
        packet[0x13] = now.getMonth();
        packet[0x18] = parseInt(address[0]);
        packet[0x19] = parseInt(address[1]);
        packet[0x1a] = parseInt(address[2]);
        packet[0x1b] = parseInt(address[3]);
        packet[0x1c] = port & 0xff;
        packet[0x1d] = port >> 8;
        packet[0x26] = 6;
        var checksum = 0xbeaf;

        for (var i = 0; i < packet.length; i++){
            checksum += packet[i];
        }
        checksum = checksum & 0xffff;
        packet[0x20] = checksum & 0xff;
        packet[0x21] = checksum >> 8;

        cs.sendto(packet, 0, packet.length, 80, '255.255.255.255');

    });

    cs.on("message", function(msg, rinfo) {
        var host = rinfo;
        var mac = new Buffer(6);
        mac.fill(0);
        //mac = msg[0x3a:0x40];
        msg.copy(mac, 0, 0x3a, 0x40);
        var devtype = msg[0x34] | msg[0x35] << 8;
        if(!self.devices){
            self.devices = {};
        }

        if(!self.devices[mac]){
            var dev =  self.genDevice(devtype, host, mac);
            self.devices[mac] = dev;
            dev.on("deviceReady", function() { self.emit("deviceReady", dev); });
            dev.auth();
        }
    });

    cs.bind();
}


function device(devtype, host, mac, timeout){
    var self = this;
    this.devtype = devtype;
    this.host = host;
    this.mac = mac;
    this.emitter = new EventEmitter();

    this.on = this.emitter.on;
    this.emit = this.emitter.emit;
    this.removeListener = this.emitter.removeListener;

    this.timeout = timeout || 10;
    this.count = Math.random()&0xffff;
    this.key = new Buffer([0x09, 0x76, 0x28, 0x34, 0x3f, 0xe9, 0x9e, 0x23, 0x76, 0x5c, 0x15, 0x13, 0xac, 0xcf, 0x8b, 0x02]);
    this.iv = new Buffer([0x56, 0x2e, 0x17, 0x99, 0x6d, 0x09, 0x3d, 0x28, 0xdd, 0xb3, 0xba, 0x69, 0x5a, 0x2e, 0x6f, 0x58]);
    this.id = new Buffer([0, 0, 0, 0]);
    this.cs = dgram.createSocket('udp4');
    this.cs.on('listening', function(){
        //this.cs.setBroadcast(true);
    });
    this.cs.on("message", function(response, rinfo) {
        var enc_payload = new Buffer(response.length-0x38);
        enc_payload.fill(0);
        response.copy(enc_payload, 0, 0x38);

        var decipher = crypto.createDecipheriv('aes-128-cbc', self.key, self.iv);
        decipher.setAutoPadding(false);
        var payload = decipher.update(enc_payload);
        var p2 = decipher.final();
        if(p2){
            payload = Buffer.concat([payload,p2]);
        }

        if(!payload){
            return false;
        }

        var command = response[0x26];
        var err = response[0x22] | (response[0x23] << 8);

        if(err != 0) return;

        if(command == 0xe9){
            self.key = new Buffer(0x10);
            payload.copy(self.key, 0, 0x04, 0x14);

            self.id = new Buffer(0x04);
            payload.copy(self.id, 0, 0x00, 0x04);
            self.emit("deviceReady");
        }else if (command == 0xee){
            self.emit("payload", err, payload);
        }

    });
    this.cs.bind();
    this.type = "Unknown";
}

device.prototype.auth = function(){
    var payload = new Buffer(0x50);
    payload.fill(0);
    payload[0x04] = 0x31;
    payload[0x05] = 0x31;
    payload[0x06] = 0x31;
    payload[0x07] = 0x31;
    payload[0x08] = 0x31;
    payload[0x09] = 0x31;
    payload[0x0a] = 0x31;
    payload[0x0b] = 0x31;
    payload[0x0c] = 0x31;
    payload[0x0d] = 0x31;
    payload[0x0e] = 0x31;
    payload[0x0f] = 0x31;
    payload[0x10] = 0x31;
    payload[0x11] = 0x31;
    payload[0x12] = 0x31;
    payload[0x1e] = 0x01;
    payload[0x2d] = 0x01;
    payload[0x30] = 'T'.charCodeAt(0);
    payload[0x31] = 'e'.charCodeAt(0);
    payload[0x32] = 's'.charCodeAt(0);
    payload[0x33] = 't'.charCodeAt(0);
    payload[0x34] = ' '.charCodeAt(0);
    payload[0x35] = ' '.charCodeAt(0);
    payload[0x36] = '1'.charCodeAt(0);

    this.sendPacket(0x65, payload);

}

device.prototype.getType = function(){
    return this.type;
}

device.prototype.getDevType = function(){
    return this.devtype;
}

device.prototype.getMAC = function(){
    return this.mac;
}

device.prototype.sendPacket = function( command, payload){
    this.count = (this.count + 1) & 0xffff;
    var packet = new Buffer(0x38);
    packet.fill(0);
    packet[0x00] = 0x5a;
    packet[0x01] = 0xa5;
    packet[0x02] = 0xaa;
    packet[0x03] = 0x55;
    packet[0x04] = 0x5a;
    packet[0x05] = 0xa5;
    packet[0x06] = 0xaa;
    packet[0x07] = 0x55;
    packet[0x24] = 0x2a;
    packet[0x25] = 0x27;
    packet[0x26] = command;
    packet[0x28] = this.count & 0xff;
    packet[0x29] = this.count >> 8;
    packet[0x2a] = this.mac[0];
    packet[0x2b] = this.mac[1];
    packet[0x2c] = this.mac[2];
    packet[0x2d] = this.mac[3];
    packet[0x2e] = this.mac[4];
    packet[0x2f] = this.mac[5];
    packet[0x30] = this.id[0];
    packet[0x31] = this.id[1];
    packet[0x32] = this.id[2];
    packet[0x33] = this.id[3];

    // SG, 09.06.2020 - pad the payload for AES encryption
    payload = Buffer.concat([payload, new Buffer((16 - payload.length) % 16)]);

    var checksum = 0xbeaf;
    for (var i = 0 ; i < payload.length; i++){
        checksum += payload[i];
        checksum = checksum & 0xffff;
    }

    var cipher = crypto.createCipheriv('aes-128-cbc', this.key, this.iv);
    payload = cipher.update(payload);
    var p2 = cipher.final();

    packet[0x34] = checksum & 0xff;
    packet[0x35] = checksum >> 8;

    packet = Buffer.concat([packet, payload]);

    checksum = 0xbeaf;
    for (var i = 0 ; i < packet.length; i++){
        checksum += packet[i];
        checksum = checksum & 0xffff;
    }
    packet[0x20] = checksum & 0xff;
    packet[0x21] = checksum >> 8;

    this.cs.sendto(packet, 0, packet.length, this.host.port, this.host.address);
}


device.prototype.mp1 = function(){
    var self = this;
    this.type = "MP1";
    this.prototype.set_power_mask = function(sid_mask, state){
        //"""Sets the power state of the smart power strip."""

        var packet = new Buffer(16);
        packet.fill(0);
        packet[0x00] = 0x0d;
        packet[0x02] = 0xa5;
        packet[0x03] = 0xa5;
        packet[0x04] = 0x5a;
        packet[0x05] = 0x5a;
        packet[0x06] = 0xb2 + (state?(sid_mask<<1):sid_mask);
        packet[0x07] = 0xc0;
        packet[0x08] = 0x02;
        packet[0x0a] = 0x03;
        packet[0x0d] = sid_mask;
        packet[0x0e] = state?sid_mask:0;

        self.sendPacket(0x6a, packet);
    }

    this.set_power = function(sid, state){
        //"""Sets the power state of the smart power strip."""
        var sid_mask = 0x01 << (sid - 1);
        self.set_power_mask(sid_mask, state);
    }
    this.check_power_raw = function(){
        //"""Returns the power state of the smart power strip in raw format."""
        var packet = bytearray(16);
        packet[0x00] = 0x0a;
        packet[0x02] = 0xa5;
        packet[0x03] = 0xa5;
        packet[0x04] = 0x5a;
        packet[0x05] = 0x5a;
        packet[0x06] = 0xae;
        packet[0x07] = 0xc0;
        packet[0x08] = 0x01;

        self.sendPacket(0x6a, packet);
        /*
           err = response[0x22] | (response[0x23] << 8);
           if(err == 0){
           aes = AES.new(bytes(self.key), AES.MODE_CBC, bytes(self.iv));
           payload = aes.decrypt(bytes(response[0x38:]));
           if(type(payload[0x4]) == int){
           state = payload[0x0e];
           }else{
           state = ord(payload[0x0e]);
           }
           return state;
           }
           */
    }

    this.check_power = function() {
        //"""Returns the power state of the smart power strip."""
        /*
           state = self.check_power_raw();
           data = {};
           data['s1'] = bool(state & 0x01);
           data['s2'] = bool(state & 0x02);
           data['s3'] = bool(state & 0x04);
           data['s4'] = bool(state & 0x08);
           return data;
           */
    }


}


device.prototype.sp1 = function(){
    var self = this;
    this.type = "SP1";
    this.set_power = function (state){
        var packet = new Buffer(4);
        packet.fill(4);
        packet[0] = state;
        self.sendPacket(0x66, packet);
    }
}


device.prototype.sp2 = function(){
    var self = this;
    this.type = "SP2";
    this.set_power = function(state){
        //"""Sets the power state of the smart plug."""
        var packet = new Buffer(16);
        packet.fill(0);
        packet[0] = 2;
        packet[4] = state?1:0;
        self.sendPacket(0x6a, packet);
    }

    this.check_power = function(){
        //"""Returns the power state of the smart plug."""
        var packet = new Buffer(16);
        packet.fill(0);
        packet[0] = 1;
        self.sendPacket(0x6a, packet);
        /*
           err = response[0x22] | (response[0x23] << 8);
           if(err == 0){
           aes = AES.new(bytes(self.key), AES.MODE_CBC, bytes(self.iv));
           payload = aes.decrypt(bytes(response[0x38:]));
           return bool(payload[0x4]);
           }
           */
    }


}


device.prototype.a1 = function(){
    var self = this;
    this.type = "A1";
    this.check_sensors = function(){
        var packet = new Buffer(16);
        packet.fill(0);
        packet[0] = 1;
        self.sendPacket(0x6a, packet);
        /*
           err = response[0x22] | (response[0x23] << 8);
           if(err == 0){
           data = {};
           aes = AES.new(bytes(self.key), AES.MODE_CBC, bytes(self.iv));
           payload = aes.decrypt(bytes(response[0x38:]));
           if(type(payload[0x4]) == int){
           data['temperature'] = (payload[0x4] * 10 + payload[0x5]) / 10.0;
           data['humidity'] = (payload[0x6] * 10 + payload[0x7]) / 10.0;
           light = payload[0x8];
           air_quality = payload[0x0a];
           noise = payload[0xc];
           }else{
           data['temperature'] = (ord(payload[0x4]) * 10 + ord(payload[0x5])) / 10.0;
           data['humidity'] = (ord(payload[0x6]) * 10 + ord(payload[0x7])) / 10.0;
           light = ord(payload[0x8]);
           air_quality = ord(payload[0x0a]);
           noise = ord(payload[0xc]);
           }
           if(light == 0){
           data['light'] = 'dark';
           }else if(light == 1){
           data['light'] = 'dim';
           }else if(light == 2){
           data['light'] = 'normal';
           }else if(light == 3){
           data['light'] = 'bright';
           }else{
           data['light'] = 'unknown';
           }
           if(air_quality == 0){
           data['air_quality'] = 'excellent';
           }else if(air_quality == 1){
           data['air_quality'] = 'good';
           }else if(air_quality == 2){
           data['air_quality'] = 'normal';
           }else if(air_quality == 3){
           data['air_quality'] = 'bad';
           }else{
           data['air_quality'] = 'unknown';
           }
           if(noise == 0){
           data['noise'] = 'quiet';
           }else if(noise == 1){
           data['noise'] = 'normal';
           }else if(noise == 2){
           data['noise'] = 'noisy';
           }else{
           data['noise'] = 'unknown';
           }
           return data;
           }
           */
    }

    this.check_sensors_raw = function(){
        var packet = new Buffer(16);
        packet.fill(0);
        packet[0] = 1;
        self.sendPacket(0x6a, packet);
        /*
           err = response[0x22] | (response[0x23] << 8);
           if(err == 0){
           data = {};
           aes = AES.new(bytes(self.key), AES.MODE_CBC, bytes(self.iv));
           payload = aes.decrypt(bytes(response[0x38:]));
           if(type(payload[0x4]) == int){
           data['temperature'] = (payload[0x4] * 10 + payload[0x5]) / 10.0;
           data['humidity'] = (payload[0x6] * 10 + payload[0x7]) / 10.0;
           data['light'] = payload[0x8];
           data['air_quality'] = payload[0x0a];
           data['noise'] = payload[0xc];
           }else{
           data['temperature'] = (ord(payload[0x4]) * 10 + ord(payload[0x5])) / 10.0;
           data['humidity'] = (ord(payload[0x6]) * 10 + ord(payload[0x7])) / 10.0;
           data['light'] = ord(payload[0x8]);
           data['air_quality'] = ord(payload[0x0a]);
           data['noise'] = ord(payload[0xc]);
           }
           return data;
           }
           */
    }
}


device.prototype.rm = function(){
    var self = this;
    this.type = "RM2";
    this.checkData = function(){
        var packet = new Buffer(16);
        packet.fill(0);
        packet[0] = 4;
        self.sendPacket(0x6a, packet);
    }

    this.sendData = function(data){
        packet = new Buffer([0x02, 0x00, 0x00, 0x00]);
        packet = Buffer.concat([packet, data]);
        self.sendPacket(0x6a, packet);
    }

    this.enterLearning = function(){
        var packet = new Buffer(16);
        packet.fill(0);
        packet[0] = 3;
        self.sendPacket(0x6a, packet);
    }

    this.checkTemperature = function(){
        var packet = new Buffer(16);
        packet.fill(0);
        packet[0] = 1;
        self.sendPacket(0x6a, packet);
    }

    this.on("payload", function(err, payload) {
        var param = payload[0];
        switch (param){
            case 1:
                var temp = (payload[0x4] * 10 + payload[0x5]) / 10.0;
                self.emit("temperature", temp);
                break;
            case 4: //get from check_data
                var data = new Buffer(payload.length - 4);
                data.fill(0);
                payload.copy(data, 0, 4);
                self.emit("rawData", data);
                break;
            case 3:
                break;
            case 4:
                break;
        }
    });
}

device.prototype.hysen = function(){
    var self = this;
    this.type = "Hysen heating controller";

    this.calculateCRC16 = function(buffer) {
        var crc = 0xFFFF;
        var odd;
        for (var i = 0; i < buffer.length; i++) {
            crc = crc ^ buffer[i];
            for (var j = 0; j < 8; j++) {
                odd = crc & 0x0001;
                crc = crc >> 1;
                if (odd) crc = crc ^ 0xA001;
            }
        }
        return crc;
    }

    this.sendRequest = function(input_payload) {
        var crc = self.calculateCRC16(input_payload);
        var request_payload = Buffer.concat([
            new Buffer([input_payload.length + 2, 0]),
            input_payload,
            new Buffer([crc & 0xFF, (crc >> 8) & 0xFF])
        ]);

        self.sendPacket(0x6a, request_payload);
    }

    this.getStatus = function() {
        self.sendRequest(new Buffer([0x01, 0x03, 0x00, 0x00, 0x00, 0x08]));  // CRC16 = 3140 [0x0C44]
    }

    this.getFullStatus = function() {
        self.sendRequest(new Buffer([0x01, 0x03, 0x00, 0x00, 0x00, 0x16]));  // CRC16 = 1220 [0x04C4]
    }

    this.checkTemperature = this.getStatus;
    this.checkExternalTemperature = this.getStatus;

    this.on("payload", function(err, payload) {
        //console.log('on payload: ' + payload.toString('hex'));
/*
        check_error(response[0x22:0x24])
        response_payload = bytearray(self.decrypt(bytes(response[0x38:])))

        # experimental check on CRC in response (first 2 bytes are len, and trailing bytes are crc)
        response_payload_len = response_payload[0]
        if response_payload_len + 2 > len(response_payload):
            raise ValueError('hysen_response_error', 'first byte of response is not length')
        crc = self.calculate_crc16(bytes(response_payload[2:response_payload_len]))
        if (response_payload[response_payload_len] == crc & 0xFF) and (
                response_payload[response_payload_len + 1] == (crc >> 8) & 0xFF):
            return response_payload[2:response_payload_len]
        raise ValueError('hysen_response_error', 'CRC check on response failed')
*/
        if (payload[0] > 0x30){ // && (payload[4] == 0x2c)
            self.emit("fullstatus", {
                hour:      payload[0x15],
                min:       payload[0x16],
                sec:       payload[0x17],
                dayofweek: payload[0x18],
                weekday:   [{hour: payload[0x19], min: payload[0x1a], temp: (payload[0x29] / 2.0)},
                            {hour: payload[0x1b], min: payload[0x1c], temp: (payload[0x2a] / 2.0)},
                            {hour: payload[0x1d], min: payload[0x1e], temp: (payload[0x2b] / 2.0)},
                            {hour: payload[0x1f], min: payload[0x20], temp: (payload[0x2c] / 2.0)},
                            {hour: payload[0x21], min: payload[0x22], temp: (payload[0x2d] / 2.0)},
                            {hour: payload[0x23], min: payload[0x24], temp: (payload[0x2e] / 2.0)}],
                weekend:   [{hour: payload[0x25], min: payload[0x26], temp: (payload[0x2f] / 2.0)},
                            {hour: payload[0x27], min: payload[0x28], temp: (payload[0x30] / 2.0)}]
            });
        }
        if (payload[0] > 0x14){ // && ((payload[4] == 0x2c) || (payload[4] == 0x10))
            self.emit("status", {
                remoteLock:   (payload[5] & 1),
                power:        ( payload[6]     & 1),
                active:       ((payload[6]>>4) & 1),
                tempManual:   ((payload[6]>>6) & 1),
                roomTemp:     (payload[7] / 2.0),
                setTemp:      (payload[8] / 2.0),
                autoMode:     ( payload[9]     & 0xf),
                loopMode:     ((payload[9]>>4) & 0xf),
                Sensor:        payload[0xa], // Sensor control option | 0:internal 1:external 2:internal w/ external limit | 0
                osv:           payload[0xb], // Limit temperature value of external sensor | 5-99 | 42
                dif:           payload[0xc], // Return difference of limit temperature value of external sensor | 1-9 | 2
                svh:           payload[0xd], // Set upper limit temperature value | 5-99 | 35
                svl:           payload[0xe], // Set lower limit temperature value | 5-99 | 5
                roomTempAdj:(((payload[0xf]<<8) + payload[0x10]) / 2.0) - ((payload[0xf]&0x80) ? 0x8000 : 0),
                fre:           payload[0x11],  // Anti-freezing function | 0:off 1:on | 0
                powerOn:       payload[0x12],  // Power on memory | 0:Power on no need memory 1:Power on need memory | 0
                payload0x13:   payload[0x13],
                externalTemp: (payload[0x14] / 2.0)
            });
        }
    });
}
