// =====================================================================
// =====================================================================
// =====================================================================
//
//                  בול פגיעה - יאיר טפר
//              קובץ שמכיל רק את המשחק נגד המחשב
//
//  הקובץ בנוי משלושה חלקים:
//  - חלק 1 (רק מה שצריך): משתנים ופונקציות עזר מהמשחק הרגיל,
//    שהמשחק נגד המחשב משתמש בהם. בלעדיהם הקוד לא היה עובד.
//  - חלק 2: משחק נגד המחשב (המשחק הרגיל - הקוד מחשב את המשוב).
//  - חלק 4: בחירת סוג המשחק + משחק "צירוף על דף" (השחקן נותן משוב).
//  (המספרים 2 ו-4 הם כמו בקובץ script.js המלא. חלק 3 - המשחק ברשת - לא נמצא כאן)
//
// =====================================================================
// =====================================================================
// =====================================================================


// =====================================================================
//          חלק 1 (רק מה שצריך): משתנים ופונקציות עזר
//          (מועתקים מהחלק הראשון של script.js)
// =====================================================================

// ----- משתנים כלליים -----

// רשימת הצבעים הקבועה, לפי הסדר.
// בקוד כל צבע מיוצג על ידי מספר: צבע מספר 1 = המקום הראשון ברשימה (אדום),
// צבע מספר 2 = המקום השני (ירוק) וכן הלאה.
// לכן הצבע של מספר מסוים נמצא ברשימה במקום (מספר - 1).
let colorCodes = ["red", "green", "blue", "yellow", "magenta", "orange", "purple", "brown"];

// שמות הצבעים בעברית (באותו סדר), מוצגים כשמעבירים את העכבר מעל צבע
let colorNames = ["אדום", "ירוק", "כחול", "צהוב", "ורוד", "כתום", "סגול", "חום"];

let numSpots = 0;          // מספר המקומות בצירוף (נבחר במסך ההגדרות)

let numColors = 0;         // מספר הצבעים שמשתתפים במשחק (נבחר במסך ההגדרות)

let maxAttempts = 7;       // מספר הניסיונות שיש למחשב

let selectedColor = 0;     // הצבע שהשחקן בחר כרגע מהלוח (0 = עדיין לא נבחר צבע)


// ----- פונקציות עזר -----

// מציגה את המסך שהשם שלו התקבל, ומסתירה את שאר המסכים
// (בקובץ הזה יש רק 4 מסכים: הגדרות, בחירת סוג המשחק, משחק רגיל נגד המחשב, צירוף על דף)
function showScreen(screenId) {
    document.getElementById("settingsScreen").style.display = "none";
    document.getElementById("computerModeScreen").style.display = "none";
    document.getElementById("computerScreen").style.display = "none";
    document.getElementById("paperScreen").style.display = "none";
    document.getElementById(screenId).style.display = "block";
}

// כותבת הודעה בתוך האלמנט שהמזהה שלו התקבל
// (שולחים טקסט ריק "" כדי למחוק הודעה)
function showMessage(elementId, text) {
    document.getElementById(elementId).textContent = text;
}

// צובעת קובייה לפי מספר צבע.
// כאן המספר מתורגם לצבע אמיתי על המסך. אם המספר הוא 0 הקובייה נשארת לבנה (ריקה).
function paintCube(cube, colorNumber) {
    if (colorNumber == 0) {
        cube.style.backgroundColor = "white";
    } else {
        cube.style.backgroundColor = colorCodes[colorNumber - 1];
    }
}

// בודקת אם ערך מסוים נמצא בתוך מערך. מחזירה true אם כן, false אם לא.
function isInArray(array, value) {
    for (let i = 0; i < array.length; i++) {
        if (array[i] == value) {
            return true;
        }
    }
    return false;
}

// בודקת אם כל הקוביות מלאות, כלומר אין במערך אף 0
function isFull(array) {
    for (let i = 0; i < array.length; i++) {
        if (array[i] == 0) {
            return false;
        }
    }
    return true;
}

// בודקת אם יש צבע שמופיע פעמיים במערך.
// משווים כל איבר לכל האיברים שאחריו (שתי לולאות אחת בתוך השנייה).
function hasDuplicates(array) {
    for (let i = 0; i < array.length; i++) {
        for (let j = i + 1; j < array.length; j++) {
            if (array[i] == array[j]) {
                return true;
            }
        }
    }
    return false;
}

// בודקת אם צבע מסוים כבר נמצא בקובייה אחרת (לא בקובייה שבמקום index).
// משתמשים בזה כדי למנוע מהשחקן לשים את אותו צבע פעמיים.
function isColorUsedElsewhere(array, colorNumber, index) {
    for (let i = 0; i < array.length; i++) {
        if (i != index && array[i] == colorNumber) {
            return true;
        }
    }
    return false;
}

