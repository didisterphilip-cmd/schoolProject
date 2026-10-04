// =====================================================
// בול פגיעה עם צבעים - יאיר טפר
// =====================================================

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
let maxAttempts = 7;       // מספר הניסיונות שיש לשחקן

let secret = [];           // הצירוף הסודי - מערך של מספרי צבעים
let secretPick = [];       // הצירוף ששחקן 2 בונה במסך הבחירה (לפני האישור)
let currentGuess = [];     // הניחוש הנוכחי - מערך של מספרי צבעים (0 = קובייה ריקה)

let attempt = 0;           // מספר הניסיון הנוכחי (1, 2, 3 ...)
let selectedColor = 0;     // הצבע שהשחקן בחר כרגע מהלוח (0 = עדיין לא נבחר צבע)
let gameOver = false;      // האם המשחק נגמר (ניצחון או הפסד)
let currentFeedbackArea;   // אזור המשוב של השורה הנוכחית (שם יוצגו קוביות המשוב)


// ----- פונקציות עזר -----

// מציגה את המסך שהשם שלו התקבל, ומסתירה את שאר המסכים
function showScreen(screenId) {
    document.getElementById("settingsScreen").style.display = "none";
    document.getElementById("setupScreen").style.display = "none";
    document.getElementById("gameScreen").style.display = "none";
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


// ----- מסך ההגדרות -----

// פועלת כשלוחצים על "התחל משחק"
function startButtonClicked() {
    // קוראים את הבחירות של השחקן. Number הופך את הטקסט מהרשימה למספר.
    numSpots = Number(document.getElementById("spotsSelect").value);
    numColors = Number(document.getElementById("colorsSelect").value);

    // צבעים לא יכולים לחזור על עצמם, לכן צריך לפחות צבע אחד לכל מקום
    if (numColors < numSpots) {
        showMessage("settingsMessage", "מספר הצבעים חייב להיות גדול או שווה למספר המקומות!");
        return;
    }
    showMessage("settingsMessage", "");

    // בודקים מי יוצר את הצירוף הסודי
    if (document.getElementById("modeRandom").checked) {
        secret = createRandomSecret();
        startGame();
    } else {
        openSetupScreen();
    }
}

// יוצרת צירוף סודי אקראי בלי צבעים כפולים.
// מגרילים מספר בין 1 ל-numColors, ומוסיפים אותו רק אם הוא עוד לא במערך.
// ממשיכים עד שהמערך מגיע לאורך הנכון.
function createRandomSecret() {
    let result = [];
    while (result.length < numSpots) {
        let colorNumber = Math.floor(Math.random() * numColors) + 1;
        if (!isInArray(result, colorNumber)) {
            result.push(colorNumber);
        }
    }
    return result;
}


// ----- מסך בחירת הצירוף על ידי שחקן 2 -----

// מכינה את המסך שבו שחקן 2 בוחר את הצירוף הסודי
function openSetupScreen() {
    secretPick = createEmptyArray();
    selectedColor = 0;
    buildPalette("setupPalette");

    // יוצרים קובייה ריקה לכל מקום בצירוף
    let cubesArea = document.getElementById("setupCubes");
    cubesArea.innerHTML = "";
    for (let i = 0; i < numSpots; i++) {
        createSetupCube(cubesArea, i);
    }

    showMessage("setupMessage", "");
    showScreen("setupScreen");
}

// יוצרת קובייה אחת במסך הבחירה. index = המקום של הקובייה בצירוף.
function createSetupCube(cubesArea, index) {
    let cube = document.createElement("div");
    cube.className = "cube";

    // לחיצה על הקובייה שמה בה את הצבע שנבחר מהלוח
    cube.addEventListener("click", function () {
        if (selectedColor == 0) {
            showMessage("setupMessage", "קודם בחר צבע מהלוח");
            return;
        }
        // אם הצבע כבר נמצא בקובייה אחרת - קופצת הודעה והצבע לא מוכנס
        if (isColorUsedElsewhere(secretPick, selectedColor, index)) {
            alert("הצבע הזה כבר נמצא בצירוף! אסור להשתמש באותו צבע פעמיים.");
            return;
        }
        secretPick[index] = selectedColor;
        paintCube(cube, selectedColor);
        showMessage("setupMessage", "");
    });

    cubesArea.appendChild(cube);
}

// פועלת כשלוחצים על "אישור והתחלת המשחק"
function confirmSecretClicked() {
    if (!isFull(secretPick)) {
        showMessage("setupMessage", "יש לצבוע את כל הקוביות");
        return;
    }
    if (hasDuplicates(secretPick)) {
        alert("אסור להשתמש באותו צבע פעמיים");
        return;
    }

    // הצירוף תקין - שומרים אותו כצירוף הסודי ומתחילים.
    // המעבר למסך המשחק מסתיר את הצירוף מהשחקן שמנחש.
    secret = secretPick;
    startGame();
}


// ----- המשחק -----

// מאפסת את כל המשתנים ומתחילה משחק חדש
function startGame() {
    attempt = 0;
    gameOver = false;
    selectedColor = 0;

    // מנקים את הלוח וההודעות ממשחק קודם
    document.getElementById("board").innerHTML = "";
    document.getElementById("secretReveal").innerHTML = "";
    document.getElementById("endMessage").textContent = "";
    document.getElementById("endMessage").className = "";
    showMessage("gameMessage", "");
    document.getElementById("guessButton").style.display = "inline-block";

    showMessage("gameInfo", "מספר מקומות: " + numSpots + " | מספר צבעים: " + numColors +
        " | מספר ניסיונות: " + maxAttempts);

    buildPalette("gamePalette");
    showScreen("gameScreen");
    addAttemptRow();
}

// מוסיפה ללוח שורה חדשה לניסיון הבא: קוביות ריקות + אזור משוב.
// השורות הקודמות נשארות על המסך.
function addAttemptRow() {
    attempt = attempt + 1;
    currentGuess = createEmptyArray();

    let row = document.createElement("div");
    row.className = "row";

    // הכותרת של השורה, למשל "ניסיון 3"
    let label = document.createElement("span");
    label.className = "rowLabel";
    label.textContent = "ניסיון " + attempt;
    row.appendChild(label);

    // הקוביות של הניחוש
    let cubesArea = document.createElement("div");
    cubesArea.className = "cubes";
    for (let i = 0; i < numSpots; i++) {
        createGuessCube(cubesArea, i, attempt);
    }
    row.appendChild(cubesArea);

    // אזור המשוב (בהתחלה רק הכיתוב "משוב:", הקוביות יתווספו אחרי הניחוש)
    let feedbackArea = document.createElement("div");
    feedbackArea.className = "feedback";
    feedbackArea.textContent = "משוב:";
    row.appendChild(feedbackArea);
    currentFeedbackArea = feedbackArea;

    document.getElementById("board").appendChild(row);
}

// יוצרת קובייה אחת בשורת ניחוש.
// index = המקום של הקובייה, rowNumber = מספר הניסיון שהשורה שייכת אליו.
function createGuessCube(cubesArea, index, rowNumber) {
    let cube = document.createElement("div");
    cube.className = "cube";

    cube.addEventListener("click", function () {
        // אפשר לשנות רק את השורה הנוכחית, ורק כשהמשחק עוד לא נגמר
        if (gameOver || rowNumber != attempt) {
            return;
        }
        if (selectedColor == 0) {
            showMessage("gameMessage", "קודם בחר צבע מהלוח");
            return;
        }
        // אם הצבע כבר נמצא בקובייה אחרת בשורה - קופצת הודעה והצבע לא מוכנס
        if (isColorUsedElsewhere(currentGuess, selectedColor, index)) {
            alert("הצבע הזה כבר נמצא בניחוש! אסור להשתמש באותו צבע פעמיים.");
            return;
        }
        currentGuess[index] = selectedColor;
        paintCube(cube, selectedColor);
        showMessage("gameMessage", "");
    });

    cubesArea.appendChild(cube);
}

// פועלת כשלוחצים על "נחש"
function guessButtonClicked() {
    if (gameOver) {
        return;
    }

    // בדיקה 1: כל הקוביות צריכות להיות מלאות
    if (!isFull(currentGuess)) {
        showMessage("gameMessage", "יש למלא את כל הקוביות לפני שמנחשים");
        return;
    }

    // בדיקה 2: אסור שאותו צבע יופיע פעמיים בניחוש
    if (hasDuplicates(currentGuess)) {
        alert("אסור להשתמש באותו צבע פעמיים בניחוש");
        return;
    }
    showMessage("gameMessage", "");

    // משווים את הניחוש לצירוף הסודי ומציגים את המשוב
    let feedback = getFeedback(currentGuess);
    showFeedback(feedback);

    // סופרים כמה קוביות ירוקות יש במשוב
    let greenCount = 0;
    for (let i = 0; i < feedback.length; i++) {
        if (feedback[i] == "green") {
            greenCount = greenCount + 1;
        }
    }

    if (greenCount == numSpots) {
        endGame(true);           // כל הקוביות ירוקות - ניצחון
    } else if (attempt == maxAttempts) {
        endGame(false);          // נגמרו הניסיונות - הפסד
    } else {
        addAttemptRow();         // ממשיכים לניסיון הבא
    }
}

// משווה ניחוש לצירוף הסודי ומחזירה מערך משוב באותו אורך.
// כל מקום במערך המשוב מתאים לאותו מקום בניחוש:
//   "green"  - הצבע נכון והמקום נכון
//   "yellow" - הצבע קיים בצירוף אבל במקום אחר
//   "gray"   - הצבע לא קיים בצירוף בכלל
function getFeedback(guess) {
    let feedback = [];
    for (let i = 0; i < numSpots; i++) {
        if (guess[i] == secret[i]) {
            feedback.push("green");
        } else if (isInArray(secret, guess[i])) {
            feedback.push("yellow");
        } else {
            feedback.push("gray");
        }
    }
    return feedback;
}

// מציגה את קוביות המשוב (הקטנות) באזור המשוב של השורה הנוכחית
function showFeedback(feedback) {
    for (let i = 0; i < feedback.length; i++) {
        let fbCube = document.createElement("div");
        // לדוגמה "fbCube fb-green" - הצבע נקבע לפי ה-CSS
        fbCube.className = "fbCube fb-" + feedback[i];
        currentFeedbackArea.appendChild(fbCube);
    }
}

// מסיימת את המשחק. won = true אם השחקן ניצח, false אם הפסיד.
function endGame(won) {
    gameOver = true;
    document.getElementById("guessButton").style.display = "none";

    let endMessage = document.getElementById("endMessage");

    if (won) {
        endMessage.className = "win";
        endMessage.textContent = "כל הכבוד! פיצחת את הצירוף! מספר ניסיונות: " + attempt;
    } else {
        endMessage.className = "lose";
        endMessage.textContent = "לא נורא, נגמרו הניסיונות. זה היה הצירוף הסודי:";

        // חושפים את הצירוף הסודי: קובייה צבועה לכל מספר במערך
        let revealArea = document.getElementById("secretReveal");
        for (let i = 0; i < secret.length; i++) {
            let cube = document.createElement("div");
            cube.className = "cube";
            paintCube(cube, secret[i]);
            revealArea.appendChild(cube);
        }
    }
}

// פועלת כשלוחצים על "משחק חדש" - חוזרים למסך ההגדרות
function newGameClicked() {
    showScreen("settingsScreen");
}


// ----- חיבור הכפתורים לפונקציות -----
document.getElementById("startButton").addEventListener("click", startButtonClicked);
document.getElementById("confirmSecretButton").addEventListener("click", confirmSecretClicked);
document.getElementById("guessButton").addEventListener("click", guessButtonClicked);
document.getElementById("newGameButton").addEventListener("click", newGameClicked);
