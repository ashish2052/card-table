# Marriage (Nepali 3-deck rummy), multiplayer

Start: `npm install` (once) then `npm start`. Opens on http://localhost:8850 and the LAN address it prints (phones on the same Wi-Fi; allow Node through Windows Firewall if asked). `PORT=xxxx` changes the port.
Tests: `npm test` (42 rules checks). Full-round browser test: `MARRIAGE_TEST=1 PORT=8850 node server.js`, then `python test/playtest.py` (Playwright, msedge, 3 tabs; writes shots/).

Rules: pagat.com/rummy/marriage.html. 3 decks + 6 printed jokers ("man"), 21 cards, 7 melds of 3 + 1 discard. Show 3 tunnelas/pure runs to see the tiplu. Dublee win = 7 pairs (room option: 8 as on pagat, where 7 only unlocks the maal).
House values (pagat has none): alter 5, man 2. Unseen players score 0 maal.

Known gaps: Murder/Kidnap variants shown disabled (not built); no opening-tunnela exposure at the deal; a wrong declaration is refused, no penalty; offline player's turn is auto-played after 20 s (draw stock, throw it back); stock refill reshuffles discards; not deployed.
