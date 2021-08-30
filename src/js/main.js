$(function () {
  var mousePressed = false;
  var lastX, lastY, datax, datay;
  var ctx = $("#myCanvas")[0].getContext("2d");
  var interval = null;
  var drawing = new Array();
  var status = false;
  var socket = io();
  var myAudio = document.getElementById('myAudio');

  //禁用右键
  document.oncontextmenu = () => {
    return false;
  };
  document.onselectstart = () => {
    return false;
  };
  document.ondragstart = () => {
    return false;
  };


  //滑轮调整画笔粗细
  document.onmousewheel = function (e) {
    var index = $("#width")[0].selectedIndex;
    var maxindex = 5;
    if (e.wheelDelta > 0 && index > 0) {
      $("#width")[0].selectedIndex = index - 1;
    } else if (e.wheelDelta < 0 && index < maxindex) {
      $("#width")[0].selectedIndex = index + 1;
    }
  };

  $(document).keydown(function (event) {
    if (status) {
      if (event.which == 67) {
        //c
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        socket.emit("clean");
      } else if (event.which == 69) {
        //e
        $("#tools")[0].selectedIndex = 1;
      } else if (event.which == 66) {
        //b
        $("#tools")[0].selectedIndex = 0;
      }
      // else if (event.which == 80) {
      //   //s
      //   var img = new Image();
      //   img.src = document.getElementById("myCanvas").toDataURL("image/png");
      //   myWindow = window.open();
      //   myWindow.document.body.appendChild(img);
      // }
    }
  });

  function Draw(x, y) {
    ctx.beginPath();
    ctx.lineJoin = "round";
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.closePath();
    ctx.stroke();
    lastX = x;
    lastY = y;
  }

  //设置倒计时
  function countdown() {
    seconds = $("#countdown").text();
    if (seconds > 0) {
      $("#countdown").text(seconds - 1);
    } else if (interval != null) {
      {
        status = false;
        clearInterval(interval);
        interval = null;
      }
    }
  }

  function setcountdown(time) {
    if (interval != null) {
      clearInterval(interval);
      interval = null;
    }
    $("#countdown").text(time);
    interval = setInterval(countdown, 1000);
  }

  function clear() {
    $("#msgs").empty();
  }

  $("#myCanvas").mousedown(function (e) {
    if (status && !mousePressed) {
      ctx.lineWidth = $("#width").val();
      if (e.button == 0 && $("#tools").val() == "brush") {
        ctx.strokeStyle = $("#color").val();
      } else {
        ctx.strokeStyle = "white";
        ctx.lineWidth += 5;
      }
      mousePressed = true;
      lastX = e.pageX - $(this).offset().left;
      lastY = e.pageY - $(this).offset().top;
      let draws = new Array();
      draws.push(lastX, lastY);
      drawing.push(draws);
    }
  });

  $("#myCanvas").mousemove(function (e) {
    if (status && mousePressed) {
      datax = e.pageX - $(this).offset().left;
      datay = e.pageY - $(this).offset().top;
      Draw(datax, datay);
      let draws = new Array();
      draws.push(datax, datay);
      drawing.push(draws);
    }
  });

  $("#myCanvas").mouseup(function (e) {
    if (status && drawing.length != 0) {
      socket.emit("drawing", drawing, ctx.lineWidth, ctx.strokeStyle);
      drawing.length = 0;
    }
    mousePressed = false;
  });

  $("#myCanvas").mouseleave(function (e) {
    if (status && drawing.length != 0) {
      socket.emit("drawing", drawing, ctx.lineWidth, ctx.strokeStyle);
      drawing.length = 0;
    }
    mousePressed = false;
  });

  $("#clear").click(function () {
    if (status) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      socket.emit("clean");
    }
  });

  $("#chat").submit(function (e) {
    e.preventDefault();
    if ($("#msg").val() == "-clear") {
      clear();
    } else {
      socket.emit("chat", $("#msg").val());
    }
    $("#msg").val("");
    return true;
  });

  //更新用户列表
  socket.on("update list", function (msg) {
    $("#leaderboard").html(msg);
  });

  //更新消息列表
  socket.on("update message", function (msg) {
    if (msg[0] == "System") $("#msgs").append("<div>" + msg[1] + "</div>");
    else $("#msgs").append("<div>" + msg[0] + " : " + msg[1] + "</div>");
    document.getElementById("msgs").scrollTop = document.getElementById("msgs").scrollHeight;
  });

  socket.on("update word", function (msg) {
    $("#hint").text(msg);
  });
  socket.on("update status", function (msg) {
    status = msg;
  });
  socket.on("update counter", function (msg) {
    setcountdown(msg);
  });
  socket.on("update clear", function () {
    clear();
  });
  socket.on("update over", function () {
    $("#msgs").append("<div>游戏结束</div>");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    status = false;
    if (interval != null) {
      clearInterval(interval);
      interval = null;
    }
    $("#hint").text("");
    $("#countdown").text("");
  });
  socket.on("update audio", function () {
    myAudio.load();
    myAudio.play();
  });
  socket.on("update drawing", function (msg1, msg2, msg3) {
    ctx.lineWidth = msg2;
    ctx.strokeStyle = msg3;
    lastX = msg1[0][0];
    lastY = msg1[0][1];
    for (var i = 1; i < msg1.length; i++) {
      Draw(msg1[i][0], msg1[i][1]);
    }
  });

  socket.on("update clean", function () {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  });
});
