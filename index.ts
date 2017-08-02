import ws = require("ws");

interface ILoginRequest {
    type: "login";
    name: string;
}

interface ILoginResponse {
    type: "login";
    success: boolean;
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
            default:
                sendTo(connection, {
                    type: "error",
                    message: "Unrecognized command: " + data.type,
                });

                break;
        }
    });

    connection.on("close", () => {
        if (connection.name) {
            delete users[connection.name];
            console.log("disconnectd: " + connection.name);
        }
    });
    // 接続してきたクライアントにメッセージを返す
    connection.send("Hello World");
});
