// ベンダープレフィックスの解決
function hasUserMedia(): boolean {
    navigator.mediaDevices.getUserMedia = navigator.mediaDevices.getUserMedia ||
        navigator.mediaDevices.webkitGetUserMedia  ||
        navigator.mediaDevices.mozGetUserMedia  ||
        navigator.mediaDevices.msGetUserMedia;

        return !!navigator.mediaDevices.getUserMedia;
}

function hasRTCPeerConnection(): boolean {
    window.RTCPeerConnection = window.RTCPeerConnection ||
        window.webkitRTCPeerConnection ||
        window.mozRTCPeerConnection;
    return !!window.RTCPeerConnection;
}

// WebSocketコネクション
let connection = new WebSocket("ws://192.168.0.77:8888");
// ユーザ名
let username: string = "";

let loginPage            = document.querySelector("#login-page")     as HTMLDivElement;
let usernameInput        = document.querySelector("#username")       as HTMLInputElement;
let loginButton          = document.querySelector("#login")          as HTMLButtonElement;
let callPage             = document.querySelector("#call-page")      as HTMLDivElement;
let theirUsernameInput   = document.querySelector("#their-username") as HTMLInputElement;
let callButton           = document.querySelector("#call")           as HTMLButtonElement;
let hangUpButton         = document.querySelector("#hang-up")        as HTMLButtonElement;

// Call Pageは不可視状態にする
callPage.style.display = "none";
// loginボタン押したときのハンドラ
loginButton.addEventListener("click", (event) => {
    username = usernameInput.value;
    // サーバにloginメッセージを送る
    if (username.length > 0) {
        send({
            type: "login",
            name: username,
        });
    }
});

// サーバからloginメッセージを受け取ったときの処理
function onLogin(success: boolean): void {
    if (success === false) {
        // ログイン失敗
        alert("Login unsuccessful, please try a differ");
    } else {
        // ログイン成功
        loginPage.style.display = "none";
        callPage.style.display = "block";

        startConnection();
    }
};

let yourVideo = document.querySelector("#yours") as HTMLVideoElement;
let theirVideo = document.querySelector("#theirs") as HTMLVideoElement;
let yourConnection: RTCPeerConnection;
// 相手ユーザ名
let connectedUser: string | null;
let stream: MediaStream;

function startConnection(): void {
    if (hasUserMedia()) {
        navigator.mediaDevices.getUserMedia({ video: true, audio: false})
        .then((myStream) => {
            // デバイスのストリームを取得しvideo要素にセットする
            stream = myStream;
            yourVideo!.src = window.URL.createObjectURL(stream);

            if (hasRTCPeerConnection()) {
                setupPeerConnection(stream);
            } else {
                alert("Sorry, your browser does not support WebRTC.");
            }
        }).catch((error) => console.log(error));
    } else {
        alert("Sorry, your browser does not support WebRTC.");
    }
}

function setupPeerConnection(myStream: MediaStream): void {
    // RTCPeerConnectionオブジェクトの生成
    const configuration: RTCConfiguration = {
        iceServers: [{ urls: "stun:stun.1.google.com:19302"}],
    };
    yourConnection = new RTCPeerConnection(configuration);
    // デバイスストリームをコネクションに追加する
    yourConnection.addStream(stream);
    // 相手のデバイスストリームをvideoに追加
    // setRemoteDescriptionあとに発生する？？
    yourConnection.onaddstream = (event) => {
        theirVideo.src = window.URL.createObjectURL(event.stream);
    };
    // ice関連のイベントハンドラ
    yourConnection.onicecandidate = (event) => {
        if (event.candidate) {
            console.log(event.candidate);
            send({
                type: "candidate",
                candidate: event.candidate,
            });
        }
    };
}

callButton.addEventListener("click", () => {
    const theirUsername = theirUsernameInput.value;

    if (theirUsername.length > 0) {
        startPeerConnection(theirUsername);
    }
});

function startPeerConnection(user: string): void {
    connectedUser = user;
    // SDPオファーの作成
    yourConnection.createOffer()
        .then((myOffer) => {
            send({
                type: "offer",
                offer: myOffer,
            });
            yourConnection.setLocalDescription(myOffer);
        })
        .catch((error) => {
            alert("An error has occurred, when create SDP offer.");
        });
}

function onOffer(offer, name) {
    connectedUser = name;
    yourConnection.setRemoteDescription(new RTCSessionDescription(offer));

    yourConnection.createAnswer()
        .then((myAnswer) => {
            yourConnection.setLocalDescription(myAnswer);
            send({
                type: "answer",
                answer: myAnswer,
            });
        })
        .catch((error) => {
            alert("An error has occured, when answer SDP.");
        });
}

function onAnswer(answer) {
    yourConnection.setRemoteDescription(new RTCSessionDescription(answer));
}

function onCandidate(candidate) {
    yourConnection.addIceCandidate(new RTCIceCandidate(candidate));
}

hangUpButton.addEventListener("click", () => {
    send({
        type: "leave",
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
connection.onopen = () => {
    console.log("Connected");
};

// メッセージ受信時のハンドラ
connection.onmessage = (message) => {
    console.log("Got message ", message.data);

    const data = JSON.parse(message.data);

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

connection.onerror = (error) => {
    console.log("Got error ", error);
};

function send(message: any) {
    if (connectedUser) {
        message.name = connectedUser;
    }

    connection.send(JSON.stringify(message));
};