// יוצרת מערך באורך numSpots שכל התאים בו הם 0 (קוביות ריקות)
function createEmptyArray() {
    let array = [];
    for (let i = 0; i < numSpots; i++) {
        array.push(0);
    }
    return array;
}


// ----- לוח הצבעים -----

// בונה את לוח הצבעים בתוך האלמנט שהמזהה שלו התקבל.
// יוצרים כפתור אחד לכל צבע מ-1 ועד numColors (הצבעים הראשונים ברשימה הקבועה).
function buildPalette(containerId) {
    let container = document.getElementById(containerId);
    container.innerHTML = "";   // מוחקים כפתורים ממשחק קודם

    for (let colorNumber = 1; colorNumber <= numColors; colorNumber++) {
        createColorButton(container, colorNumber);
    }
}

// יוצרת כפתור של צבע אחד ומוסיפה אותו ללוח
function createColorButton(container, colorNumber) {
    let button = document.createElement("button");
    button.className = "colorButton";
    button.style.backgroundColor = colorCodes[colorNumber - 1];
    button.title = colorNames[colorNumber - 1];

    // לחיצה על הכפתור בוחרת את הצבע
    button.addEventListener("click", function () {
        selectedColor = colorNumber;

        // מורידים את הסימון מכל הכפתורים בלוח, ומסמנים רק את הכפתור שנלחץ
        let allButtons = container.children;
        for (let i = 0; i < allButtons.length; i++) {
            allButtons[i].className = "colorButton";
        }
        button.className = "colorButton selected";
    });

    container.appendChild(button);
}


// ----- חזרה למסך ההגדרות -----

// פועלת כשלוחצים על "משחק חדש" - חוזרים למסך ההגדרות
function newGameClicked() {
    showScreen("settingsScreen");
}


// =====================================================================
// =====================================================================
// =====================================================================
//
//                  חלק 2: משחק נגד המחשב
//        השחקן בוחר צירוף סודי, והמחשב מנסה לנחש אותו
//
// =====================================================================
// =====================================================================
// =====================================================================

// איך המחשב חושב (לפי ההוראות):
// 1. בונים מערך S עם כל הצירופים שיכולים להיות הצירוף הסודי.
// 2. המחשב מנחש ניחוש ראשון ומקבל משוב: כמה בול וכמה פגיעה.
// 3. עוברים על כל צירוף ב-S ושואלים: "אם זה היה הצירוף הסודי,
//    האם הניחוש היה מקבל בדיוק את אותו משוב?" אם לא - הצירוף בלתי אפשרי ונמחק מ-S.
// 4. סופרים איזה צבע הכי נפוץ בצירופים שנשארו ב-S.
// 5. נותנים לכל צירוף ב-S ניקוד: צירוף שבנוי מצבעים נפוצים יותר מקבל ניקוד גבוה יותר.
// 6. המחשב מנחש את הצירוף עם הניקוד הכי גבוה.
// 7. מקבלים משוב וחוזרים לשלב 3, עד שהמחשב מוצא את הצירוף.
//
// שינוי קטן מההוראות: בהוראות הניחוש הראשון הוא (אדום, אדום, כחול, כחול),
// אבל במשחק שלנו אסור לחזור על צבע. לכן הניחוש הראשון הוא הצבעים הראשונים
// ברשימה לפי הסדר, למשל עבור 4 מקומות: [1, 2, 3, 4] = אדום, ירוק, כחול, צהוב.
//
// מושגים:
//   בול   = צבע נכון במקום הנכון (קובייה ירוקה במשוב)
//   פגיעה = צבע שקיים בצירוף אבל במקום אחר (קובייה צהובה במשוב)


// ----- משתנים של המשחק נגד המחשב -----

let possibleCodes = [];       // זה המערך S - כל הצירופים שעדיין יכולים להיות הצירוף הסודי
let playerCode = [];          // הצירוף שהשחקן בונה (0 = קובייה ריקה)
let computerGuess = [];       // הניחוש הבא שהמחשב ינחש
let computerAttempts = 0;     // כמה ניחושים המחשב כבר עשה
let computerPlaying = false;  // האם המחשב כבר התחיל לנחש (ואז אסור לשנות את הצירוף)


// ----- פונקציות עזר לחלק 2 -----

// יוצרת עותק חדש של מערך (כדי ששינוי במערך אחד לא ישנה את השני)
function copyArray(array) {
    let newArray = [];
    for (let i = 0; i < array.length; i++) {
        newArray.push(array[i]);
    }
    return newArray;
}

