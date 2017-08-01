// ベンダープレフィックスの解決
function hasUserMedia() {
    navigator.mediaDevices.getUserMedia = navigator.mediaDevices.getUserMedia ||
        navigator.mediaDevices.webkitGetUserMedia ||
        navigator.mediaDevices.mozGetUserMedia ||
        navigator.mediaDevices.msGetUserMedia;
    return !!navigator.mediaDevices.getUserMedia;
}
function hasRTCPeerConnection() {
    window.RTCPeerConnection = window.RTCPeerConnection ||
        window.webkitRTCPeerConnection ||
        window.mozRTCPeerConnection;
    return !!window.RTCPeerConnection;
}
function startPeerConnection(stream) {
    var configuration = {
        "iceServers": [{ urls: "stun:stun.1.google.com:19302" }]
    };
    var yourConnection = new webkitRTCPeerConnection(configuration);
    var theirConnection = new webkitRTCPeerConnection(configuration);
    // コネクションにストリームを追加する
    yourConnection.addStream(stream);
    // 通信相手がストリームを追加したときのハンドラ
    theirConnection.onaddstream = function (event) {
        theirVideo.src = window.URL.createObjectURL(event.stream);
    };
    // ICEを取得したときのイベントハンドラ
    yourConnection.onicecandidate = function (event) {
        if (event.candidate) {
            console.log(event.candidate);
            theirConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
        }
    };
    theirConnection.onicecandidate = function (event) {
        if (event.candidate) {
            console.log(event.candidate);
            yourConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
        }
    };
    // SDPの生成
    yourConnection.createOffer().then(
    // 生成成功時のハンドラ
    function (offer) {
        // コネクションにSDPを設定
        yourConnection.setLocalDescription(offer);
        theirConnection.setRemoteDescription(offer);
        // Answer SDPを生成
        return theirConnection.createAnswer();
    }).then(function (offer) {
        // Answer SDPをコネクションに設定
        theirConnection.setLocalDescription(offer);
        yourConnection.setRemoteDescription(offer);
    });
    /*
    yourConnection.createOffer( (offer) => {
        yourConnection.setLocalDescription(offer);
        theirConnection.setRemoteDescription(offer);

        theirConnection.createAnswer((offer) => {
            theirConnection.setLocalDescription(offer);
            yourConnection.setRemoteDescription(offer);
        });
    });
    */
}
// カメラストリームの取得
var yourVideo = document.querySelector("#yours");
var theirVideo = document.querySelector("#theirs");
if (hasUserMedia()) {
    // ビデオだけ取得する
    var constraints = { video: true, audio: false };
    // カメラストリームを取得する
    var p = navigator.mediaDevices.getUserMedia(constraints);
    // 成功時のコールバック
    p.then(function (stream) {
        yourVideo.src = window.URL.createObjectURL(stream);
        if (hasRTCPeerConnection()) {
            startPeerConnection(stream);
        }
        else {
            alert("Sorry, your browser dose not support WebRTC.");
        }
    });
    // 失敗時のコールバック
    p["catch"](function (error) {
        alert("Sorry, we failed to capture your camera, please try again.");
    });
}
else {
    alert("Sorry. your browser does not support WebRTC.");
}
