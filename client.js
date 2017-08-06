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
// WebSocketコネクション
var connection = new WebSocket("ws://192.168.0.77:8888");
// ユーザ名
var username = "";
var loginPage = document.querySelector("#login-page");
var usernameInput = document.querySelector("#username");
var loginButton = document.querySelector("#login");
var callPage = document.querySelector("#call-page");
var theirUsernameInput = document.querySelector("#their-username");
var callButton = document.querySelector("#call");
var hangUpButton = document.querySelector("#hang-up");
// Call Pageは不可視状態にする
callPage.style.display = "none";
// loginボタン押したときのハンドラ
loginButton.addEventListener("click", function (event) {
    username = usernameInput.value;
    // サーバにloginメッセージを送る
    if (username.length > 0) {
        send({
            type: "login",
            name: username
        });
    }
});
// サーバからloginメッセージを受け取ったときの処理
function onLogin(success) {
    if (success === false) {
        // ログイン失敗
        alert("Login unsuccessful, please try a differ");
    }
    else {
        // ログイン成功
        loginPage.style.display = "none";
        callPage.style.display = "block";
        startConnection();
    }
}
;
var yourVideo = document.querySelector("#yours");
var theirVideo = document.querySelector("#theirs");
var yourConnection;
// 相手ユーザ名
var connectedUser;
var stream;
function startConnection() {
    if (hasUserMedia()) {
        navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            .then(function (myStream) {
            // デバイスのストリームを取得しvideo要素にセットする
            stream = myStream;
            yourVideo.src = window.URL.createObjectURL(stream);
            if (hasRTCPeerConnection()) {
                setupPeerConnection(stream);
            }
            else {
                alert("Sorry, your browser does not support WebRTC.");
            }
        })["catch"](function (error) { return console.log(error); });
    }
    else {
        alert("Sorry, your browser does not support WebRTC.");
    }
}
function setupPeerConnection(myStream) {
    // RTCPeerConnectionオブジェクトの生成
    var configuration = {
        iceServers: [{ urls: "stun:stun.1.google.com:19302" }]
    };
    yourConnection = new RTCPeerConnection(configuration);
    // デバイスストリームをコネクションに追加する
    yourConnection.addStream(stream);
    // 相手のデバイスストリームをvideoに追加
    // setRemoteDescriptionあとに発生する？？
    yourConnection.onaddstream = function (event) {
        theirVideo.src = window.URL.createObjectURL(event.stream);
    };
    // ice関連のイベントハンドラ
    yourConnection.onicecandidate = function (event) {
        if (event.candidate) {
            console.log(event.candidate);
            send({
                type: "candidate",
                candidate: event.candidate
            });
        }
    };
}
callButton.addEventListener("click", function () {
    var theirUsername = theirUsernameInput.value;
    if (theirUsername.length > 0) {
        startPeerConnection(theirUsername);
    }
});
function startPeerConnection(user) {
    connectedUser = user;
    // SDPオファーの作成
    yourConnection.createOffer()
        .then(function (myOffer) {
        send({
            type: "offer",
            offer: myOffer
        });
        yourConnection.setLocalDescription(myOffer);
    })["catch"](function (error) {
        alert("An error has occurred, when create SDP offer.");
    });
}
function onOffer(offer, name) {
    connectedUser = name;
    yourConnection.setRemoteDescription(new RTCSessionDescription(offer));
    yourConnection.createAnswer()
        .then(function (myAnswer) {
        yourConnection.setLocalDescription(myAnswer);
        send({
            type: "answer",
            answer: myAnswer
        });
    })["catch"](function (error) {
        alert("An error has occured, when answer SDP.");
    });
}
function onAnswer(answer) {
    yourConnection.setRemoteDescription(new RTCSessionDescription(answer));
}
function onCandidate(candidate) {
    yourConnection.addIceCandidate(new RTCIceCandidate(candidate));
}
hangUpButton.addEventListener("click", function () {
    send({
        type: "leave"
    });
    onLeave();
});
function onLeave() {
    connectedUser = null;
    // theirVideo.src = null;
    yourConnection.close();
    // yourConnection.onicecandidate = null;
    // yourConnection.onaddstream = null;
    setupPeerConnection(stream);
}
// 接続完了時のイベントハンドラ
connection.onopen = function () {
    console.log("Connected");
};
// メッセージ受信時のハンドラ
connection.onmessage = function (message) {
    console.log("Got message ", message.data);
    var data = JSON.parse(message.data);
    switch (data.type) {
        case "login":
            onLogin(data.success);
            break;
        case "offer":
            onOffer(data.offer, data.name);
            break;
        case "answer":
            onAnswer(data.answer);
            break;
        case "candidate":
            onCandidate(data.candidate);
            break;
        case "leave":
            onLeave();
            break;
        default:
            break;
    }
};
connection.onerror = function (error) {
    console.log("Got error ", error);
};
function send(message) {
    if (connectedUser) {
        message.name = connectedUser;
    }
    connection.send(JSON.stringify(message));
}
;