// סופרת כמה "בול" יש: כמה מקומות שבהם הצבע בניחוש שווה לצבע בצירוף
function countBulls(guess, code) {
    let bulls = 0;
    for (let i = 0; i < guess.length; i++) {
        if (guess[i] == code[i]) {
            bulls = bulls + 1;
        }
    }
    return bulls;
}

// סופרת כמה "פגיעה" יש: כמה צבעים מהניחוש נמצאים בצירוף, אבל לא באותו מקום
function countHits(guess, code) {
    let hits = 0;
    for (let i = 0; i < guess.length; i++) {
        if (guess[i] != code[i] && isInArray(code, guess[i])) {
            hits = hits + 1;
        }
    }
    return hits;
}


// ----- פתיחת המשחק נגד המחשב -----

// פועלת כשלוחצים על "שחק נגד מחשב" במסך ההגדרות
function computerButtonClicked() {
    // קוראים את ההגדרות, בדיוק כמו במשחק הרגיל
    numSpots = Number(document.getElementById("spotsSelect").value);
    numColors = Number(document.getElementById("colorsSelect").value);

    // אותה בדיקה כמו במשחק הרגיל: צריך לפחות צבע אחד לכל מקום
    if (numColors < numSpots) {
        showMessage("settingsMessage", "מספר הצבעים חייב להיות גדול או שווה למספר המקומות!");
        return;
    }
    showMessage("settingsMessage", "");

    // מאפסים את כל המשתנים של המשחק נגד המחשב
    playerCode = createEmptyArray();
    computerAttempts = 0;
    computerPlaying = false;
    selectedColor = 0;

    // בונים את לוח הצבעים ואת הקוביות הריקות של הצירוף
    buildPalette("computerPalette");
    let cubesArea = document.getElementById("computerSecretCubes");
    cubesArea.innerHTML = "";
    for (let i = 0; i < numSpots; i++) {
        createPlayerCodeCube(cubesArea, i);
    }

    // מראים את החלק של בחירת הצירוף, ומסתירים את מה ששייך לניחושים
    document.getElementById("computerSetupPart").style.display = "block";
    document.getElementById("computerStartButton").style.display = "inline-block";
    document.getElementById("computerNextButton").style.display = "none";
    document.getElementById("computerBoard").innerHTML = "";
    document.getElementById("computerEndMessage").textContent = "";
    document.getElementById("computerEndMessage").className = "";
    showMessage("computerMessage", "");
    showMessage("computerInfo", "מספר מקומות: " + numSpots + " | מספר צבעים: " + numColors);

    showScreen("computerScreen");
}

// יוצרת קובייה אחת בצירוף של השחקן. index = המקום של הקובייה.
function createPlayerCodeCube(cubesArea, index) {
    let cube = document.createElement("div");
    cube.className = "cube";

    cube.addEventListener("click", function () {
        // אחרי שהמחשב התחיל לנחש אסור לשנות את הצירוף
        if (computerPlaying) {
            return;
        }
        if (selectedColor == 0) {
            showMessage("computerMessage", "קודם בחר צבע מהלוח");
            return;
        }
        // אם הצבע כבר נמצא בקובייה אחרת - קופצת הודעה והצבע לא מוכנס
        if (isColorUsedElsewhere(playerCode, selectedColor, index)) {
            alert("הצבע הזה כבר נמצא בצירוף! אסור להשתמש באותו צבע פעמיים.");
            return;
        }
        playerCode[index] = selectedColor;
        paintCube(cube, selectedColor);
        showMessage("computerMessage", "");
    });

    cubesArea.appendChild(cube);
}

// פועלת כשלוחצים על "אישור - שהמחשב יתחיל לנחש"
function computerStartClicked() {
    if (!isFull(playerCode)) {
        showMessage("computerMessage", "יש לצבוע את כל הקוביות");
        return;
    }
    if (hasDuplicates(playerCode)) {
        alert("אסור להשתמש באותו צבע פעמיים");
        return;
    }
    showMessage("computerMessage", "");

    // הצירוף תקין. מסתירים את לוח הצבעים ואת כפתור האישור.
    computerPlaying = true;
    document.getElementById("computerSetupPart").style.display = "none";
    document.getElementById("computerStartButton").style.display = "none";

    // שלב 1: בונים את המערך S עם כל הצירופים האפשריים
    possibleCodes = [];
    buildAllCodes([]);
    showMessage("computerInfo", "המחשב בנה רשימה של " + possibleCodes.length +
        " צירופים אפשריים. למחשב יש " + maxAttempts + " ניסיונות. לחץ על \"הניחוש הבא של המחשב\" כדי לראות אותו מנחש.");

    // שלב 2: הניחוש הראשון - הצבעים הראשונים לפי הסדר: 1, 2, 3 ...
    computerGuess = [];
    for (let i = 1; i <= numSpots; i++) {
        computerGuess.push(i);
    }

    document.getElementById("computerNextButton").style.display = "inline-block";
}


