// - Enter 押して表示ボタン押下扱いにしたい
// - スタイルをまともに
// - Tweet ボタンを表示させたい

"use strict"

const numRatedRange = 5;
const ratedRangeSymbol = "◉";

const ratedRangeIndex = {
    undefined : 0,
    "-"       : 0,
    " ~ 1199" : 1,
    " ~ 1999" : 2,
    " ~ 2799" : 3,
    "All"     : 4,
    "1200 ~ " : 4,
    "2000 ~ " : 4,
};

const ratedRangeColor = [
    "#000000", // black
    "#008000", // green
    "#0000ff", // blue
    "#ff8000", // orange
    "#ff0000", // red
];

const ratedRangeStr = [
    "All Contests",
    "Old-ABC, ABC, ARC, AGC",
    "ABC, ARC, AGC",
    "ARC, AGC",
    "AGC",
];

const getContestMap = function() {
    return new Promise((resolve, reject) => {
        const urlContestList = "https://kenkoooo.com/atcoder/resources/contests.json";
        const request = new XMLHttpRequest();
        request.open("GET", urlContestList, true);
        request.addEventListener('load', (event) => {
            if(event.target.status !== 200) {
                reject(new Error(`${event.target.status}: ${event.target.statusText}`));
            }
            const contestList = JSON.parse(event.target.responseText);
            
            let contestMap = new Map();
            contestList.forEach(e => {
                contestMap.set(e.id, e);
            });
            resolve(contestMap);
        });
        request.addEventListener('error', () => {
            reject(new Error("Network Error."));
        });
        request.send();        
    });
};

const getUserHistory = function(atcoderUserInfo) {
    return new Promise((resolve, reject) => {
        const urlUserHistory = encodeURIComponent(`https://atcoder.jp/users/${atcoderUserInfo}/history/json`);

        const request = new XMLHttpRequest();
        request.open("GET", `./assets/ajax.php?url=${urlUserHistory}`, true);
        request.addEventListener('load', (event) => {
            if(event.target.status !== 200) {
                reject(new Error(`${event.target.status}: ${event.target.statusText}`));
            }
            else {
                const userHistory = JSON.parse(event.target.responseText);
                resolve(userHistory);
            }
        });
        request.addEventListener('error', () => {
            reject(new Error("Network Error."));
        });
        request.send();
    });
};

const updateQQTable = function(userHistory, contestMap) {
    const lbRatedRangeIdx = parseInt(document.getElementById("visible-rated-range").value);
    
    let table = document.getElementById("table-main");
    table.innerHTML = "";

    let achieveCount = Array.from(new Array(100), () =>
                                  new Array(numRatedRange)
                                  .fill(0));
    userHistory.forEach(userJoining => {
        const contestId = userJoining.ContestScreenName.split('.')[0];
        const contestInfo = contestMap.get(contestId);
        const place = userJoining.Place;
        const ratedIdx = ratedRangeIndex[contestInfo.rate_change];
        if(place >= 100 || ratedIdx < lbRatedRangeIdx) return;
        achieveCount[place][ratedIdx]++;
    });

    for(let row=0; row<=10; row++) {
        const rowElem = table.insertRow();
        for(let col=0; col<=10; col++) {
            const colElem = rowElem.insertCell();
            colElem.setAttribute("class", "col-sm-1");
            if(row == 0 && col == 0) {
                continue;
            }
            else if(row == 0) {
                const textElem = document.createTextNode(String(col - 1));
                colElem.appendChild(textElem);
                colElem.setAttribute("style", "font-weight:bold; text-align:center; font-size:1.2em;");
            }
            else if(col == 0) {
                const textElem = document.createTextNode(String(row - 1) + "0 ~");
                colElem.appendChild(textElem);
                colElem.setAttribute("style", "font-weight:bold; text-align:center; font-size:1.2em;");
            }
            else {
                let html = "";
                for(let ratedIdx=lbRatedRangeIdx; ratedIdx<numRatedRange; ratedIdx++) {
                    const cnt = achieveCount[(row-1)*10+(col-1)][ratedIdx];
                    if(cnt > 0) {
                        if(html.length > 0) html += "<br />";
                        html += `<span style="color:${ratedRangeColor[ratedIdx]}">${ratedRangeSymbol}</span> x ${cnt}`;
                    }
                }
                if(row == 1 && col == 1) {
                    html += "---";
                    colElem.setAttribute("style", "text-align:center;");
                }
                if(html.length > 0) colElem.innerHTML = html;
            }
        }
    }
};

