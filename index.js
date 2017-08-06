"use strict";
exports.__esModule = true;
var ws = require("ws");
var wsServer = new ws.Server({ port: 8888 });
// 現在ログインしているユーザのコネクション一覧
var users = {};
function sendTo(conn, message) {
    conn.send(JSON.stringify(message));
}
// クライアントから接続が来たときのイベントハンドラ
wsServer.on("connection", function (connection) {
    console.log("User Connected");
    // クライアントからメッセージが飛んできたときのハンドラ
    connection.on("message", function (message) {
        var data;
        try {
            data = JSON.parse(message);
        }
        catch (e) {
            console.log("Error parsing JSON");
            data = {};
        }
        switch (data.type) {
            // シグナリングサーバへのログイン
            case "login":
                console.log("User logged in as ", data.name);
                if (users[data.name]) {
                    // すでにログイン済み
                    var loginResponse = {
                        type: "login",
                        success: false
                    };
                    sendTo(connection, loginResponse);
                }
                else {
                    // 新規ログイン
                    users[data.name] = connection;
                    connection.name = data.name;
                    var loginResponse = {
                        type: "login",
                        success: true
                    };
                    sendTo(connection, loginResponse);
                }
                break;
            // SDPのオファー
            case "offer":
                console.log("Sending offer to ", data.name);
                // 通話先のWebSocketコネクションを取得する
                var offerConn = users[data.name];
                if (offerConn !== null) {
                    // 相手のユーザ名を自分のWebSocketに記録しておく
                    connection.otherName = data.name;
                    // 相手のコネクションに向かってofferメッセージを送信する
                    var offerResponse = {
                        type: "offer",
                        offer: data.offer,
                        name: connection.name
                    };
                    sendTo(offerConn, offerResponse);
                }
                break;
            //  SDPのアンサー
            case "answer":
                console.log("Sending answer to ", data.name);
                // 通信先のWebSocketコネクションを取得する
                var answerConn = users[data.name];
                if (answerConn !== null) {
                    // オファーを送ってきたユーザ名を自分のWebSocketに記録しておく
                    connection.otherName = data.name;
                    // 相手のコネクションに向かってanswerメッセージを送信する
                    var answerResponse = {
                        type: "answer",
                        answer: data.answer
                    };
                    sendTo(answerConn, answerResponse);
                }
                break;
            // ICE
            case "candidate":
                console.log("Sending candidate to ", data.name);
                var iceConn = users[data.name];
                if (iceConn !== null) {
                    // a
                    var iceResponse = {
                        type: "candidate",
                        candidate: data.candidate
                    };
                    sendTo(iceConn, iceResponse);
                }
                break;
            // 通話を切る
            case "leave":
                console.log("Disconnecting user from ", data.name);
                var hangConn = users[data.name];
                hangConn.otherName = null;
                if (hangConn !== null) {
                    sendTo(hangConn, { type: "leave" });
                }
                break;
            default:
                sendTo(connection, {
                    type: "error",
                    message: "Unrecognized command: " + data.type
                });
                break;
        }
    });
    // コネクションがCloseされるときはユーザ一覧から削除する
    connection.on("close", function () {
        if (connection.name) {
            delete users[connection.name];
            if (connection.otherName) {
                console.log("Disconnecting user from ", connection.otherName);
                var conn = users[connection.otherName];
                conn.otherName = null;
                if (conn !== null) {
                    sendTo(conn, { type: "leave" });
                }
            }
        }
    });
    // 接続してきたクライアントにメッセージを返す
    // connection.send("Hello World");
});
