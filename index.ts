import ws = require("ws");

interface ILoginResponse {
    type: "login";
    success: boolean;
}

interface IOfferResponse {
    type: "offer";
    offer: any;
    name: string;
}

interface IAnswerResponse {
    type: "answer";
    answer: any;
}

const wsServer = new ws.Server({port: 8888});
// 現在ログインしているユーザのコネクション一覧
let users: {[key: string]: ws} = {};

function sendTo(conn: ws, message: any) {
    conn.send(JSON.stringify(message));
}

// TODO: TypeGuard使ってJSONをオブジェクトにキャストしたい。

// クライアントから接続が来たときのイベントハンドラ
wsServer.on("connection", (connection) => {
    console.log("User Connected");
    // クライアントからメッセージが飛んできたときのハンドラ
    connection.on("message", (message) => {
        let data;

        try {
            data = JSON.parse(message as string);
        } catch (e) {
            console.log("Error parsing JSON");
            data = {};
        }

        switch (data.type) {
            // シグナリングサーバへのログイン
            case "login":
                console.log("User logged in as ", data.name);
                if (users[data.name]) {
                    // すでにログイン済み
                    const loginResponse: ILoginResponse = {
                        type: "login",
                        success: false,
                    };
                    sendTo(connection, loginResponse);
                } else {
                    // 新規ログイン
                    users[data.name] = connection;
                    connection.name = data.name;
                    const loginResponse: ILoginResponse = {
                        type: "login",
                        success: true,
                    };
                    sendTo(connection, loginResponse);
                }
                break;
            // SDPのオファー
            case "offer":
                console.log("Sending offer to ", data.name);
                // 通話先のWebSocketコネクションを取得する
                const offerConn = users[data.name];

                if (offerConn !== null) {
                    // 相手のユーザ名を自分のWebSocketに記録しておく
                    connection.otherName = data.name;
                    // 相手のコネクションに向かってofferメッセージを送信する
                    const offerResponse: IOfferResponse = {
                        type: "offer",
                        offer: data.offer,
                        name: connection.name,
                    };
                    sendTo(offerConn, offerResponse);
                }
                break;
            //  SDPのアンサー
            case "answer":
                console.log("Sending answer to ", data.name);
                // 通信先のWebSocketコネクションを取得する
                const answerConn = users[data.name];

                if (answerConn !== null) {
                    // オファーを送ってきたユーザ名を自分のWebSocketに記録しておく
                    connection.otherName = data.name;
                    // 相手のコネクションに向かってanswerメッセージを送信する
                    const answerResponse: IAnswerResponse = {
                        type: "answer",
                        answer: data.answer,
                    };
                    sendTo(answerConn, answerResponse);
                }
                break;
            default:
                sendTo(connection, {
                    type: "error",
                    message: "Unrecognized command: " + data.type,
                });
                break;
        }
    });

    // コネクションがCloseされるときはユーザ一覧から削除する
    connection.on("close", () => {
        if (connection.name) {
            delete users[connection.name];
            console.log("disconnectd: " + connection.name);
        }
    });
    // 接続してきたクライアントにメッセージを返す
    connection.send("Hello World");
});