const updateHeatmapTable = function(userHistory, contestMap) {
    const lbRatedRangeIdx = parseInt(document.getElementById("visible-rated-range").value);
    let maxPlace = 0;
    let achieveCount = new Map();
    userHistory.forEach(userJoining => {
        const contestId = userJoining.ContestScreenName.split('.')[0];
        const contestInfo = contestMap.get(contestId);
        const place = userJoining.Place;
        const ratedIdx = ratedRangeIndex[contestInfo.rate_change];
        if(ratedIdx < lbRatedRangeIdx) return;
        let counter = achieveCount.get(place);
        if(achieveCount.get(place) === undefined) {
            counter = Array(numRatedRange).fill(0);
        }
        counter[ratedIdx]++;
        achieveCount.set(place, counter);
        maxPlace = Math.max(maxPlace, place);
    });

    // 値として最も大きい順位は常に 10 の位をインクリメントし 1 の位は 0 にする
    // 387 -> 390, 400 -> 410
    maxPlace = maxPlace - maxPlace % 10 + 10;
    
    // 5000 個くらいオブジェクト作らなければならないときもあってつらそう
};

const generateTweetLink = function() {
    const userNameStr = document.getElementById("user-name").value;
    const lbRatedRangeIdx = parseInt(document.getElementById("visible-rated-range").value);
    const twitterFieldElem = document.getElementById("twitter-field");
    twitterFieldElem.innerHTML = "";
    twttr.widgets.createShareButton(
        `${location.href}`,
        twitterFieldElem,
        {
            text: `${userNameStr}'s AtCoder QQ (${ratedRangeStr[lbRatedRangeIdx]})`,
            size: "large",
            hashtags: "AtCoderQQ",
        }
    );
}

window.onload = function() {
    twttr.ready(function() {
        getContestMap()
        .then(function(contestMap) {      
            const userNameElem = document.getElementById("user-name");
            const buttonElem = document.getElementById("show-button");                

            // URL にパラメータが含まれるとき
            const urlParams = new URLSearchParams(window.location.search);
            if(urlParams.get("user") !== null && urlParams.get("rated-range") !== null) {
                const userNameStr = urlParams.get("user");
                userNameElem.value = userNameStr;
                document.getElementById("visible-rated-range").value = urlParams.get("rated-range");            
                getUserHistory(userNameStr).then(function(userHistory) {
                    updateQQTable(userHistory, contestMap);
                    // updateHeatmapTable(userHistory, contestMap);
                });
                generateTweetLink();
            }

            userNameElem.addEventListener("keydown", function(e) {
                // Enter キー押下時は button クリック扱いに
                if(e.keyCode == 13) {
                    buttonElem.click();
                    e.preventDefault();
                }
            });

            buttonElem.addEventListener("click", function() {            
                const userNameStr = userNameElem.value;
                const lbRatedRangeIdx = parseInt(document.getElementById("visible-rated-range").value);
                if(userNameStr.length == 0) return;
                getUserHistory(userNameStr).then(function(userHistory) {
                    updateQQTable(userHistory, contestMap);
                    // updateHeatmapTable(userHistory, contestMap);
                });
                history.pushState("", "", `?user=${userNameStr}&rated-range=${lbRatedRangeIdx}`);
                generateTweetLink();
            });
        });
    });
};

