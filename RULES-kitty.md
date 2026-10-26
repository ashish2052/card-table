# Kitty / Kitti (Nepal nine-card game) - rules as built

Researched 24 Oct 2026. Kitty has no pagat.com page (pagat 404 for brag/teen patti URLs tried; Wikipedia has no Kitti article), so the sources are the Play Store descriptions of the Nepali/Indian Kitti apps, with Wikipedia's Teen Patti and Three-card brag articles for the ranking questions. Nobody could be asked live; no Nepali YouTube transcript was reachable from the build machine. That is a known gap.

## Sources
1. Upveda Technology, "Kitti Lite" (Nepal-made) - https://play.google.com/store/apps/details?id=com.upvedakittigame : 9 cards each, 3 three-card "brags", ranking with optional 2-3-5 on top, four of a kind wins at once, win 2 consecutive hands = pot, win all 3 = "Salaami (in Nepal)", otherwise the pot carries over.
2. Dynamite Games, "Nine Card Brag - Kitti" - https://play.google.com/store/apps/details?id=com.dinamitegamesltd.ninecards : 2-5 players, standard 52 cards, dealer changes each round, "highest-ranking set must be played first", players reveal set 1, then 2, then 3, starting with the player who won the previous hand; 2 consecutive hands win the pot, all 3 win the pot plus every player's stake.
3. PixelLab, "Kitti - 9 Card Game" - https://play.google.com/store/apps/details?id=com.pixellab.ninecards.kitti : "popular in India, Bangladesh, Nepal ... also called kitty or 9 patti"; ranking Trail > Pure sequence > Sequence > Colour > Pair > High card; A high.
4. Wikipedia Teen Patti (https://en.wikipedia.org/wiki/Teen_patti) for the sequence order "A-K-Q, A-2-3, K-Q-J ... 4-3-2", K-A-2 not valid. Wikipedia Three-card brag (https://en.wikipedia.org/wiki/Three-card_brag) agrees a straight beats a flush and calls A-2-3 the top straight flush.
Also read: Call Kitti (com.Sanjeeb.CallKitti, com.bnr.callkitty.android) - a 13-card, 4-hand bidding spin-off. Not the game asked for; not built.

## Rules built (2-5 players, one 52-card deck, no jokers)
- Deal 9 cards each. Everyone arranges them into three hands of 3. Hand 1 must be the strongest, hand 3 the weakest (source 2). Ready is refused if the rows are out of order.
- Ranking, high to low: Trail (three of a kind) > Pure sequence > Sequence > Colour > Pair > High card. Ace is high. Sequence order A-K-Q (top), A-2-3 (second), K-Q-J ... 4-3-2. K-A-2 is not a sequence.
- Same category: trail by rank; sequence by that order; colour and high card compare highest card, then second, then third; pair compares the pair then the kicker.
- Showdown: hand 1s are compared, then hand 2s, then hand 3s. The player who won the previous hand reveals first (the player left of the dealer for hand 1).
- Who wins the round: a player who wins two consecutive hands (1+2 or 2+3) wins the pot. All three hands is "Salaami" - the pot plus one extra stake from every other player. If nobody wins two in a row the pot carries over to the next round.
- Four of a kind in the nine cards wins the round at once (highest four wins). Room option, default on.
- Stake: no money. Each player antes 1 point per round into the pot; the sheet tracks points, which can go negative.

## Where sources disagree / what is a room option
| Question | Choice | Alternative (option) |
|---|---|---|
| A-2-3 | second-highest sequence (Teen Patti, source 4) | `A-2-3 is the lowest sequence` option |
| 2-3-5 of different suits | off (only source 1 lists it, as a switchable setting) | `2-3-5 beats a trail` option |
| Four of a kind wins at once | on (sources 1 and 2) | option off |
| Exact tie between two hands | the player who reveals first wins (no source; house rule) | none |

## Not built (from the sources, small effect)
- "Four pairs = save game / redeal" (source 1), fold/pack before the show (sources 1, 2), seen/unseen blind play (not in any source; the brief mentions it, but it is Teen Patti and not part of Kitti as the apps describe it), real-money stakes.
