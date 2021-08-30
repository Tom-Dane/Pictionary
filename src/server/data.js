var fs = require("fs");

function jsonWord(word,category){
    this.word=word;
    this.category=category;
}
function txt_json() {
  let data = fs.readFileSync("data.txt").toString();
  let words = data.split("\r\n");
  let jsonWords = new Array();
  for(let word of words){
    let index = word.indexOf('\t');
    if(index!=-1){
        jsonWords.push(new jsonWord(word.substring(0,index) ,word.substring(index+1)));
    }
  }

  fs.writeFileSync("data.json", JSON.stringify(jsonWords));
}


function json_txt() {
    let data = fs.readFileSync("data.json");
    let list = JSON.parse(data.toString());
    let out = "";
    for(let word of list){
        out+=word.word+'\t'+word.category+"\r\n";
    }
    fs.writeFile("data.txt", out, function (err) {
      if (err) {
        console.error(err);
      }
    });
}
txt_json();
// json_txt();
