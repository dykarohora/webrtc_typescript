"use strict";
exports.__esModule = true;
var ws = require("ws");
var wsServer = new ws.Server({ port: 8888 });
// 現在ログインしているユーザのコネクション一覧
var users = {};
function sendTo(conn, message) {
    conn.send(JSON.stringify(message));
}
// TODO: TypeGuard使ってJSONをオブジェクトにキャストしたい。
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
            case "login":
                console.log("User logged in as ", data.name);
                if (users[data.name]) {
                    // すでにログイン済み
                    sendTo(connection, {
                        type: "login",
                        success: false
                    });
                }
                else {
                    // 新規ログイン
                    users[data.name] = connection;
                    // これどうするよ？
                    connection.name = data.name;
                    sendTo(connection, {
                        type: "login",
                        success: true
                    });
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
    connection.on("close", function () {
        if (connection.name) {
            delete users[connection.name];
            console.log("disconnectd: " + connection.name);
        }
    });
    // 接続してきたクライアントにメッセージを返す
    connection.send("Hello World");
});