// ----- שלב 1: בניית המערך S -----

// בונה את כל הצירופים האפשריים (בלי צבעים כפולים) ושומרת אותם ב-possibleCodes.
// זו פונקציה רקורסיבית (פונקציה שקוראת לעצמה):
// current הוא הצירוף שנבנה עד עכשיו. בכל קריאה מוסיפים לו צבע אחד שעוד לא נמצא בו,
// וממשיכים לבנות את שאר המקומות. כשהצירוף מגיע לאורך numSpots - הוא מוכן ונשמר.
// לדוגמה עם 3 צבעים ו-2 מקומות נקבל: [1,2] [1,3] [2,1] [2,3] [3,1] [3,2]
function buildAllCodes(current) {
    // תנאי עצירה: הצירוף מלא - שומרים עותק שלו ב-S
    if (current.length == numSpots) {
        possibleCodes.push(copyArray(current));
        return;
    }

    // מנסים להוסיף כל צבע שעוד לא נמצא בצירוף
    for (let color = 1; color <= numColors; color++) {
        if (!isInArray(current, color)) {
            current.push(color);      // מוסיפים את הצבע
            buildAllCodes(current);   // בונים את שאר הצירוף
            current.pop();            // מוציאים את הצבע כדי לנסות את הצבע הבא
        }
    }
}


// ----- ניחוש אחד של המחשב (שלבים 2-7) -----

// פועלת כשלוחצים על "הניחוש הבא של המחשב"
function computerNextClicked() {
    computerAttempts = computerAttempts + 1;

    // המחשב מנחש את computerGuess.
    // המשוב מחושב לפי הצירוף של השחקן (כמו שחקן שבודק ניחוש ועונה).
    // המחשב עצמו לא "מציץ" בצירוף - הוא מקבל רק את מספר הבול ומספר הפגיעה.
    let bulls = countBulls(computerGuess, playerCode);
    let hits = countHits(computerGuess, playerCode);

    // מציגים שורה עם הניחוש והמשוב. info = הטקסט של בול ופגיעה בשורה הזו.
    let info = addComputerRow(computerGuess, bulls, hits);

    // אם כל המקומות בול - המחשב ניצח
    if (bulls == numSpots) {
        document.getElementById("computerNextButton").style.display = "none";
        let endMessage = document.getElementById("computerEndMessage");
        endMessage.className = "lose";
        endMessage.textContent = "המחשב פיצח את הצירוף שלך! מספר ניסיונות: " + computerAttempts;
        return;
    }

    // שלב 3: מוחקים מ-S את כל הצירופים שלא מתאימים למשוב
    removeImpossibleCodes(computerGuess, bulls, hits);

    // מוסיפים לטקסט של השורה כמה צירופים נשארו ב-S
    info.textContent = info.textContent + " | נשארו " + possibleCodes.length + " אפשרויות";

    // אם המחשב השתמש בכל הניסיונות (7) ולא הצליח - השחקן ניצח
    if (computerAttempts == maxAttempts) {
        document.getElementById("computerNextButton").style.display = "none";
        let endMessage = document.getElementById("computerEndMessage");
        endMessage.className = "win";
        endMessage.textContent = "ניצחת! המחשב לא הצליח לפצח את הצירוף שלך ב-" + maxAttempts + " ניסיונות.";
        return;
    }

    // שלבים 4-6: בוחרים את הניחוש הבא
    computerGuess = chooseBestCode();
}

// שלב 3: משאירה ב-S רק צירופים שהיו נותנים את אותו משוב לניחוש.
// לדוגמה: אם הניחוש קיבל 0 בול ו-0 פגיעה, כל צירוף שהיה נותן לניחוש
// הזה בול או פגיעה לא יכול להיות הצירוף הסודי, ולכן הוא נמחק.
function removeImpossibleCodes(guess, bulls, hits) {
    let newList = [];
    for (let i = 0; i < possibleCodes.length; i++) {
        let code = possibleCodes[i];
        // "אם code היה הצירוף הסודי, איזה משוב הניחוש היה מקבל?"
        if (countBulls(guess, code) == bulls && countHits(guess, code) == hits) {
            newList.push(code);   // אותו משוב - הצירוף עדיין אפשרי
        }
    }
    possibleCodes = newList;
}

