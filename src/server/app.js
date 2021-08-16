var express = require("express");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var port = process.env.PORT || 80;
var path = require("path");
var fs = require("fs");

var user_list = new Array();
var state = 0; //游戏状态，0等待开始，1画画，2欣赏
var showword = null; //当前词汇
var turn = 0; //轮到谁画了
var guess = 0; //猜对人数
var round = 0;
var seconds = 0;
var playernum = 0;
var interval = null;
var draw_time = 90;
var watch_time = 10;

var wordlist = fs.readFileSync(path.resolve(__dirname, "..") + "/data/database.json").toString();
var words;

//Player对象
function Player(name, id, socket) {
  this.name = name;
  this.id = id;
  this.socket = socket;
  this.score = 0;
  this.inGame = false;
  this.status = false;
  this.avatar = Math.floor(Math.random() * 50) + 1;
}

//从user_list根据id获取对象
function GetPlayerFromID(ID) {
  var index = user_list.findIndex(function (player) {
    return player.id === ID;
  });
  return index;
}

//产生用户状态信息
function updatelist() {
  var table = "";
  for (player of user_list) {
    table +=
      '<tr><td rowspan="2"><img src="/svg/' +
      player.avatar +
      '.svg" width="50" height="50"></td><td>' +
      player.name +
      "</td></tr><tr><td>" +
      player.score +
      "</td></tr>";
  }
  return table;
}

function shuffle(array) {
  var m = array.length,
    t,
    i;
  while (m) {
    i = Math.floor(Math.random() * m--);
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }
  return array;
}

//开始游戏
function start() {
  if (user_list.length > 1 && state == 0) {
    words = JSON.parse(wordlist);
    shuffle(words.data);
    state = 1;
    showword = null;
    turn = 0;
    guess = 0;
    round = 1;
    playernum = user_list.length;
    if (interval != null) {
      clearInterval(interval);
      interval = null;
    }
    seconds = 0;
    for (player of user_list) {
      player.score = 0;
      player.inGame = true;
      player.status = false;
    }
    io.emit("update list", updatelist());
    io.emit("update clear");
    io.emit("update message", ["System", `游戏开始!`]);
    game();
  }
}

function game() {
  if (state == 1) {
    user_list[turn].status = true;
    showword = words.data.pop();
    user_list[turn].socket.emit("update word", `轮到你绘画：${showword.word}(${showword.category})`);
    user_list[turn].socket.emit("update status", true);
    user_list[turn].socket.broadcast.emit("update word", `${showword.category},${showword.word.length}个字`);
    user_list[turn].socket.broadcast.emit("update status", false);
    io.emit("update counter", draw_time);
    io.emit("update message", ["System", `轮到${user_list[turn].name}绘画`]);
    setcountdown(draw_time + 1);
    console.log(showword.word);
  } else if (state == 2 && showword != null) {
    io.emit("update word", showword.word);
    guess = 0;
    turn++;
    io.emit("update counter", watch_time);
    setcountdown(watch_time);
  }
}

//中断游戏
function stop() {
  state = 0;
  io.emit("update over");
  showword = null;
  turn = 0;
  guess = 0;
  playernum = 0;
  round = 0;
  if (interval != null) {
    clearInterval(interval);
    interval = null;
  }
  seconds = 0;
  for (player of user_list) {
    player.score = 0;
    player.inGame = false;
    player.status = false;
  }
}

//设置倒计时
function countdown() {
  if (seconds > 0) {
    seconds--;
  } else {
    if (interval != null) {
      clearInterval(interval);
      interval = null;
      seconds = 0;
      if (state == 1) {
        state = 2;
        user_list[turn].status = false;
        io.emit("update status", false);
        game();
      } else if (state == 2) {
        io.emit("update clean");
        if (turn >= playernum) {
          if (round > 1) {
            state = 0;
            io.emit("update over");
          } else {
            turn = 0;
            round += 1;
            state = 1;
            game();
          }
        } else {
          state = 1;
          game();
        }
      }
    }
  }
}

function setcountdown(time) {
  if (interval != null) {
    clearInterval(interval);
    interval = null;
  }
  seconds = time;
  interval = setInterval(countdown, 1000);
}

app.use("/css", express.static(path.resolve(__dirname, "..") + "/css"));
app.use("/font", express.static(path.resolve(__dirname, "..") + "/font"));
app.use("/js", express.static(path.resolve(__dirname, "..") + "/js"));
app.use("/svg", express.static(path.resolve(__dirname, "..") + "/svg"));

app.get("/", function (req, res) {
  res.sendFile(path.resolve(__dirname, "..") + "/html/index.html");
});

io.on("connection", function (socket) {
  user_list.push(new Player(socket.id.slice(0, 6), socket.id, socket));
  io.emit("update list", updatelist());

  socket.on("chat", function (msg) {
    let index = GetPlayerFromID(socket.id);
    if (index != -1) {
      if (msg == "-start") {
        start();
      } else if (msg.substring(0, 6) == "-name " && msg.length > 6) {
        user_list[index].name = msg.substring(6);
        io.emit("update list", updatelist());
      } else if (msg.substring(0, 8) == "-avatar " && !isNaN(Number(msg.substring(8))) && Number(msg.substring(8)) > 0 && Number(msg.substring(8)) < 51) {
        user_list[index].avatar = Number(msg.substring(8));
        io.emit("update list", updatelist());
      } else if (msg == "-newword" && state == 1 && index == turn && guess == 0) {
        showword = words.data.pop();
        user_list[turn].socket.emit("update word", `轮到你绘画：${showword.word}(${showword.category})`);
        user_list[turn].socket.broadcast.emit("update word", `${showword.category},${showword.word.length}个字`);
        io.emit("update counter", draw_time);
        setcountdown(draw_time + 1);
      } else if (msg == "-stop") {
        stop();
      } else if (state == 1 && showword != null && msg == showword.word && index != turn && user_list[index].inGame) {
        var get_score = Math.floor(seconds / 10) + 1;
        guess++;
        if (guess == 1) {
          user_list[turn].score += 3;
          io.emit("update message", ["System", `${user_list[index].name}猜对了，加${get_score}分，${user_list[turn].name}加3分`]);
        } else io.emit("update message", ["System", `${user_list[index].name}猜对了，加${get_score}分`]);
        user_list[index].score += get_score;
        io.emit("update list", updatelist());
        if (guess >= playernum - 1) {
          state = 2;
          if (interval != null) {
            clearInterval(interval);
            interval = null;
          }
          seconds = 0;
          user_list[turn].status = false;
          io.emit("update status", false);
          game();
        }
      } else {
        if (showword != null) {
          for (let char of showword.word.split("")) {
            msg = msg.replace(new RegExp(char, "g"), "*");
          }
        }
        io.emit("update message", [user_list[index].name, msg]);
      }
    }
  });

  socket.on("drawing", function (msg1, msg2, msg3) {
    let index = GetPlayerFromID(socket.id);
    if (index != -1 && user_list[index].status && user_list[index].inGame) {
      socket.broadcast.emit("update drawing", msg1, msg2, msg3);
    }
  });

  socket.on("clean", function () {
    let index = GetPlayerFromID(socket.id);
    if (index != -1 && user_list[index].status && user_list[index].inGame) {
      socket.broadcast.emit("update clean");
    }
  });

  socket.on("disconnect", () => {
    let index = GetPlayerFromID(socket.id);
    if (index != -1) {
      if (user_list[index].inGame) {
        stop();
      }
      user_list.splice(index, 1);
      io.emit("update list", updatelist());
    }
  });
});

http.listen(port, function () {
  console.log("listening on *:" + port);
});
