var Obniz = require("obniz");
var Dropbox = require("dropbox");

var first = true;

exports.handler = function (event, context, callback) {
    var obniz = new Obniz("76579440");
    var uploadImageData;


    obniz.onconnect = function () {

        console.log("connected", first);
        if (!first) {
            obniz.close();
            console.log("close", first);
            return
        }
        ;
        //first = false;
        var timezoneoffset = -9     // UTC-表示したいタイムゾーン(単位:hour)。JSTなら-9
        var date = new Date(Date.now() - (timezoneoffset * 60 - new Date().getTimezoneOffset()) * 60000);


        // Example
        var cam = obniz.wired("JpegSerialCam", {vcc: 0, cam_tx: 1, cam_rx: 2, gnd: 3});
        var motor = obniz.wired("DCMotor", {forward: 10, back: 11});
        cam.startwait({baud: 115200}).then(function () {
            console.log("setting cam resolution...");
            return cam.setResolusionWait("640*480");
        }).then(function () {
            console.log("setting cam compression...");
            var compress = 0;
            var val = Math.floor(compress / 100 * 0xFF);
            cam.uart.send([0x56, 0x00, 0x31, 0x05, 0x01, 0x01, 0x12, 0x04, 0xFF]);
            return cam._drainUntil(cam.uart, [0x76, 0x00, 0x31, 0x00]);
        }).then(function () {
            return cam.resetwait();
        }).then(function () {
            console.log("taking");
            return cam.takewait();
        }).then(function (imagedata) {
            console.log("photo OK");
            uploadImageData = imagedata;
            motor.power(100);
            if (date.getHours() === 10
                || date.getHours() === 17) {
                motor.forward();
            }

            return obniz.wait(2000);
        }).then(function () {
            motor.stop();
            obniz.close();
            console.log("water finished");

            var dbx = new Dropbox({accessToken: "9KgmQpZHyj0AAAAAAAALMRfY_qVjRqcNlGLwQew0yIJ1W84EuYgXWO-BjGTXiNHI"});

            var bytes = new Buffer(uploadImageData);
            var dateArray = [
                date.getFullYear(),
                date.getMonth() + 1,
                date.getDate(),
                date.getHours(),
                date.getMinutes(),
                date.getSeconds()
            ];
            var name = "obniz-" + dateArray.join('_') + ".jpeg";
            name = name.replace(/[\/:]/g, "-");

            console.log("uploading");
            return dbx.filesUpload({path: '/' + name, contents: bytes, mode: 'overwrite'});
        }).then(function () {
            console.log("uploaded");

            callback(null, "SUCSESS");

        }).catch(function (error) {

            console.log("error", error);
            callback(error);
        });

    };

};