// שלבים 4, 5 ו-6: בוחרת את הצירוף עם הניקוד הכי גבוה מתוך S
function chooseBestCode() {
    // שלב 4: סופרים כמה פעמים כל צבע מופיע בכל הצירופים שנשארו.
    // colorCount[3] = כמה פעמים צבע מספר 3 מופיע (המקום 0 לא בשימוש).
    let colorCount = [];
    for (let color = 0; color <= numColors; color++) {
        colorCount.push(0);
    }
    for (let i = 0; i < possibleCodes.length; i++) {
        for (let j = 0; j < numSpots; j++) {
            let color = possibleCodes[i][j];
            colorCount[color] = colorCount[color] + 1;
        }
    }

    // שלב 5: הניקוד של צירוף = סכום הספירות של הצבעים שבו.
    // ככה צירוף שבנוי מצבעים נפוצים מקבל ניקוד גבוה יותר.
    // שלב 6: שומרים את הצירוף עם הניקוד הכי גבוה.
    let bestScore = -1;
    let bestCode = possibleCodes[0];
    for (let i = 0; i < possibleCodes.length; i++) {
        let score = 0;
        for (let j = 0; j < numSpots; j++) {
            score = score + colorCount[possibleCodes[i][j]];
        }
        if (score > bestScore) {
            bestScore = score;
            bestCode = possibleCodes[i];
        }
    }
    return bestCode;
}

// מוסיפה ללוח של המחשב שורה עם הניחוש שלו, קוביות המשוב ומספר הבול והפגיעה.
// מחזירה את הטקסט של בול ופגיעה כדי שאפשר יהיה להוסיף לו עוד מידע.
function addComputerRow(guess, bulls, hits) {
    let row = document.createElement("div");
    row.className = "row";

    // הכותרת, למשל "ניחוש 2"
    let label = document.createElement("span");
    label.className = "rowLabel";
    label.textContent = "ניחוש " + computerAttempts;
    row.appendChild(label);

    // הקוביות של הניחוש (מספר הצבע מתורגם לצבע אמיתי ב-paintCube)
    let cubesArea = document.createElement("div");
    cubesArea.className = "cubes";
    for (let i = 0; i < guess.length; i++) {
        let cube = document.createElement("div");
        cube.className = "cube";
        paintCube(cube, guess[i]);
        cubesArea.appendChild(cube);
    }
    row.appendChild(cubesArea);

    // אזור המשוב - קוביות קטנות כמו במשחק הרגיל
    let feedbackArea = document.createElement("div");
    feedbackArea.className = "feedback";
    feedbackArea.textContent = "משוב:";
    for (let i = 0; i < guess.length; i++) {
        let fbCube = document.createElement("div");
        if (guess[i] == playerCode[i]) {
            fbCube.className = "fbCube fb-green";
        } else if (isInArray(playerCode, guess[i])) {
            fbCube.className = "fbCube fb-yellow";
        } else {
            fbCube.className = "fbCube fb-gray";
        }
        feedbackArea.appendChild(fbCube);
    }
    row.appendChild(feedbackArea);

    // הטקסט של בול ופגיעה
    let info = document.createElement("span");
    info.className = "rowInfo";
    info.textContent = "בול: " + bulls + " | פגיעה: " + hits;
    row.appendChild(info);

    document.getElementById("computerBoard").appendChild(row);
    return info;
}


// ----- חיבור הכפתורים של חלק 2 לפונקציות -----
// (הכפתור "שחק נגד מחשב" פותח קודם מסך בחירה - ראו חלק 4. משם "משחק רגיל" מגיע לכאן)
document.getElementById("normalComputerButton").addEventListener("click", computerButtonClicked);
document.getElementById("computerStartButton").addEventListener("click", computerStartClicked);
document.getElementById("computerNextButton").addEventListener("click", computerNextClicked);
document.getElementById("computerNewGameButton").addEventListener("click", newGameClicked);



// =====================================================================
// =====================================================================
// =====================================================================
//
//          חלק 4: בחירת סוג המשחק נגד המחשב + משחק "צירוף על דף"
//      השחקן רושם צירוף על דף, והמחשב לא יודע אותו בכלל.
//      אחרי כל ניחוש השחקן נותן למחשב משוב, והמחשב ממשיך לנחש לפיו.
//
// =====================================================================
// =====================================================================
// =====================================================================

// למה צריך את המשחק הזה?
// במשחק הרגיל נגד המחשב, השחקן בוחר צירוף על המסך, ולכן הצירוף נמצא בתוך הקוד.
// מישהו יכול לחשוד שהמחשב "מציץ" בו. כאן הצירוף רשום רק על דף,
// והמחשב יודע רק את מה שהשחקן אומר לו במשוב - וכך רואים שהוא באמת מנחש לבד.
//
// המחשב משתמש בדיוק באותה שיטה כמו בחלק 2, ובאותן פונקציות:
// buildAllCodes (בניית S), removeImpossibleCodes (מחיקת צירופים בלתי אפשריים)
// ו-chooseBestCode (בחירת הניחוש לפי הצבעים הנפוצים).


