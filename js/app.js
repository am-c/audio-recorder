URL = window.URL || window.webkitURL;

var gumStream; //stream from getUserMedia()
var rec; //Recorder.js object
var input; //MediaStreamAudioSourceNode we'll be recording
var timeOut;
// shim for AudioContext when it's not avb. 
var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext //audio context to help us record

var recordButton = document.getElementById("recordButton");
var stopButton = document.getElementById("stopButton");
var clicked = 0;

//setting the cookie
$(window).on('load', function() {
    // if no cookie
    if ($.cookie('alert') != "true") {
        $('.stop-txt').on("click", function() {
            // set the cookie for 4 hours
            var date = new Date();
            date.setTime(date.getTime() + 4 * 3600 * 1000);
            console.log('cookie expires on' + date);
            $.cookie('alert', "true", {
                expires: date
            });
        });
    } else {
        console.log('cookie enabled');
        recordButton.disabled = true;
        $('.stop-txt').click(function() {
            return false;
        });
        $('#loading').css("pointer-events", "none");
        $('#loading').prop("disabled", true);
        document.getElementById("loading").onclick = function() {
            return false;
        }
        $('.success-txt').hide();
        $(".notice-txt").show();
        $("#form").hide();
        $(".left .full-circ").addClass('btnDisabled');
        $(".right .full-circ").addClass('btnDisabled');
        $(".start-txt").addClass('btnDisabled');
        $(".record-txt").addClass('btnDisabled');
        $(".stop-txt").addClass('btnDisabled');
    }
});

//captcha
$(function captcha() {

    var mathenticate = {
        bounds: {
            lower: 5,
            upper: 50
        },
        first: 0,
        second: 0,
        generate: function() {
            this.first = Math.floor(Math.random() * this.bounds.lower) + 1;
            this.second = Math.floor(Math.random() * this.bounds.upper) + 1;
        },
        show: function() {
            return this.first + ' + ' + this.second;
        },
        solve: function() {
            return this.first + this.second;
        }
    };
    mathenticate.generate();

    var $auth = $('<input type="text" name="auth" class="form-control" />');
    $auth
        .attr('placeholder', mathenticate.show())
        .appendTo('#form');

    // adds start text when user types in captcha
    $(function() {
        $(".start-txt").show();
    });

    $(".temp").on('click', function(e) {
        /*    clicked++;
           console.log(clicked); */
        e.preventDefault();
        $(function() {
            $("#form").submit(function() { return false; });
        });
        if ($auth.val() != mathenticate.solve()) {
            alert('do the math first :)');
            $("#form").trigger('reset');
            // location.reload();
            //   stopRecording();
        } else {
            $(".temp").off("click");
            $("#form").hide();

            // Asks user for mic access then adds new button to record
            const promise1 = new Promise(function() {
                getUserAudio();
            });

            promise1.then($(".start-txt").hide(), $(".record-txt").show());

            // Record audio on record button click
            $("#loading").one('click', function(e) {
                record();
                $(".record-txt").hide();


            });
            $(".temp").removeClass();

            console.log(clicked);
            $("#loading").on('click', function(stopClick) {
                clicked++;
                // console.log(clicked);
                if (clicked == 2) {
                    console.log('second click stopped');
                    $(".left .full-circ").hide();
                    $(".right .full-circ").hide();
                    $(".start-txt").hide();
                    $(".record-txt").hide();
                    $(".stop-txt").addClass('btnDisabled');
                    $(".temp").addClass('third');
                    // stops time out from happening if user stops button before 20s
                    clearTimeout(timeOut);
                    // stops recording on click while recording
                    stopRecording();
                }
                if (clicked == 3) {
                    console.log('notice showing');
                    $('.success-txt').hide();
                    $(".notice-txt").show();
                }
            });

        }
    });

});

