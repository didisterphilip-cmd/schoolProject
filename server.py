# =====================================================
# בול פגיעה - יאיר טפר
# שרת למשחק ברשת: שני שחקנים משחקים משני מחשבים שונים
# =====================================================
#
# איך זה עובד:
# - השרת מחכה שני שחקנים שיתחברו אליו דרך WebSocket.
# - השחקן הראשון שמתחבר הוא "יוצר הצירוף", והשחקן השני הוא "המנחש".
# - יוצר הצירוף שולח לשרת את הצירוף הסודי. השרת שומר אותו אצלו
#   ולא שולח אותו למנחש (כדי שהמנחש לא יוכל לרמות).
# - המנחש שולח לשרת ניחוש, השרת בודק אותו ושולח את המשוב לשני השחקנים.
#
# כל ההודעות בין השרת לדפדפן הן טקסט בפורמט JSON, למשל:
#   {"type": "guess", "guess": [1, 2, 3, 4]}
#
# התקנה (פעם אחת):   pip install websockets
# הפעלה:              python server.py

import asyncio      # ספרייה שמאפשרת לשרת לטפל בכמה שחקנים באותו זמן
import json         # הופכת טקסט JSON למילון (dict) של פייתון ובחזרה
import websockets   # הספרייה של WebSocket

PORT = 8765          # מספר הפורט שהשרת מאזין לו (צריך להיות זהה לזה שבקובץ script.js)
MAX_ATTEMPTS = 7     # מספר הניסיונות של המנחש

# ----- משתנים של המשחק -----
players = []    # רשימת השחקנים המחוברים. players[0] = יוצר הצירוף, players[1] = המנחש
secret = []     # הצירוף הסודי - רשימה של מספרי צבעים
spots = 0       # מספר המקומות בצירוף
colors = 0      # מספר הצבעים במשחק
attempt = 0     # מספר הניסיון הנוכחי של המנחש


def get_feedback(guess):
    """משווה ניחוש לצירוף הסודי ומחזירה רשימת משוב באותו אורך:
    "green" = צבע נכון במקום הנכון
    "yellow" = הצבע קיים בצירוף אבל במקום אחר
    "gray" = הצבע לא קיים בצירוף"""
    feedback = []
    for i in range(len(guess)):
        if guess[i] == secret[i]:
            feedback.append("green")
        elif guess[i] in secret:
            feedback.append("yellow")
        else:
            feedback.append("gray")
    return feedback


async def send(player, message):
    """שולחת הודעה (מילון) לשחקן אחד, אחרי שהופכת אותה לטקסט JSON"""
    await player.send(json.dumps(message))


async def send_to_all(message):
    """שולחת הודעה לכל השחקנים המחוברים"""
    for player in players:
        await send(player, message)


async def handler(websocket):
    """הפונקציה הזו רצה בנפרד לכל שחקן שמתחבר, כל עוד הוא מחובר"""
    global secret, spots, colors, attempt

    # אם כבר יש שני שחקנים - אין מקום לשחקן נוסף
    if len(players) >= 2:
        await send(websocket, {"type": "full"})
        return

    # מוסיפים את השחקן לרשימה ואומרים לו מה התפקיד שלו
    players.append(websocket)
    if len(players) == 1:
        print("שחקן 1 (יוצר הצירוף) התחבר")
        await send(websocket, {"type": "role", "role": "creator"})
    else:
        print("שחקן 2 (המנחש) התחבר")
        await send(websocket, {"type": "role", "role": "guesser"})
        await send(players[0], {"type": "partner"})
        # אם יוצר הצירוף כבר שלח צירוף - המנחש יכול להתחיל מיד
        if len(secret) > 0:
            await send(websocket, {"type": "start", "spots": spots, "colors": colors})

    try:
        # הלולאה מקבלת כל הודעה שהשחקן הזה שולח
        async for text in websocket:
            message = json.loads(text)

            # יוצר הצירוף שלח את הצירוף הסודי
            if message["type"] == "secret" and websocket == players[0]:
                secret = message["secret"]
                spots = message["spots"]
                colors = message["colors"]
                attempt = 0
                print("התקבל צירוף סודי:", secret)
                # אם המנחש כבר מחובר - אומרים לו להתחיל
                if len(players) == 2:
                    await send(players[1], {"type": "start", "spots": spots, "colors": colors})

            # המנחש שלח ניחוש
            elif message["type"] == "guess" and len(players) == 2 and websocket == players[1]:
                guess = message["guess"]
                attempt = attempt + 1
                feedback = get_feedback(guess)
                print("ניסיון", attempt, ":", guess, "->", feedback)

                # שולחים את הניחוש והמשוב לשני השחקנים
                await send_to_all({"type": "feedback", "guess": guess,
                                   "feedback": feedback, "attempt": attempt})

                # בודקים אם המשחק נגמר
                if feedback.count("green") == spots:
                    await send_to_all({"type": "end", "won": True,
                                       "attempt": attempt, "secret": secret})
                elif attempt == MAX_ATTEMPTS:
                    await send_to_all({"type": "end", "won": False,
                                       "attempt": attempt, "secret": secret})
    finally:
        # השחקן התנתק (סגר את הדף, המשחק נגמר וכו')
        print("שחקן התנתק")
        players.remove(websocket)
        secret = []
        attempt = 0
        # מודיעים לשחקן השני (אם נשאר) שהמשחק הופסק
        for player in players:
            try:
                await send(player, {"type": "left"})
            except websockets.ConnectionClosed:
                pass


async def main():
    """מפעילה את השרת על כל כתובות המחשב (0.0.0.0) ומחכה לנצח"""
    async with websockets.serve(handler, "0.0.0.0", PORT):
        print("השרת פועל על פורט", PORT)
        await asyncio.Future()   # מחכה לנצח, כדי שהשרת לא ייסגר


asyncio.run(main())