// ----- משתנים של משחק "צירוף על דף" -----
// (possibleCodes, computerGuess ו-computerAttempts הם משתנים מחלק 2, ומשתמשים בהם גם כאן)

let paperBullsSelect;        // רשימת הבחירה של מספר הבול בשורה הנוכחית
let paperHitsSelect;         // רשימת הבחירה של מספר הפגיעה בשורה הנוכחית
let paperGameOver = false;   // האם המשחק נגמר
let paperFixing = false;     // האם השחקן עכשיו מתקן תשובות (אחרי שהתשובות סתרו זו את זו)

// ההיסטוריה של המשחק - כל הניחושים של המחשב והתשובות של השחקן.
// paperGuesses[2] = הניחוש השלישי, paperBullsSelects[2] = רשימת הבול שלו, וכן הלאה.
// שומרים את רשימות הבחירה עצמן (ולא רק את המספרים), כדי שאפשר יהיה לתקן תשובה ישנה.
let paperGuesses = [];
let paperBullsSelects = [];
let paperHitsSelects = [];
let paperInfoText;           // הטקסט של בול/פגיעה בשורה הנוכחית (כדי להוסיף לו "נשארו X אפשרויות")
let paperRightButton;        // הכפתור "המחשב צדק!" של השורה הנוכחית


// ----- מסך בחירת סוג המשחק נגד המחשב -----

// פועלת כשלוחצים על "שחק נגד מחשב" במסך ההגדרות
function openComputerModes() {
    numSpots = Number(document.getElementById("spotsSelect").value);
    numColors = Number(document.getElementById("colorsSelect").value);

    // אותה בדיקה כמו בשאר המשחקים
    if (numColors < numSpots) {
        showMessage("settingsMessage", "מספר הצבעים חייב להיות גדול או שווה למספר המקומות!");
        return;
    }
    showMessage("settingsMessage", "");
    showScreen("computerModeScreen");
}


// ----- פתיחת משחק "צירוף על דף" -----

// פועלת כשלוחצים על "צירוף על דף - אני נותן משוב"
function paperModeClicked() {
    paperGameOver = false;
    paperFixing = false;
    computerAttempts = 0;
    paperGuesses = [];
    paperBullsSelects = [];
    paperHitsSelects = [];
    document.getElementById("paperSendButton").textContent = "שלח משוב";

    // ההסבר לשחקן: כמה צבעים לרשום ומאילו צבעים
    showMessage("paperInfo", "רשום על דף צירוף סודי של " + numSpots +
        " צבעים, מתוך הצבעים האלה, בלי לחזור על אותו צבע פעמיים. אל תראה אותו למחשב! " +
        "שים לב: מקום 1 הוא הימני ביותר (כמו שקוראים בעברית). למחשב יש " + maxAttempts + " ניסיונות.");

    // מציגים את הצבעים שבמשחק (רק להצגה - לא לוחצים עליהם)
    let colorsArea = document.getElementById("paperColors");
    colorsArea.innerHTML = "";
    for (let colorNumber = 1; colorNumber <= numColors; colorNumber++) {
        let item = document.createElement("div");
        item.className = "colorItem";

        let dot = document.createElement("div");
        dot.className = "colorDot";
        dot.style.backgroundColor = colorCodes[colorNumber - 1];
        item.appendChild(dot);

        let name = document.createElement("span");
        name.textContent = colorNames[colorNumber - 1];
        item.appendChild(name);

        colorsArea.appendChild(item);
    }

    // בהתחלה רואים רק את ההסבר ואת כפתור ההתחלה
    document.getElementById("paperIntroPart").style.display = "block";
    document.getElementById("paperHelp").style.display = "none";
    document.getElementById("paperSendButton").style.display = "none";
    document.getElementById("paperBoard").innerHTML = "";
    document.getElementById("paperEndMessage").textContent = "";
    document.getElementById("paperEndMessage").className = "";
    showMessage("paperMessage", "");

    showScreen("paperScreen");
}

// פועלת כשלוחצים על "רשמתי צירוף - שהמחשב יתחיל לנחש"
function paperStartClicked() {
    document.getElementById("paperIntroPart").style.display = "none";
    document.getElementById("paperHelp").style.display = "block";
    document.getElementById("paperSendButton").style.display = "inline-block";

    // שלב 1: בונים את המערך S עם כל הצירופים האפשריים (הפונקציה מחלק 2)
    possibleCodes = [];
    buildAllCodes([]);

    // שלב 2: הניחוש הראשון - הצבעים הראשונים לפי הסדר: 1, 2, 3 ...
    computerGuess = [];
    for (let i = 1; i <= numSpots; i++) {
        computerGuess.push(i);
    }
    showPaperGuess();
}