function getUserAudio() {
    console.log("recordButton clicked");

    // $('.stop-txt').css('display', 'none')
    $('#loading').css('pointer-events', 'none')
        /*
        	Simple constraints object, for more advanced audio features see
        	https://addpipe.com/blog/audio-constraints-getusermedia/
        */

    var constraints = {
        audio: true,
        video: false
    }

    /*
    	We're using the standard promise based getUserMedia() 
    	https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
	*/
    recordingStarted = false;


    navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
        console.log("getUserMedia() success, initializing Recorder.js");
        $('#loading').css('pointer-events', 'auto')
            //   captcha();
            // starts timer when getUserMedia() is successful

        /*
        	create an audio context after getUserMedia() is called
        	sampleRate might change after getUserMedia() is called, like it does on macOS when recording through AirPods
        	the sampleRate defaults to the one set in your OS for your playback device

        */
        audioContext = new AudioContext();

        //update the format 
        document.getElementById("formats").innerHTML = "Format: 1 channel pcm @ " + audioContext.sampleRate / 1000 + "kHz"

        /*  assign to gumStream for later use  */
        gumStream = stream;

        /* use the stream */
        input = audioContext.createMediaStreamSource(stream);


    }).catch(function(err) {
        //enable the record button if getUserMedia() fails
        $('#loading').css('pointer-events', 'none');
        $(".success-txt").hide();
        $(".record-txt").hide();
        $(".notice-txt").show().html("Enable audio access in browser");

    });
}


function record() {
    console.log('record function');
    $(".left .full-circ").show();
    $(".right .full-circ").show();
    $(".start-txt").hide();
    $(".stop-txt").show();
    $("#loading").addClass('clicker');

    // sets time out function at 20 seconds
    timeOut = setTimeout(function() {
        // Triggers stop button / upload click function
        $('.stop-txt').trigger('click');

        // notice shows if user clicks after time out function fires
        $('#loading').on('click', function() {
            console.log('notice shown');
            $('.success-txt').hide();
            $(".notice-txt").show();

        });
    }, 20000);

    /* 
      	Create the Recorder object and configure to record mono sound (1 channel)
      	Recording 2 channels will double the file size
      */
    rec = new Recorder(input, {
        numChannels: 1
    })

    //start the recording process
    rec.record()

    console.log("Recording started");
}

function stopRecording() {
    console.log("stopButton clicked");
    $(".success-txt").show().html("Sending your message...");

    if ($(".notice-txt").css("display") == "block") {
        $('.success-txt').css("display", "none");
    }
    //tell the recorder to stop the recording
    rec.stop();

    //stop microphone access
    gumStream.getAudioTracks()[0].stop();

    //create the wav blob and pass it on to createDownloadLink
    rec.exportWAV(createDownloadLink);
}

function createDownloadLink(blob) {

    var url = URL.createObjectURL(blob);
    var au = document.createElement('audio');
    var li = document.createElement('li');
    var link = document.createElement('a');

    //name of .mp3 file to use during upload and download (without extension)
    var filename = new Date().toISOString();

    //add controls to the <audio> element
    au.controls = true;
    au.src = url;

    //save to disk link
    link.href = url;
    link.download = filename + ".mp3"; //download forces the browser to donwload the file using the filename
    link.innerHTML = "Save to disk";

    //add the new audio element to li
    li.appendChild(au);

    //add the filename to the li
    li.appendChild(document.createTextNode(filename + ".mp3 "))

    //add the save to disk link to li
    li.appendChild(link);

    //upload link
    var upload = document.createElement('a');
    upload.href = "#";
    upload.innerHTML = "Upload";
    //upload.addEventListener("click", function(event) {
    var xhr = new XMLHttpRequest();
    xhr.onload = function(e) {
        if (this.readyState === 4) {
            // show success text
            $(".success-txt").show().html("Message sent!");
            console.log("Server returned: ", e.target.responseText);
        }
    };
    var fd = new FormData();
    fd.append("audio_data", blob, filename);
    xhr.open("POST", "upload.php", true);
    xhr.send(fd);
    //})
    li.appendChild(document.createTextNode(" ")) //add a space in between
    li.appendChild(upload) //add the upload link to li

    //add the li element to the ol
    recordingsList.appendChild(li);
}

function uploadMedia(blob) {

    //  var url = URL.createObjectURL(blob);
    var au = document.createElement('audio');
    // var li = document.createElement('li');
    var link = document.createElement('a');

    //name of .mp3 file to use during upload and download (without extendion)
    var filename = new Date().toISOString();


    //upload link
    var upload = document.createElement('a');
    upload.href = "#";
    upload.innerHTML = "Upload";
    //upload.addEventListener("click", function(event) {
    var xhr = new XMLHttpRequest();
    xhr.onload = function(e) {
        if (this.readyState === 4) {
            console.log("Server returned: ", e.target.responseText);
        }
    };
    var fd = new FormData();
    fd.append("audio_data", filename);
    xhr.open("POST", "upload.php", true);
    xhr.send(fd);

}