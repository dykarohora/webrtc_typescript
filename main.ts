// ベンダープレフィックスの解決
function hasUserMedia() : boolean {
    navigator.mediaDevices.getUserMedia = navigator.mediaDevices.getUserMedia ||
        navigator.mediaDevices.webkitGetUserMedia  ||
        navigator.mediaDevices.mozGetUserMedia  ||
        navigator.mediaDevices.msGetUserMedia;

        return !!navigator.mediaDevices.getUserMedia;
}

function hasRTCPeerConnection() : boolean {
    window.RTCPeerConnection = window.RTCPeerConnection ||
        window.webkitRTCPeerConnection ||
        window.mozRTCPeerConnection;
    return !!window.RTCPeerConnection;
}

function startPeerConnection(stream: MediaStream) {
    let configuration : RTCConfiguration = {
        "iceServers": [{ urls: "stun:stun.1.google.com:19302" }]
    };
    let yourConnection: webkitRTCPeerConnection = new webkitRTCPeerConnection(configuration);
    let theirConnection: webkitRTCPeerConnection = new webkitRTCPeerConnection(configuration);
    // コネクションにストリームを追加する
    yourConnection.addStream(stream);
    // 通信相手がストリームを追加したときのハンドラ
    theirConnection.onaddstream = (event) => {
        theirVideo!.src = window.URL.createObjectURL(event.stream);
    }
    // ICEを取得したときのイベントハンドラ
    yourConnection.onicecandidate = (event) => {
        if(event.candidate) {
            console.log(event.candidate);
            theirConnection.addIceCandidate(
                new RTCIceCandidate(event.candidate)
            );
        }
    };

    theirConnection.onicecandidate = (event) => {
        if(event.candidate) {
            console.log(event.candidate);
            yourConnection.addIceCandidate(
                new RTCIceCandidate(event.candidate)
            );
        }
    };

    // SDPの生成
    yourConnection.createOffer().then( 
        // 生成成功時のハンドラ
        offer => {
            // コネクションにSDPを設定
            yourConnection.setLocalDescription(offer);
            theirConnection.setRemoteDescription(offer);
            // Answer SDPを生成
            return theirConnection.createAnswer();
        }).then( offer => {
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
var yourVideo : HTMLVideoElement | null = document.querySelector("#yours") as HTMLVideoElement;
var theirVideo : HTMLVideoElement | null = document.querySelector("#theirs") as HTMLVideoElement;

if(hasUserMedia()) {
    // ビデオだけ取得する
    let constraints: MediaStreamConstraints = {video: true, audio: false};
    // カメラストリームを取得する
    let p = navigator.mediaDevices.getUserMedia(constraints);
    // 成功時のコールバック
    p.then(stream => {
        yourVideo!.src = window.URL.createObjectURL(stream);
        if(hasRTCPeerConnection()) {
            startPeerConnection(stream);
        } else {
            alert("Sorry, your browser dose not support WebRTC.");
        }
    });
    // 失敗時のコールバック
    p.catch(error => {
        alert("Sorry, we failed to capture your camera, please try again.");
    });
} else {
    alert("Sorry. your browser does not support WebRTC.");
}