// ----- הצגת ניחוש של המחשב -----

// מוסיפה שורה עם הניחוש של המחשב ועם שתי רשימות בחירה למשוב: בול ופגיעה
function showPaperGuess() {
    computerAttempts = computerAttempts + 1;

    let row = document.createElement("div");
    row.className = "row";

    let label = document.createElement("span");
    label.className = "rowLabel";
    label.textContent = "ניחוש " + computerAttempts;
    row.appendChild(label);

    // הקוביות של הניחוש של המחשב
    let cubesArea = document.createElement("div");
    cubesArea.className = "cubes";
    for (let i = 0; i < numSpots; i++) {
        let cube = document.createElement("div");
        cube.className = "cube numbered";
        paintCube(cube, computerGuess[i]);
        cube.textContent = i + 1;     // מספר המקום - כדי שיהיה ברור שמקום 1 הוא הימני
        cubesArea.appendChild(cube);
    }
    row.appendChild(cubesArea);

    // אזור המשוב - השחקן בוחר מספרים: כמה בול וכמה פגיעה
    let feedbackArea = document.createElement("div");
    feedbackArea.className = "feedback";

    let bullsLabel = document.createElement("span");
    bullsLabel.textContent = "בול:";
    feedbackArea.appendChild(bullsLabel);
    paperBullsSelect = createNumberSelect(numSpots);
    feedbackArea.appendChild(paperBullsSelect);

    let hitsLabel = document.createElement("span");
    hitsLabel.textContent = "פגיעה:";
    feedbackArea.appendChild(hitsLabel);
    paperHitsSelect = createNumberSelect(numSpots);
    feedbackArea.appendChild(paperHitsSelect);

    // שומרים את הניחוש ואת רשימות הבחירה שלו בהיסטוריה
    paperGuesses.push(computerGuess);
    paperBullsSelects.push(paperBullsSelect);
    paperHitsSelects.push(paperHitsSelect);

    row.appendChild(feedbackArea);

    // מקום לטקסט "נשארו X אפשרויות" (יתמלא אחרי שליחת המשוב)
    paperInfoText = document.createElement("span");
    paperInfoText.className = "rowInfo";
    row.appendChild(paperInfoText);

    // כפתור קטן לאישור שהמחשב ניחש נכון (כדי לא לצבוע את כל הקוביות בירוק אחת אחת)
    paperRightButton = document.createElement("button");
    paperRightButton.className = "rightButton";
    paperRightButton.textContent = "✓ המחשב צדק!";
    paperRightButton.addEventListener("click", paperRightClicked);
    row.appendChild(paperRightButton);

    document.getElementById("paperBoard").appendChild(row);
}

// יוצרת רשימת בחירה (select) עם המספרים מ-0 ועד max
function createNumberSelect(max) {
    let select = document.createElement("select");
    for (let number = 0; number <= max; number++) {
        let option = document.createElement("option");
        option.value = number;
        option.textContent = number;
        select.appendChild(option);
    }
    return select;
}

// פועלת כשלוחצים על "המחשב צדק!" - המחשב ניחש את הצירוף
function paperRightClicked() {
    if (paperGameOver) {
        return;
    }

    // כל המקומות בול: בול = מספר המקומות, פגיעה = 0
    paperBullsSelect.value = numSpots;
    paperHitsSelect.value = 0;
    lockAllAnswers(true);
    paperRightButton.style.display = "none";
    showMessage("paperMessage", "");

    endPaperGame("המחשב ניחש את הצירוף שלך! מספר ניסיונות: " + computerAttempts, "lose");
}


// ----- קבלת המשוב מהשחקן -----

// פועלת כשלוחצים על "שלח משוב" (או "בדוק שוב" - אחרי תיקון תשובות)
function paperSendClicked() {
    if (paperGameOver) {
        return;
    }

    // בדיקה: בכל תשובה, בול + פגיעה לא יכולים להיות יותר ממספר המקומות
    for (let i = 0; i < paperGuesses.length; i++) {
        let bulls = Number(paperBullsSelects[i].value);
        let hits = Number(paperHitsSelects[i].value);
        if (bulls + hits > numSpots) {
            alert("בניחוש " + (i + 1) + ": בול + פגיעה לא יכולים להיות יותר מ-" + numSpots + ". בדוק את התשובה שוב.");
            return;
        }
    }

    // נועלים את כל התשובות ומסתירים את הכפתור "המחשב צדק!"
    lockAllAnswers(true);
    paperRightButton.style.display = "none";

    // אם בניחוש האחרון כל המקומות בול - המחשב ניחש את הצירוף!
    if (Number(paperBullsSelect.value) == numSpots) {
        showMessage("paperMessage", "");
        endPaperGame("המחשב ניחש את הצירוף שלך! מספר ניסיונות: " + computerAttempts, "lose");
        return;
    }

    // שלב 3: בונים את S מחדש ומוחקים ממנו כל צירוף שלא מתאים לאחת התשובות.
    // (בונים מחדש בכל פעם, כדי שאם השחקן תיקן תשובה ישנה - המחשב ישתמש בתשובה המתוקנת)
    applyAllAnswers(-1);
    paperInfoText.textContent = "נשארו " + possibleCodes.length + " אפשרויות";

    // לא נשאר אף צירוף - התשובות סותרות זו את זו, כלומר יש טעות באחת מהן.
    // לא מסיימים את המשחק: נותנים לשחקן לתקן את התשובות.
    if (possibleCodes.length == 0) {
        startFixing();
        return;
    }

    // הכל תקין - יוצאים ממצב תיקון (אם היינו בו)
    if (paperFixing) {
        paperFixing = false;
        document.getElementById("paperSendButton").textContent = "שלח משוב";
    }
    showMessage("paperMessage", "");

    // אם המחשב השתמש בכל הניסיונות (7) ולא הצליח - השחקן ניצח
    if (computerAttempts == maxAttempts) {
        endPaperGame("ניצחת! המחשב לא הצליח לנחש את הצירוף שלך ב-" + maxAttempts + " ניסיונות.", "win");
        return;
    }

    // שלבים 4-6: בוחרים את הניחוש הבא (הפונקציה מחלק 2) ומציגים אותו
    computerGuess = chooseBestCode();
    showPaperGuess();
}

// בונה את S מחדש, ומוחקת ממנו כל צירוף שלא מתאים לתשובות של השחקן.
// skip = מספר תשובה לדלג עליה (או -1 כדי להשתמש בכל התשובות).
// הדילוג משמש כדי לבדוק איזו תשובה כנראה שגויה.
function applyAllAnswers(skip) {
    possibleCodes = [];
    buildAllCodes([]);
    for (let i = 0; i < paperGuesses.length; i++) {
        if (i != skip) {
            let bulls = Number(paperBullsSelects[i].value);
            let hits = Number(paperHitsSelects[i].value);
            removeImpossibleCodes(paperGuesses[i], bulls, hits);
        }
    }
}

// נועלת (lock = true) או פותחת (lock = false) את כל רשימות הבחירה של התשובות
function lockAllAnswers(lock) {
    for (let i = 0; i < paperGuesses.length; i++) {
        paperBullsSelects[i].disabled = lock;
        paperHitsSelects[i].disabled = lock;
    }
}

// התשובות סותרות זו את זו - פותחים את כל התשובות לתיקון,
// ומחפשים אילו תשובות כנראה שגויות: תשובה שאם מתעלמים ממנה - כן נשאר צירוף אפשרי.
function startFixing() {
    paperFixing = true;

    let suspects = "";
    for (let i = 0; i < paperGuesses.length; i++) {
        applyAllAnswers(i);
        if (possibleCodes.length > 0) {
            if (suspects != "") {
                suspects = suspects + ", ";
            }
            suspects = suspects + (i + 1);
        }
    }

    let text = "אין אף צירוף שמתאים לכל התשובות שנתת, כלומר באחת התשובות יש טעות. ";
    if (suspects != "") {
        text = text + "בדוק במיוחד את התשובות לניחושים: " + suspects + ". ";
    }
    text = text + "תקן את התשובה השגויה ולחץ \"בדוק שוב\".";
    showMessage("paperMessage", text);

    lockAllAnswers(false);
    document.getElementById("paperSendButton").textContent = "בדוק שוב";
}

// מסיימת את המשחק ומציגה הודעה. className = "win" או "lose" (קובע את צבע ההודעה)
function endPaperGame(text, className) {
    paperGameOver = true;
    document.getElementById("paperSendButton").style.display = "none";
    let endMessage = document.getElementById("paperEndMessage");
    endMessage.className = className;
    endMessage.textContent = text;
}


// ----- חיבור הכפתורים של חלק 4 לפונקציות -----
document.getElementById("computerButton").addEventListener("click", openComputerModes);
document.getElementById("paperComputerButton").addEventListener("click", paperModeClicked);
document.getElementById("computerModeBackButton").addEventListener("click", newGameClicked);
document.getElementById("paperStartButton").addEventListener("click", paperStartClicked);
document.getElementById("paperSendButton").addEventListener("click", paperSendClicked);
document.getElementById("paperNewGameButton").addEventListener("click", newGameClicked);
